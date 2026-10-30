// Grava no banco os imóveis da Loft já juntados (`juntar`), sem duplicar nada e sem
// desfazer o que a equipe editou no painel. Rodar de novo é seguro: a tabela
// `importacao_loft` guarda, por referência, o que veio da Loft na última vez
// (snapshot dos campos, URLs e ids das fotos).
//
// - Referência nova: cria o imóvel (código da sequence), as fotos e a linha de controle.
// - Referência conhecida: cada campo só muda se o valor no banco ainda é o do snapshot
//   (ninguém mexeu). Os outros ficam como a equipe deixou e vão para `camposPreservados`.
//   As fotos contam como um campo: se a lista (ordem) mudou no painel, não são tocadas.
// - Excluído no painel (`imovelId` nulo): não volta.
// - Sumiu da rodada: se foi importado como publicado e ainda é igual ao snapshot, vira
//   indisponível; rascunho que sumiu não muda (`ausentesRascunho`), para não ganhar página pública.
// - Primeira rodada: os 3 imóveis de exemplo saem, com as fotos deles (pelas chaves).
// - Oportunidade: só é escolhida sozinha na primeira rodada ou quando a atual era um imóvel importado que
//   saiu do ar nesta rodada (o publicado completo à venda de maior valor, com foto). Nas demais, fica como está.
// - Feed truncado: se menos de 80% dos importados como publicados aparecem na rodada, aborta antes de gravar
//   (a menos que `forcar`).
//
// Apagar só alvos identificados: imóveis pelo id, fotos pelos ids (e só as sem vínculo).
import { and, asc, desc, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import { assinaturaConfere, type ArmazenamentoFotos } from "../../src/lib/armazenamento";
import type { Db } from "../../src/lib/dados/criar-conexao";
import { fotos as tabFotos, imovelFotos, imoveis, importacaoLoft } from "../../src/lib/dados/esquema";
import { carregarImovel } from "../../src/lib/dados/consultas";
import { completo } from "../../src/lib/imoveis/catalogo";
import { configuracao, descartarFotos, gravarConfiguracao, proximoCodigo } from "../../src/lib/painel/imoveis";
import { LIMITES, TIPOS_FOTO, validarImovel, type EntradaImovel } from "../../src/lib/painel/regras";
import { EXEMPLOS, sementeImoveis } from "../semente-imoveis";
import type { ImovelLoft } from "./mapear";

export type BaixarFoto = (url: string) => Promise<{ bytes: Uint8Array; tipo: string }>;
export type LerDimensoes = (bytes: Uint8Array) => Promise<{ largura: number; altura: number }>;

export type Relatorio = {
  criados: string[];
  atualizados: string[];
  camposPreservados: { referencia: string; campos: string[] }[];
  indisponibilizados: string[];
  /** Saíram da rodada, mas foram importados como rascunho: ficam como estão. */
  ausentesRascunho: string[];
  excluidosNoPainel: string[];
  fotosBaixadas: number;
  fotosFalhas: { referencia: string; url: string; erro: string }[];
  avisos: { referencia: string; aviso: string }[];
  exemplosRemovidos: string[];
  oportunidade: string | null;
};

export type Progresso = {
  /** 1 a `total`, na ordem da lista (referências repetidas contam uma vez). */
  n: number;
  total: number;
  referencia: string;
  acao: "criado" | "atualizado" | "preservado" | "sem mudança" | "excluído" | "ignorado";
  /** Código do imóvel (CZ1011), quando existe. */
  codigo?: string;
  /** Fotos que ficaram ligadas / fotos esperadas; ausente quando as fotos não foram tocadas. */
  fotos?: { ok: number; total: number };
};

export type OpcoesLoft = {
  /** Responsável dos imóveis criados (e autor das alterações da importação). */
  responsavelId: string;
  armazenamento: ArmazenamentoFotos;
  baixar: BaixarFoto;
  dimensoes: LerDimensoes;
  agora?: Date;
  /** Downloads simultâneos (padrão 4). */
  concorrencia?: number;
  /** Chamado a cada imóvel processado (nunca receba endereço aqui: só referência e código). */
  aoProgredir?: (p: Progresso) => void;
  /** Chamado a cada `intervaloParcial` imóveis com o relatório até ali (padrão 25). */
  aoGravarParcial?: (r: Relatorio) => void | Promise<void>;
  intervaloParcial?: number;
  /** Segue mesmo com o feed parecendo truncado. */
  forcar?: boolean;
  /** Limite de cada envio de foto ao armazenamento (padrão 60 s). */
  tempoEnvioMs?: number;
};

/** Campos do snapshot: exatamente as chaves de `ImovelLoft` que viram colunas de `imoveis`. */
type Campo = Exclude<keyof ImovelLoft, "referencia" | "fotos" | "avisos">;
const TODOS_OS_CAMPOS: Record<Campo, true> = {
  situacao: true, finalidade: true, tipo: true, titulo: true, descricao: true, bairro: true, cidade: true, uf: true,
  valor: true, valorLocacao: true, area: true, areaTotal: true, quartos: true, suites: true, banheiros: true, vagas: true,
  andar: true, anoConstrucao: true, condominio: true, iptu: true, caracteristicas: true, empreendimento: true,
  endereco: true, numero: true, complemento: true, cep: true,
};
const CAMPOS = Object.keys(TODOS_OS_CAMPOS) as Campo[];

type LinhaImovel = typeof imoveis.$inferSelect;
type Valores = { [K in Campo]: LinhaImovel[K] };

/** Valor de coluna vazia (o padrão: `null`, `""` ou lista vazia). */
const vazio = (v: unknown) => v === null || v === "" || (Array.isArray(v) && v.length === 0);

/** Igualdade exata no formato das colunas (arrays na ordem; `null` ≠ `""`). */
const igual = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

/**
 * Valores no formato que o painel grava (passam por `validarImovel`, como num "Salvar"
 * sem mudanças). Assim, salvar o imóvel no painel sem mexer num campo não o marca como editado.
 */
function normalizar(i: ImovelLoft): { valores: Valores; avisos: string[] } {
  const n = (v: number | null) => (v == null ? "" : String(Math.round(v)));
  const e: EntradaImovel = {
    finalidade: i.finalidade ?? "", lancamento: false, tipo: i.tipo ?? "", titulo: i.titulo, bairro: i.bairro, cidade: i.cidade, uf: i.uf,
    valor: n(i.valor), area: n(i.area), quartos: n(i.quartos), vagas: n(i.vagas), banheiros: n(i.banheiros), suites: n(i.suites),
    areaTotal: n(i.areaTotal), condominio: n(i.condominio), iptu: n(i.iptu), valorLocacao: n(i.valorLocacao), andar: n(i.andar),
    anoConstrucao: n(i.anoConstrucao), empreendimento: i.empreendimento ?? "", endereco: i.endereco ?? "", numero: i.numero ?? "",
    complemento: i.complemento ?? "", cep: i.cep ?? "", caracteristicas: i.caracteristicas, descricao: i.descricao, fotos: [], situacao: i.situacao,
  };
  const { erros, dados } = validarImovel(e, "rascunho");
  // Lançamento não vem da Loft: a importação nunca mexe nele.
  const { lancamento, ...colunas } = dados;
  void lancamento;
  return { valores: { ...colunas, situacao: i.situacao }, avisos: Object.entries(erros).map(([campo, msg]) => `Campo ${campo}: ${msg}`) };
}

const EXTENSAO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };
const prefixoChave = (referencia: string, url: string) => `fotos/loft-${createHash("sha1").update(referencia + url).digest("hex")}`;
const chavesPossiveis = (referencia: string, url: string) => TIPOS_FOTO.map((t) => `${prefixoChave(referencia, url)}.${EXTENSAO[t]}`);
const altGerado = (v: Pick<Valores, "tipo" | "bairro">, k: number, total: number) =>
  `${v.tipo ?? "Imóvel"}${v.bairro ? ` no ${v.bairro}` : ""} — foto ${k + 1} de ${total}`;

/** Roda `f` sobre os itens com no máximo `n` ao mesmo tempo, mantendo a ordem do resultado. */
async function emLotes<T, R>(itens: T[], n: number, f: (t: T) => Promise<R>): Promise<R[]> {
  const saida = new Array<R>(itens.length);
  let proximo = 0;
  const trabalhador = async () => {
    while (proximo < itens.length) {
      const k = proximo++;
      saida[k] = await f(itens[k]);
    }
  };
  await Promise.all(Array.from({ length: Math.max(1, Math.min(n, itens.length)) }, trabalhador));
  return saida;
}

/** Falha se `p` não resolver no prazo; a foto vai para `fotosFalhas` e é retentada na próxima rodada. */
async function comTempo<T>(p: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const prazo = new Promise<never>((_, rejeitar) => {
    timer = setTimeout(() => rejeitar(new Error(`Envio da foto passou de ${Math.round(ms / 1000)} s.`)), ms);
  });
  try {
    return await Promise.race([p, prazo]);
  } finally {
    clearTimeout(timer);
  }
}

async function idsDasFotos(db: Db, imovelId: string): Promise<string[]> {
  const l = await db.select({ id: imovelFotos.fotoId }).from(imovelFotos).where(eq(imovelFotos.imovelId, imovelId)).orderBy(asc(imovelFotos.ordem));
  return l.map((f) => f.id);
}

/**
 * Garante uma linha em `fotos` (confirmada) para cada URL: reaproveita a da chave estável,
 * se já existe; senão baixa, valida e envia. Devolve o id por URL (`null` = falhou, vai para o relatório).
 * Roda antes da transação do imóvel; uma foto enviada e não ligada fica para o `fotos:limpar`.
 */
async function obterFotos(db: Db, o: OpcoesLoft, referencia: string, imovelId: string | null, urls: string[], r: Relatorio): Promise<(string | null)[]> {
  const todasAsChaves = urls.flatMap((u) => chavesPossiveis(referencia, u));
  const existentes = todasAsChaves.length
    ? await db
        .select({ id: tabFotos.id, chave: tabFotos.chave, ligadaA: imovelFotos.imovelId })
        .from(tabFotos)
        .leftJoin(imovelFotos, eq(imovelFotos.fotoId, tabFotos.id))
        .where(inArray(tabFotos.chave, todasAsChaves))
    : [];
  const porChave = new Map(existentes.map((f) => [f.chave, f]));
  const falhou = (url: string, erro: string) => {
    r.fotosFalhas.push({ referencia, url, erro });
    return null;
  };

  return emLotes(urls, o.concorrencia ?? 4, async (url) => {
    const ja = chavesPossiveis(referencia, url).map((k) => porChave.get(k)).find(Boolean);
    if (ja) {
      if (ja.ligadaA && ja.ligadaA !== imovelId) return falhou(url, `A foto já está no imóvel ${ja.ligadaA}.`);
      return ja.id;
    }
    try {
      const { bytes } = await o.baixar(url);
      // O tipo vem dos bytes (assinatura), não do que o servidor declara.
      const tipo = TIPOS_FOTO.find((t) => assinaturaConfere(bytes.slice(0, 16), t));
      if (!tipo) return falhou(url, "Tipo de arquivo não aceito (só JPEG, PNG ou WebP).");
      if (bytes.byteLength > LIMITES.fotoMB * 1024 * 1024) return falhou(url, `Foto maior que ${LIMITES.fotoMB} MB.`);
      const { largura, altura } = await o.dimensoes(bytes);
      if (!(Number.isInteger(largura) && Number.isInteger(altura) && largura > 0 && altura > 0 && largura <= 20000 && altura <= 20000)) {
        return falhou(url, `Dimensões inválidas (${largura}×${altura}).`);
      }
      const chave = `${prefixoChave(referencia, url)}.${EXTENSAO[tipo]}`;
      await comTempo(o.armazenamento.enviar(chave, bytes, tipo), o.tempoEnvioMs ?? 60_000);
      await db
        .insert(tabFotos)
        .values({ chave, tipo, tamanho: bytes.byteLength, largura, altura, enviadoPorId: o.responsavelId, confirmada: true })
        .onConflictDoNothing({ target: tabFotos.chave });
      const [linha] = await db.select({ id: tabFotos.id }).from(tabFotos).where(eq(tabFotos.chave, chave)).limit(1);
      r.fotosBaixadas++;
      return linha.id;
    } catch (e) {
      return falhou(url, e instanceof Error ? e.message : String(e));
    }
  });
}

/** Troca as fotos do imóvel pela lista `ids`. As que continuam guardam o texto alternativo atual. */
async function ligarFotos(tx: Db, imovelId: string, ids: string[], v: Pick<Valores, "tipo" | "bairro">): Promise<void> {
  const atuais = await tx.select({ id: imovelFotos.fotoId, alt: imovelFotos.alt }).from(imovelFotos).where(eq(imovelFotos.imovelId, imovelId));
  const altDe = new Map(atuais.map((f) => [f.id, f.alt]));
  await tx.delete(imovelFotos).where(eq(imovelFotos.imovelId, imovelId));
  if (ids.length) {
    await tx.insert(imovelFotos).values(ids.map((fotoId, ordem) => ({ imovelId, fotoId, ordem, alt: altDe.get(fotoId) ?? altGerado(v, ordem, ids.length) })));
  }
}

/** Exemplos de `deploy.sh exemplos`: só os que ainda são exatamente aqueles (mesmo id, sem referência, data da semente). */
async function removerExemplos(db: Db, o: OpcoesLoft, r: Relatorio): Promise<void> {
  const semente = new Map(sementeImoveis().map((s) => [s.id, s]));
  for (const id of EXEMPLOS) {
    const [linha] = await db.select().from(imoveis).where(eq(imoveis.id, id)).limit(1);
    const s = semente.get(id);
    if (!linha || !s || linha.referenciaLoft !== null || linha.criadoEm.getTime() !== s.criadoEm.getTime()) continue;
    const [controlado] = await db.select().from(importacaoLoft).where(eq(importacaoLoft.imovelId, id)).limit(1);
    if (controlado) continue;
    const fotoIds = await idsDasFotos(db, id);
    // `imovel_fotos` sai em cascata; a Oportunidade (FK set null) é reatribuída no fim.
    await db.delete(imoveis).where(eq(imoveis.id, id));
    await descartarFotos(db, fotoIds, o.armazenamento);
    r.exemplosRemovidos.push(id);
  }
}

export async function importarLoft(db: Db, lista: ImovelLoft[], o: OpcoesLoft): Promise<Relatorio> {
  // Uma lista vazia (feed que não baixou, planilha errada) tornaria tudo indisponível.
  if (!lista.length) throw new Error("Lista de imóveis vazia: nada foi alterado.");
  const agora = o.agora ?? new Date();
  const r: Relatorio = {
    criados: [], atualizados: [], camposPreservados: [], indisponibilizados: [], ausentesRascunho: [], excluidosNoPainel: [],
    fotosBaixadas: 0, fotosFalhas: [], avisos: [], exemplosRemovidos: [], oportunidade: null,
  };
  const aviso = (referencia: string, texto: string) => r.avisos.push({ referencia, aviso: texto });

  const controle = new Map((await db.select().from(importacaoLoft)).map((c) => [c.referencia, c]));

  // Proteção contra feed truncado: antes de gravar qualquer coisa.
  if (!o.forcar) {
    const refsDaRodada = new Set(lista.map((i) => i.referencia));
    const publicados = [...controle.values()].filter((c) => c.imovelId && (c.valores as Partial<Valores>).situacao === "publicado");
    const presentes = publicados.filter((c) => refsDaRodada.has(c.referencia)).length;
    if (publicados.length > 0 && presentes < publicados.length * 0.8) {
      throw new Error(
        `Feed parece incompleto: só ${presentes} dos ${publicados.length} imóveis importados como publicados aparecem nesta rodada. Nada foi alterado. Se for isso mesmo, rode com --forcar.`,
      );
    }
  }

  const primeiraRodada = controle.size === 0;
  if (primeiraRodada) await removerExemplos(db, o, r);

  const vistos = new Set<string>();
  const total = new Set(lista.map((i) => i.referencia)).size;
  const intervalo = o.intervaloParcial ?? 25;
  let n = 0;
  const progresso = async (referencia: string, acao: Progresso["acao"], codigo?: string, fotos?: Progresso["fotos"]) => {
    n++;
    o.aoProgredir?.({ n, total, referencia, acao, ...(codigo ? { codigo } : {}), ...(fotos ? { fotos } : {}) });
    if (o.aoGravarParcial && n % intervalo === 0) await o.aoGravarParcial(r);
  };

  for (const i of lista) {
    const ref = i.referencia;
    if (vistos.has(ref)) continue;
    vistos.add(ref);
    const c = controle.get(ref);
    if (c && c.imovelId === null) {
      r.excluidosNoPainel.push(ref);
      await progresso(ref, "excluído");
      continue;
    }
    for (const a of i.avisos) aviso(ref, a);
    const { valores, avisos } = normalizar(i);
    for (const a of avisos) aviso(ref, a);
    if (!c) {
      const [dono] = await db.select({ id: imoveis.id }).from(imoveis).where(eq(imoveis.referenciaLoft, ref)).limit(1);
      if (dono) {
        aviso(ref, `O imóvel ${dono.id} já tem esta referência, sem registro da importação: ignorado.`);
        await progresso(ref, "ignorado");
        continue;
      }
    }

    const unicas = [...new Set(i.fotos)];
    if (unicas.length > LIMITES.fotos) aviso(ref, `${unicas.length} fotos no feed: só as ${LIMITES.fotos} primeiras entram.`);
    const urls = unicas.slice(0, LIMITES.fotos);

    // Fotos: baixadas antes da transação, e só se a lista do imóvel ainda é a da última importação.
    const fotosIntactas = !c || igual(await idsDasFotos(db, c.imovelId!), c.fotoIds);
    const obtidas = fotosIntactas ? await obterFotos(db, o, ref, c?.imovelId ?? null, urls, r) : null;
    const novosIds = obtidas?.filter((id): id is string => id !== null) ?? null;

    const fotosInfo = obtidas ? { ok: novosIds!.length, total: urls.length } : undefined;

    if (!c) {
      let codigoNovo = "";
      await db.transaction(async (tx) => {
        const codigo = await proximoCodigo(tx);
        codigoNovo = codigo;
        const id = codigo.toLowerCase();
        await tx.insert(imoveis).values({
          ...valores,
          id,
          codigo,
          lancamento: false,
          referenciaLoft: ref,
          responsavelId: o.responsavelId,
          criadoEm: agora,
          alteradoEm: agora,
          alteradoPorId: o.responsavelId,
          publicadoEm: valores.situacao === "publicado" ? agora : null,
        });
        await ligarFotos(tx, id, novosIds!, valores);
        await tx.insert(importacaoLoft).values({ referencia: ref, imovelId: id, valores, fotosOrigem: urls, fotoIds: novosIds!, importadoEm: agora });
      });
      r.criados.push(ref);
      await progresso(ref, "criado", codigoNovo, fotosInfo);
      continue;
    }

    const imovelId = c.imovelId!;
    let fotosQueSairam: string[] = [];
    const resultado = await db.transaction(async (tx) => {
      const [atual] = await tx.select().from(imoveis).where(eq(imoveis.id, imovelId)).for("update").limit(1);
      if (!atual) return "excluido" as const;
      const anterior = c.valores as Partial<Valores>;
      const snapshot: Record<string, unknown> = { ...anterior };
      const mudar: Partial<Valores> = {};
      const preservados: string[] = [];
      for (const k of CAMPOS) {
        // Campo sem entrada no snapshot (chave nova de ImovelLoft): adota o do feed se a coluna está vazia.
        const seguir = k in anterior ? igual(atual[k], anterior[k]) : vazio(atual[k]);
        if (!seguir) {
          preservados.push(k);
          continue;
        }
        if (!igual(valores[k], atual[k])) (mudar as Record<string, unknown>)[k] = valores[k];
        snapshot[k] = valores[k];
      }

      let fotosOrigem = c.fotosOrigem;
      let fotoIds = c.fotoIds;
      let fotosMudaram = false;
      const atuais = await idsDasFotos(tx, imovelId);
      if (novosIds && igual(atuais, c.fotoIds)) {
        if (!igual(novosIds, atuais)) {
          await ligarFotos(tx, imovelId, novosIds, { tipo: mudar.tipo !== undefined ? mudar.tipo : atual.tipo, bairro: mudar.bairro ?? atual.bairro });
          fotosQueSairam = atuais.filter((id) => !novosIds.includes(id));
          fotosMudaram = true;
        }
        fotosOrigem = urls;
        fotoIds = novosIds;
      } else {
        preservados.push("fotos");
      }

      const mudou = Object.keys(mudar).length > 0 || fotosMudaram;
      if (mudou) {
        const primeiraPublicacao = mudar.situacao === "publicado" && !atual.publicadoEm;
        await tx
          .update(imoveis)
          .set({ ...mudar, alteradoEm: agora, alteradoPorId: o.responsavelId, ...(primeiraPublicacao ? { publicadoEm: agora } : {}) })
          .where(eq(imoveis.id, imovelId));
      }
      await tx.update(importacaoLoft).set({ valores: snapshot, fotosOrigem, fotoIds, importadoEm: agora }).where(eq(importacaoLoft.referencia, ref));
      return { mudou, preservados, codigo: atual.codigo };
    });
    if (resultado === "excluido") {
      r.excluidosNoPainel.push(ref);
      await progresso(ref, "excluído");
      continue;
    }
    if (resultado.mudou) r.atualizados.push(ref);
    if (resultado.preservados.length) r.camposPreservados.push({ referencia: ref, campos: resultado.preservados });
    // Só as que saíram desta lista, e só se ficaram sem vínculo.
    await descartarFotos(db, fotosQueSairam, o.armazenamento);
    await progresso(ref, resultado.mudou ? "atualizado" : resultado.preservados.length ? "preservado" : "sem mudança", resultado.codigo, fotosInfo);
  }

  const saiuDoAr = new Set<string>();
  // Sumiu da rodada: indisponível, se foi importado publicado e ninguém mexeu nele desde então.
  for (const c of controle.values()) {
    if (vistos.has(c.referencia) || !c.imovelId) continue;
    const imovelId = c.imovelId;
    const situacaoImportada = (c.valores as Partial<Valores>).situacao;
    if (situacaoImportada === "rascunho") r.ausentesRascunho.push(c.referencia);
    // Rascunho que sumiu não vira indisponível: a página de indisponível é pública e mostraria o código.
    if (situacaoImportada !== "publicado") continue;
    const resultado = await db.transaction(async (tx) => {
      const [atual] = await tx.select().from(imoveis).where(eq(imoveis.id, imovelId)).for("update").limit(1);
      if (!atual) return "nada" as const;
      const anterior = c.valores as Partial<Valores>;
      const intacto = CAMPOS.every((k) => k in anterior && igual(atual[k], anterior[k])) && igual(await idsDasFotos(tx, imovelId), c.fotoIds);
      if (!intacto) return "editado" as const;
      if (atual.situacao === "indisponivel") return "nada" as const;
      await tx.update(imoveis).set({ situacao: "indisponivel", alteradoEm: agora, alteradoPorId: o.responsavelId }).where(eq(imoveis.id, imovelId));
      // O snapshot acompanha: se voltar ao feed, a situação volta a seguir a Loft.
      await tx.update(importacaoLoft).set({ valores: { ...anterior, situacao: "indisponivel" }, importadoEm: agora }).where(eq(importacaoLoft.referencia, c.referencia));
      return "indisponivel" as const;
    });
    if (resultado === "indisponivel") {
      r.indisponibilizados.push(c.referencia);
      saiuDoAr.add(imovelId);
    }
    if (resultado === "editado") aviso(c.referencia, "Saiu da Loft, mas foi editado no painel: a situação foi mantida.");
  }

  // Oportunidade: só mexe sozinha na primeira rodada ou se a atual era um importado que acabou de sair
  // do ar. Nos demais casos respeita o ADMIN (que pode ter esvaziado ou trocado) e não apaga o aviso do painel.
  // Escolha: o publicado completo (mesma regra de `oportunidadeDeHoje`) à venda de maior valor, com foto.
  const cfg = await configuracao(db);
  const op = cfg.oportunidadeId ? await carregarImovel(db, cfg.oportunidadeId) : null;
  const reatribuir = primeiraRodada || (cfg.oportunidadeId !== null && saiuDoAr.has(cfg.oportunidadeId));
  if (reatribuir && (!op || op.situacao !== "publicado" || !completo(op))) {
    const [melhor] = await db
      .select({ id: imoveis.id })
      .from(imoveis)
      .where(
        and(
          eq(imoveis.situacao, "publicado"),
          // Os campos de `completo` (catalogo.ts): finalidade, tipo, valor e área.
          eq(imoveis.finalidade, "venda"),
          isNotNull(imoveis.tipo),
          isNotNull(imoveis.valor),
          isNotNull(imoveis.area),
          sql`exists (select 1 from imovel_fotos where imovel_fotos.imovel_id = ${imoveis.id})`,
        ),
      )
      .orderBy(desc(imoveis.valor), asc(imoveis.codigo))
      .limit(1);
    if (melhor) {
      await gravarConfiguracao(db, melhor.id, null);
      r.oportunidade = melhor.id;
    }
  }
  return r;
}
