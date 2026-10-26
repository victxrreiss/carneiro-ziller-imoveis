// Imóveis no painel: lista, edição, publicação, exclusão e a Oportunidade de
// hoje da Home. Toda permissão é conferida aqui, não só na tela.
// Todas as funções recebem o banco como último parâmetro opcional (testes).
import { and, eq, inArray, sql } from "drizzle-orm";
import { armazenamento, assinaturaConfere, type Envio } from "@/lib/armazenamento";
import { conexao, type Db } from "@/lib/dados/conexao";
import { carregarImovel, carregarImoveis } from "@/lib/dados/consultas";
import { configuracaoSite, fotos as tabFotos, imovelFotos, imoveis, usuarios } from "@/lib/dados/esquema";
import type { AvisoOportunidade, FotoRegistro, RegistroImovel, SituacaoImovel } from "@/lib/dados/tipos";
import { ehUuid } from "./contas";
import {
  LIMITES,
  TIPOS_FOTO,
  ehAdmin,
  podeEditar,
  situacaoDestino,
  validarImovel,
  type EntradaImovel,
  type ErrosImovel,
  type Intencao,
  type UsuarioLogado,
} from "./regras";

export type LinhaImovel = {
  id: string;
  codigo: string;
  titulo: string;
  finalidade: RegistroImovel["finalidade"];
  lancamento: boolean;
  tipo: string | null;
  bairro: string;
  cidade: string;
  valor: number | null;
  situacao: SituacaoImovel;
  responsavelId: string;
  responsavelNome: string;
  alteradoEm: string;
  capa: string | null;
  podeEditar: boolean;
  oportunidade: boolean;
};

async function nomes(db: Db): Promise<Map<string, string>> {
  const todos = await db.select({ id: usuarios.id, nome: usuarios.nome }).from(usuarios);
  return new Map(todos.map((u) => [u.id, u.nome]));
}

async function configuracao(db: Db) {
  const [c] = await db.select().from(configuracaoSite).where(eq(configuracaoSite.id, 1)).limit(1);
  return { oportunidadeId: c?.oportunidadeId ?? null, aviso: c?.aviso ?? null };
}

async function gravarConfiguracao(db: Db, oportunidadeId: string | null, aviso: AvisoOportunidade | null) {
  await db
    .insert(configuracaoSite)
    .values({ id: 1, oportunidadeId, aviso })
    .onConflictDoUpdate({ target: configuracaoSite.id, set: { oportunidadeId, aviso } });
}

/** Todos veem todos; o Corretor edita só os próprios. Ordem: última alteração primeiro. */
export async function listarImoveis(u: UsuarioLogado, db: Db = conexao()): Promise<LinhaImovel[]> {
  const [todos, nomeDe, cfg] = await Promise.all([carregarImoveis(db), nomes(db), configuracao(db)]);
  return todos
    .sort((a, b) => b.alteradoEm.localeCompare(a.alteradoEm))
    .map((r) => ({
      id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      finalidade: r.finalidade,
      lancamento: r.lancamento,
      tipo: r.tipo,
      bairro: r.bairro,
      cidade: r.cidade,
      valor: r.valor,
      situacao: r.situacao,
      responsavelId: r.responsavelId,
      responsavelNome: nomeDe.get(r.responsavelId) ?? "—",
      alteradoEm: r.alteradoEm,
      capa: r.fotos[0]?.src ?? null,
      podeEditar: podeEditar(u, r),
      oportunidade: r.id === cfg.oportunidadeId && r.situacao === "publicado",
    }));
}

export type ImovelEdicao = {
  id: string;
  codigo: string;
  entrada: EntradaImovel;
  fotos: (FotoRegistro & { alt: string })[];
  situacao: SituacaoImovel;
  responsavelId: string;
  responsavelNome: string;
  criadoEm: string;
  alteradoEm: string;
  alteradoPorNome: string;
  podeEditar: boolean;
  oportunidade: boolean;
};

const digitos = (n: number | null) => (n === null ? "" : String(n));

export async function obterParaEdicao(u: UsuarioLogado, id: string, db: Db = conexao()): Promise<ImovelEdicao | null> {
  const r = await carregarImovel(db, id.toLowerCase());
  if (!r) return null;
  const [nomeDe, cfg] = await Promise.all([nomes(db), configuracao(db)]);
  return {
    id: r.id,
    codigo: r.codigo,
    entrada: {
      finalidade: r.finalidade ?? "",
      lancamento: r.lancamento,
      tipo: r.tipo ?? "",
      titulo: r.titulo,
      bairro: r.bairro,
      cidade: r.cidade,
      uf: r.uf,
      valor: digitos(r.valor),
      area: digitos(r.area),
      quartos: digitos(r.quartos),
      vagas: digitos(r.vagas),
      descricao: r.descricao,
      fotos: r.fotos.map((f) => ({ id: f.id, alt: f.alt })),
      situacao: r.situacao,
      responsavelId: r.responsavelId,
      oportunidade: cfg.oportunidadeId === r.id,
    },
    fotos: r.fotos,
    situacao: r.situacao,
    responsavelId: r.responsavelId,
    responsavelNome: nomeDe.get(r.responsavelId) ?? "—",
    criadoEm: r.criadoEm,
    alteradoEm: r.alteradoEm,
    alteradoPorNome: nomeDe.get(r.alteradoPorId) ?? "—",
    podeEditar: podeEditar(u, r),
    oportunidade: cfg.oportunidadeId === r.id,
  };
}

/** Usuários que podem ser responsáveis (ativos), mais o atual se tiver sido desativado. */
export async function opcoesResponsavel(atualId?: string, db: Db = conexao()): Promise<{ id: string; nome: string; desativado: boolean }[]> {
  const todos = await db.select().from(usuarios);
  return todos
    .filter((u) => u.situacao === "ativo" || u.id === atualId)
    .map((u) => ({ id: u.id, nome: u.nome, desativado: u.situacao !== "ativo" }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export async function oportunidadeAtual(db: Db = conexao()): Promise<{ id: string; codigo: string; titulo: string } | null> {
  const { oportunidadeId } = await configuracao(db);
  const r = oportunidadeId ? await carregarImovel(db, oportunidadeId) : null;
  return r && r.situacao === "publicado" ? { id: r.id, codigo: r.codigo, titulo: r.titulo } : null;
}

export type AvisoParaAdmin = { aviso: AvisoOportunidade | null; porNome: string | null; foiVoce: boolean };

/** Só para o ADMIN: Oportunidade de hoje vazia e, se houver, quem tirou o imóvel do ar. */
export async function avisoOportunidadeVazia(u: UsuarioLogado, db: Db = conexao()): Promise<AvisoParaAdmin | null> {
  if (!ehAdmin(u) || (await oportunidadeAtual(db))) return null;
  const { aviso } = await configuracao(db);
  const nomeDe = aviso ? (await nomes(db)).get(aviso.porId) ?? "—" : null;
  return { aviso, porNome: nomeDe, foiVoce: aviso?.porId === u.id };
}

// ---------- Fotos (upload direto ao armazenamento) ----------

export type ErroUpload = "tipo" | "tamanho" | "dimensoes";

const EXTENSAO: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

/** Passo 1: confere o que o navegador declara e devolve a URL assinada de envio. */
export async function prepararEnvioFoto(
  u: UsuarioLogado,
  declarado: { tipo: string; tamanho: number; largura: number; altura: number },
  db: Db = conexao(),
): Promise<{ ok: true; id: string; envio: Envio } | { ok: false; erro: ErroUpload }> {
  const { tipo, tamanho, largura, altura } = declarado;
  if (!(TIPOS_FOTO as readonly string[]).includes(tipo)) return { ok: false, erro: "tipo" };
  if (!Number.isInteger(tamanho) || tamanho <= 0 || tamanho > LIMITES.fotoMB * 1024 * 1024) return { ok: false, erro: "tamanho" };
  if (!(largura > 0 && altura > 0 && largura <= 20000 && altura <= 20000)) return { ok: false, erro: "dimensoes" };
  const id = crypto.randomUUID();
  const chave = `fotos/${id}.${EXTENSAO[tipo]}`;
  const envio = await armazenamento().urlDeEnvio({ chave, tipo, tamanho });
  await db.insert(tabFotos).values({ id, chave, tipo, tamanho, largura: Math.round(largura), altura: Math.round(altura), enviadoPorId: u.id, confirmada: false });
  return { ok: true, id, envio };
}

export type ErroConfirmar = "inexistente" | "ausente" | "invalida";

/** Passo 4: confere o objeto no armazenamento (tamanho, tipo, assinatura). Se algo não bate, apaga o objeto. */
export async function confirmarFoto(
  u: UsuarioLogado,
  id: string,
  db: Db = conexao(),
): Promise<{ ok: true; id: string; src: string } | { ok: false; erro: ErroConfirmar }> {
  if (!ehUuid(id)) return { ok: false, erro: "inexistente" };
  const [f] = await db.select().from(tabFotos).where(eq(tabFotos.id, id)).limit(1);
  if (!f || f.enviadoPorId !== u.id) return { ok: false, erro: "inexistente" };
  const a = armazenamento();
  if (f.confirmada) return { ok: true, id: f.id, src: a.urlPublica(f.chave) };
  const objeto = await a.conferir(f.chave);
  if (!objeto) return { ok: false, erro: "ausente" };
  if (objeto.tamanho !== f.tamanho || objeto.tipo !== f.tipo || !assinaturaConfere(objeto.inicio, f.tipo)) {
    await a.remover([f.chave]);
    await db.delete(tabFotos).where(eq(tabFotos.id, f.id));
    return { ok: false, erro: "invalida" };
  }
  await db.update(tabFotos).set({ confirmada: true }).where(eq(tabFotos.id, f.id));
  return { ok: true, id: f.id, src: a.urlPublica(f.chave) };
}

/** Apaga linhas e objetos de fotos sem vínculo. Falha no armazenamento deixa o resto para `fotos:limpar`. */
async function descartarFotos(db: Db, ids: string[]): Promise<void> {
  if (!ids.length) return;
  const livres = await db
    .select()
    .from(tabFotos)
    .where(and(inArray(tabFotos.id, ids), sql`not exists (select 1 from imovel_fotos where imovel_fotos.foto_id = ${tabFotos.id})`));
  if (!livres.length) return;
  try {
    await armazenamento().remover(livres.map((f) => f.chave));
  } catch (e) {
    console.error("[fotos] não foi possível remover objetos; fotos:limpar tentará de novo", e instanceof Error ? e.message : e);
    return;
  }
  await db.delete(tabFotos).where(inArray(tabFotos.id, livres.map((f) => f.id)));
}

// ---------- Salvar ----------

export type ResultadoSalvar =
  | { ok: true; id: string; codigo: string; situacao: SituacaoImovel; novo: boolean; oportunidadeSaiu: boolean }
  | { ok: false; erros: ErrosImovel }
  | { ok: false; proibido: true }
  | { ok: false; inexistente: true };

export async function salvarImovel(
  u: UsuarioLogado,
  id: string | null,
  e: EntradaImovel,
  intencao: Intencao,
  agora = new Date(),
  db: Db = conexao(),
): Promise<ResultadoSalvar> {
  const existente = id ? await carregarImovel(db, id) : null;
  if (id && !existente) return { ok: false, inexistente: true };
  if (existente && !podeEditar(u, existente)) return { ok: false, proibido: true };

  // Rascunho só existe antes da primeira publicação; depois a situação vem do campo.
  const destino = situacaoDestino(intencao, e.situacao);
  const { erros, dados } = validarImovel(e, destino);

  // Só entra foto confirmada e enviada por quem salva, ou que já esteja neste imóvel.
  const pedidas = e.fotos.map((f) => f.id).filter(ehUuid);
  const linhasFotos = pedidas.length ? await db.select().from(tabFotos).where(inArray(tabFotos.id, pedidas)) : [];
  const vinculadas = pedidas.length ? await db.select().from(imovelFotos).where(inArray(imovelFotos.fotoId, pedidas)) : [];
  const vinculoDe = new Map(vinculadas.map((v) => [v.fotoId, v.imovelId]));
  const registro = new Map(linhasFotos.map((f) => [f.id, f]));
  const novasFotos: { fotoId: string; alt: string }[] = [];
  if (new Set(e.fotos.map((f) => f.id)).size !== e.fotos.length) erros.fotos ??= "A mesma foto aparece mais de uma vez.";
  for (const f of e.fotos) {
    const linha = ehUuid(f.id) ? registro.get(f.id) : undefined;
    const jaNeste = !!existente && vinculoDe.get(f.id) === existente.id;
    const livre = linha && !vinculoDe.has(f.id) && linha.confirmada && linha.enviadoPorId === u.id;
    if (linha && (jaNeste || livre)) novasFotos.push({ fotoId: f.id, alt: f.alt.trim() });
    else erros.fotos ??= "Uma das fotos não terminou de enviar. Remova-a ou envie de novo.";
  }
  if (Object.keys(erros).length) return { ok: false, erros };

  let responsavelId = existente?.responsavelId ?? u.id;
  if (ehAdmin(u) && e.responsavelId && ehUuid(e.responsavelId)) {
    const [alvo] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.id, e.responsavelId)).limit(1);
    if (alvo) responsavelId = alvo.id;
  }

  const resultado = await db.transaction(async (tx) => {
    let imovelId: string;
    let codigo: string;
    if (existente) {
      imovelId = existente.id;
      codigo = existente.codigo;
      const primeiraPublicacao = destino === "publicado" && !existente.publicadoEm;
      await tx
        .update(imoveis)
        .set({ ...dados, situacao: destino, responsavelId, alteradoEm: agora, alteradoPorId: u.id, ...(primeiraPublicacao ? { publicadoEm: agora } : {}) })
        .where(eq(imoveis.id, existente.id));
    } else {
      const r = (await tx.execute(sql`select nextval('imovel_codigo_seq')::int as n`)) as unknown as { n: number }[] | { rows: { n: number }[] };
      const n = (Array.isArray(r) ? r : r.rows)[0].n;
      codigo = `CZ${n}`;
      imovelId = codigo.toLowerCase();
      await tx.insert(imoveis).values({
        ...dados,
        id: imovelId,
        codigo,
        situacao: destino,
        responsavelId,
        criadoEm: agora,
        alteradoEm: agora,
        alteradoPorId: u.id,
        publicadoEm: destino === "publicado" ? agora : null,
      });
    }
    await tx.delete(imovelFotos).where(eq(imovelFotos.imovelId, imovelId));
    if (novasFotos.length) await tx.insert(imovelFotos).values(novasFotos.map((f, ordem) => ({ imovelId, fotoId: f.fotoId, ordem, alt: f.alt })));

    // Oportunidade de hoje: só publicado; marcar substitui o atual; só o ADMIN escolhe.
    const cfg = await configuracao(tx);
    const ehAtual = cfg.oportunidadeId === imovelId;
    const aviso = (motivo: AvisoOportunidade["motivo"]): AvisoOportunidade => ({ porId: u.id, codigo, titulo: dados.titulo || "Imóvel sem título", motivo, em: new Date().toISOString() });
    let oportunidadeSaiu = false;
    if (ehAtual && destino !== "publicado") {
      await gravarConfiguracao(tx, null, aviso(destino === "indisponivel" ? "indisponivel" : "rascunho"));
      oportunidadeSaiu = true;
    } else if (ehAdmin(u) && e.oportunidade !== undefined) {
      if (e.oportunidade && destino === "publicado") await gravarConfiguracao(tx, imovelId, null);
      else if (!e.oportunidade && ehAtual) {
        await gravarConfiguracao(tx, null, aviso("desmarcado"));
        oportunidadeSaiu = true;
      }
    }
    return { id: imovelId, codigo, oportunidadeSaiu };
  });

  // Fotos que saíram do imóvel não ficam no bucket público.
  const mantidas = new Set(novasFotos.map((f) => f.fotoId));
  await descartarFotos(db, (existente?.fotos ?? []).map((f) => f.id).filter((fid) => !mantidas.has(fid)));

  return { ok: true, id: resultado.id, codigo: resultado.codigo, situacao: destino, novo: !existente, oportunidadeSaiu: resultado.oportunidadeSaiu };
}

/** Só ADMIN. Se for o imóvel da Oportunidade de hoje, a seção fica vazia. */
export async function excluirImovel(
  u: UsuarioLogado,
  id: string,
  db: Db = conexao(),
): Promise<{ ok: true; codigo: string; titulo: string; oportunidadeSaiu: boolean } | { ok: false }> {
  if (!ehAdmin(u)) return { ok: false };
  const r = await carregarImovel(db, id);
  if (!r) return { ok: false };
  const fotoIds = r.fotos.map((f) => f.id);
  const eraOportunidade = await db.transaction(async (tx) => {
    const era = (await configuracao(tx)).oportunidadeId === id;
    if (era) await gravarConfiguracao(tx, null, { porId: u.id, codigo: r.codigo, titulo: r.titulo || "Imóvel sem título", motivo: "excluido", em: new Date().toISOString() });
    await tx.delete(imoveis).where(eq(imoveis.id, id));
    return era;
  });
  await descartarFotos(db, fotoIds);
  return { ok: true, codigo: r.codigo, titulo: r.titulo, oportunidadeSaiu: eraOportunidade };
}

