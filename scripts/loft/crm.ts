// Fichas lidas da tela do CRM da Loft (Ziller Negócios Imobiliários, sem portal ativo e, portanto,
// sem feed VRSync). Cada ficha é um JSON com os campos do formulário do imóvel, pelo nome interno
// do CRM ("imo.BAIRRO", "imo.VLR_VENDA"...), e as URLs das fotos na ordem da galeria. As fichas
// ficam fora do git (têm endereço e dados do proprietário). Aqui elas viram `ImovelLoft`, o mesmo
// formato do feed, com a referência prefixada pela origem (`ORIGEM_ZILLER`).
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { CARACTERISTICA_CRM } from "../../src/lib/imoveis/caracteristicas";
import type { Finalidade, SituacaoImovel } from "../../src/lib/dados/tipos";
import { LIMITES, validarImovel, type EntradaImovel } from "../../src/lib/painel/regras";
import { AVISO_SEM_AREA, citaRua, citaRuaENumero, cortarPorPalavra, mapearTipo, tituloGerado, type ImovelLoft } from "./mapear";

export type FichaCrm = {
  /** Referência do imóvel no CRM, como aparece na tela (ex.: "10220", "PI0118"). */
  ref: string;
  /** Valores do formulário; só as chaves "imo.*" são usadas. Checkbox marcado vem como "on". */
  campos: Record<string, string>;
  /** URLs das fotos em tamanho cheio, na ordem da galeria (a primeira é a capa). */
  fotos: string[];
};

/** Lê as fichas (um .json por imóvel) de uma pasta. */
export async function lerFichasCrm(pasta: string): Promise<FichaCrm[]> {
  const nomes = (await readdir(pasta)).filter((n) => n.endsWith(".json")).sort();
  const fichas: FichaCrm[] = [];
  for (const n of nomes) {
    const d = JSON.parse(await readFile(path.join(pasta, n), "utf8")) as Partial<FichaCrm>;
    if (typeof d.ref !== "string" || !d.campos || !Array.isArray(d.fotos)) throw new Error(`Ficha inválida: ${n}`);
    fichas.push({ ref: d.ref, campos: d.campos, fotos: d.fotos });
  }
  return fichas;
}

/** "R$ 1.800.000,00", "244,00", "1.043,91" → número; vazio, zero ou texto ("PLANO") → null. */
export function numeroCrm(v: string | undefined): number | null {
  const t = (v ?? "").replace(/R\$\s*/, "").trim();
  if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(t)) return null;
  const n = Number(t.replace(/\./g, "").replace(",", "."));
  return n > 0 ? n : null;
}

const inteiroCrm = (v: string | undefined, max: number) => {
  const n = numeroCrm(v);
  return n !== null && Number.isInteger(n) && n <= max ? n : null;
};

/** "Rua" + "Costa Rica" → "Rua Costa Rica"; não repete o tipo se o nome já começa com ele. */
function enderecoCompleto(tipo: string | undefined, nome: string | undefined): string | null {
  const n = (nome ?? "").trim();
  if (!n) return null;
  const t = (tipo ?? "").trim();
  return t && !n.toLowerCase().startsWith(t.toLowerCase()) ? `${t} ${n}` : n;
}

const vazioParaNull = (s: string | undefined) => (s?.trim() ? s.trim() : null);

/**
 * Uma ficha → `ImovelLoft`. Situação: "Exibir no site" marcado → publicado; senão, rascunho.
 * Publicado que não passaria na validação do painel (sem tipo, valor, área ou descrição) entra
 * como rascunho, com aviso: no site ele apareceria pela metade.
 */
export function mapearFichaCrm(f: FichaCrm, origem: string): ImovelLoft {
  const c = Object.fromEntries(
    Object.entries(f.campos)
      .filter(([k]) => k.startsWith("imo."))
      .map(([k, v]) => [k.slice(4), String(v).trim()]),
  ) as Record<string, string>;
  const marcado = (k: string) => c[k] === "on";
  const avisos: string[] = [];

  const tipo = mapearTipo(c.CODIGO_CT, undefined);
  if (!tipo) avisos.push(`Tipo sem mapa: ${c.CODIGO_CT || "(vazio)"}`);

  const status = c.STATUS ?? "";
  const venda = numeroCrm(c.VLR_VENDA);
  const aluguel = numeroCrm(c.VLR_LOCACAO) ?? numeroCrm(c.VLR_ALUGUEL);
  let finalidade: Finalidade | null = null;
  let valor: number | null = null;
  let valorLocacao: number | null = null;
  if (/^Aluguel$/i.test(status) || (!venda && aluguel)) {
    finalidade = "locacao";
    valor = aluguel;
  } else if (/Venda/i.test(status) || venda) {
    finalidade = "venda";
    valor = venda;
    valorLocacao = /Aluguel/i.test(status) ? aluguel : null;
  }
  if (!finalidade) avisos.push("Sem finalidade: sem valor de venda nem de aluguel.");

  // Terreno não tem área privativa: a área do site é a do lote.
  const privativa = numeroCrm(c.AREA_PRIVATIVA);
  const total = numeroCrm(c.AREA_TOTAL) ?? numeroCrm(c.AREA_TERRENO) ?? numeroCrm(c.DIMENSOES_TERRENO);
  const area = privativa ?? total;
  const areaTotal = privativa !== null && total !== null && total > privativa ? total : null;
  if (area === null) avisos.push(AVISO_SEM_AREA);

  const andarBruto = numeroCrm(c.ANDAR_APTO);
  const andar = inteiroCrm(c.ANDAR_APTO, 99);
  if (andarBruto !== null && andar === null) avisos.push(`Andar "${c.ANDAR_APTO}" parece o número da unidade: ficou vazio.`);

  let anoConstrucao = inteiroCrm(c.ANO_CONSTRUCAO, 9999);
  if (anoConstrucao !== null && (anoConstrucao < 1800 || anoConstrucao > new Date().getFullYear() + 5)) {
    avisos.push(`Ano de construção "${c.ANO_CONSTRUCAO}" inválido: ficou vazio.`);
    anoConstrucao = null;
  }

  const bairro = c.BAIRRO ?? "";
  const cidade = c.CIDADE ?? "";
  let titulo = c.TITULO_WEB ?? "";
  if (!titulo) {
    titulo = tituloGerado(tipo, finalidade, bairro, cidade);
    avisos.push("Título ausente, gerado");
  }
  const descricao = (c.DESCRICAO_PARA_WEB ?? "").replace(/\r\n/g, "\n").trim();
  if (!descricao) avisos.push("Descrição ausente");
  const rua = c.ENDERECO ?? "";
  const textoLivre = `${titulo}\n${descricao}`;
  if (citaRuaENumero(textoLivre, rua, c.NUM_ENDERECO ?? "")) avisos.push("Descrição cita o endereço (rua e número)");
  else if (citaRua(textoLivre, rua)) avisos.push("Descrição cita a rua do imóvel.");

  const caracteristicas: string[] = [];
  for (const [campo, chave] of Object.entries(CARACTERISTICA_CRM)) {
    if (marcado(campo) && !caracteristicas.includes(chave)) caracteristicas.push(chave);
  }

  const i: ImovelLoft = {
    referencia: `${origem}${f.ref.trim()}`,
    situacao: marcado("VER_WEB") ? "publicado" : "rascunho",
    finalidade,
    tipo,
    titulo: cortarPorPalavra(titulo, LIMITES.titulo),
    descricao,
    bairro,
    cidade,
    uf: c.UF ?? "",
    valor,
    valorLocacao,
    area,
    areaTotal,
    quartos: inteiroCrm(c.DORMITORIO, 99),
    suites: inteiroCrm(c.SUITE, 99),
    banheiros: inteiroCrm(c.BANHEIRO_SOCIAL, 99),
    vagas: inteiroCrm(c.VAGAS, 99),
    andar,
    anoConstrucao,
    condominio: numeroCrm(c.VLR_CONDOMINIO),
    iptu: numeroCrm(c.VLR_IPTU),
    caracteristicas,
    empreendimento: vazioParaNull(c.EMPREENDIMENTO),
    endereco: enderecoCompleto(c.ENDERECO_TIPO, c.ENDERECO),
    numero: vazioParaNull(c.NUM_ENDERECO),
    complemento: vazioParaNull(c.COMP_ENDERECO),
    cep: vazioParaNull(c.CEP),
    fotos: f.fotos,
    avisos,
    lancamento: marcado("LANCAMENTO"),
  };

  if (i.situacao === "publicado") {
    const faltam = faltasParaPublicar(i);
    if (faltam.length) {
      i.situacao = "rascunho";
      avisos.push(`Exibido no site do CRM, mas entra como rascunho: falta ${faltam.join(", ")}.`);
    }
  }
  return i;
}

/**
 * Campos que o painel exige para publicar e que este imóvel não tem. Erro de formato em campo
 * opcional não conta: a importação já o deixa vazio (`normalizar`), com aviso.
 */
function faltasParaPublicar(i: ImovelLoft): string[] {
  const n = (v: number | null) => (v == null ? "" : String(Math.round(v)));
  const e: EntradaImovel = {
    finalidade: i.finalidade ?? "", lancamento: false, tipo: i.tipo ?? "", titulo: i.titulo, bairro: i.bairro, cidade: i.cidade, uf: i.uf,
    valor: n(i.valor), area: n(i.area), quartos: n(i.quartos), vagas: n(i.vagas), banheiros: n(i.banheiros), suites: n(i.suites),
    areaTotal: n(i.areaTotal), condominio: n(i.condominio), iptu: n(i.iptu), valorLocacao: n(i.valorLocacao), andar: n(i.andar),
    anoConstrucao: n(i.anoConstrucao), empreendimento: i.empreendimento ?? "", endereco: i.endereco ?? "", numero: i.numero ?? "",
    complemento: i.complemento ?? "", cep: i.cep ?? "", caracteristicas: i.caracteristicas, descricao: i.descricao, fotos: [], situacao: "publicado",
  };
  const situacao: SituacaoImovel = "publicado";
  const { erros } = validarImovel(e, situacao);
  const ROTULO: Record<string, string> = { finalidade: "finalidade", tipo: "tipo", titulo: "título", bairro: "bairro", cidade: "cidade", uf: "UF", valor: "valor", area: "área", descricao: "descrição" };
  return Object.keys(erros).filter((k) => k in ROTULO).map((k) => ROTULO[k]);
}

/** Todas as fichas → lista da rodada, sem referência repetida (fica a primeira). */
export function juntarCrm(fichas: FichaCrm[], origem: string): ImovelLoft[] {
  const vistos = new Set<string>();
  const lista: ImovelLoft[] = [];
  for (const f of fichas) {
    if (!f.ref.trim() || vistos.has(f.ref.trim())) continue;
    vistos.add(f.ref.trim());
    lista.push(mapearFichaCrm(f, origem));
  }
  return lista;
}

/** O que a busca de duplicados precisa de um imóvel já cadastrado. */
export type ImovelExistente = {
  codigo: string;
  referenciaLoft: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  empreendimento: string | null;
  area: number | null;
};

const normal = (s: string | null | undefined) =>
  (s ?? "").normalize("NFD").replace(/\p{M}/gu, "").toLowerCase().replace(/^(rua|avenida|alameda|av\.?|r\.?)\s+/, "").replace(/[^a-z0-9]+/g, " ").trim();

/**
 * Imóveis da rodada que parecem já estar no site (o mesmo imóvel anunciado pelos dois sócios):
 * mesmo endereço, número e complemento, ou mesmo empreendimento com a mesma área (±1 m²).
 * Só aponta; quem decide é a equipe. Ignora os que já são desta origem (rodadas repetidas).
 */
export function provaveisDuplicados(lista: ImovelLoft[], existentes: ImovelExistente[], origem: string): { referencia: string; codigo: string; motivo: string }[] {
  const achados: { referencia: string; codigo: string; motivo: string }[] = [];
  const outros = existentes.filter((e) => !(origem && e.referenciaLoft?.startsWith(origem)));
  for (const i of lista) {
    for (const e of outros) {
      const mesmoEndereco =
        normal(i.endereco) !== "" && normal(i.endereco) === normal(e.endereco) && normal(i.numero) === normal(e.numero) && normal(i.complemento) === normal(e.complemento) && normal(i.complemento) !== "";
      const mesmoEmpreendimento =
        normal(i.empreendimento) !== "" && normal(i.empreendimento) === normal(e.empreendimento) && i.area !== null && e.area !== null && Math.abs(i.area - e.area) <= 1;
      if (mesmoEndereco || mesmoEmpreendimento) {
        achados.push({ referencia: i.referencia, codigo: e.codigo, motivo: mesmoEndereco ? "mesmo endereço e complemento" : "mesmo empreendimento e área" });
      }
    }
  }
  return achados;
}
