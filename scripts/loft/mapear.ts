// Junta o feed VRSync e as duas planilhas da Loft numa ficha só por imóvel, no formato do site.
import { CARACTERISTICA_VRSYNC } from "../../src/lib/imoveis/caracteristicas";
import type { Finalidade, SituacaoImovel } from "../../src/lib/dados/tipos";
import { LIMITES } from "../../src/lib/painel/regras";
import type { LinhaPlanilha } from "./planilha";
import type { AnuncioVrsync } from "./vrsync";

export type Origem = "feed" | "ativo-fora-do-site" | "pendente-suspenso";

export type ImovelLoft = {
  referencia: string;
  situacao: SituacaoImovel;
  finalidade: Finalidade | null;
  tipo: string | null;
  titulo: string;
  descricao: string;
  bairro: string;
  cidade: string;
  uf: string;
  valor: number | null;
  valorLocacao: number | null;
  area: number | null;
  areaTotal: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  anoConstrucao: number | null;
  condominio: number | null;
  iptu: number | null;
  caracteristicas: string[];
  empreendimento: string | null;
  endereco: string | null;
  numero: string | null;
  complemento: string | null;
  cep: string | null;
  fotos: string[];
  avisos: string[];
};

const TIPO_POR_CATEGORIA: Record<string, string> = {
  Apartamento: "Apartamento",
  "Apartamento Duplex": "Apartamento",
  "Casa em Condomínio": "Casa em condomínio",
  Terreno: "Terreno",
  Área: "Terreno",
  Cobertura: "Cobertura",
  Casa: "Casa",
  "Sala Comercial": "Sala / Laje corporativa",
  "Salas/Conjuntos": "Sala / Laje corporativa",
  Studio: "Studio",
  Loft: "Loft",
};

const TIPO_POR_VRSYNC: Record<string, string> = {
  Apartment: "Apartamento",
  Penthouse: "Cobertura",
  Condo: "Casa em condomínio",
  Home: "Casa",
  "Land Lot": "Terreno",
  Office: "Sala / Laje corporativa",
  Building: "Prédio comercial",
  Studio: "Studio",
};

/** A categoria da Loft manda; o `PropertyType` do VRSync ("Residential / Apartment") só entra se faltar a categoria. */
export function mapearTipo(categoria: string | undefined, tipoVrsync: string | undefined): string | null {
  const cat = categoria?.trim();
  if (cat) return TIPO_POR_CATEGORIA[cat] ?? null;
  const v = tipoVrsync?.split("/").pop()?.trim();
  return (v && TIPO_POR_VRSYNC[v]) || null;
}

/** Corta em `max` caracteres sem partir palavra. */
function cortarPorPalavra(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  const corte = t.slice(0, max + 1);
  const espaco = corte.lastIndexOf(" ");
  return (espaco > 0 ? corte.slice(0, espaco) : t.slice(0, max)).replace(/[\s,;:.\-–]+$/, "");
}

const semAcento = (s: string) => s.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
const vazioParaNull = (s: string) => (s.trim() === "" ? null : s.trim());

/** O texto cita a rua do imóvel seguida do número dele (ex.: "Rua X, 500" ou "Rua X nº 500")? */
function citaRuaENumero(texto: string, rua: string, numero: string): boolean {
  const r = semAcento(rua).trim();
  const n = semAcento(numero).trim();
  if (r.length < 4 || !/^\d+$/.test(n)) return false;
  const t = semAcento(texto);
  let i = t.indexOf(r);
  while (i >= 0) {
    const depois = t.slice(i + r.length, i + r.length + 12);
    if (new RegExp(`^[\\s,.\\-–]*(?:n[º°o.]*\\s*)?${n}(?!\\d)`).test(depois)) return true;
    i = t.indexOf(r, i + 1);
  }
  return false;
}

function tituloGerado(tipo: string | null, finalidade: Finalidade | null, bairro: string, cidade: string): string {
  const base = `${tipo ?? "Imóvel"} ${finalidade === "locacao" ? "para alugar" : "à venda"}`;
  const local = [bairro, cidade].filter(Boolean).join(", ");
  return local ? `${base} no ${local}` : base;
}

function doFeed(a: AnuncioVrsync, planilha: LinhaPlanilha | undefined): ImovelLoft {
  const avisos: string[] = [];
  const tipo = mapearTipo(planilha?.categoria, a.tipoVrsync);
  if (!tipo) avisos.push(`Tipo sem mapa: ${planilha?.categoria || a.tipoVrsync || "(vazio)"}`);

  const caracteristicas: string[] = [];
  for (const f of a.features) {
    if (f === "Number of stories") continue;
    const chave = CARACTERISTICA_VRSYNC[f];
    if (!chave) avisos.push(`Característica desconhecida: ${f}`);
    else if (!caracteristicas.includes(chave)) caracteristicas.push(chave);
  }

  const soLocacao = a.transacao === "locacao";
  const finalidade: Finalidade = soLocacao ? "locacao" : "venda";
  const valor = soLocacao ? a.precoLocacao ?? a.precoVenda : a.precoVenda;
  const valorLocacao = a.transacao === "venda-locacao" ? a.precoLocacao : null;

  // Terrenos e prédios vêm sem LivingArea: a área do site é a do lote. A total só aparece quando maior que a privativa.
  const area = a.areaUtil ?? a.areaTerreno;
  const areaTotal = a.areaUtil != null && a.areaTerreno != null && a.areaTerreno > a.areaUtil ? a.areaTerreno : null;

  let titulo = a.titulo;
  if (!titulo) {
    titulo = tituloGerado(tipo, finalidade, a.bairro, a.cidade);
    avisos.push("Título ausente, gerado");
  }
  if (!a.descricao) avisos.push("Descrição ausente");
  if (citaRuaENumero(`${a.titulo}\n${a.descricao}`, a.endereco, a.numero)) avisos.push("Descrição cita o endereço (rua e número)");

  return {
    referencia: a.referencia,
    situacao: "publicado",
    finalidade,
    tipo,
    titulo: cortarPorPalavra(titulo, LIMITES.titulo),
    descricao: a.descricao,
    bairro: a.bairro,
    cidade: a.cidade,
    uf: a.uf,
    valor,
    valorLocacao,
    area,
    areaTotal,
    quartos: a.quartos,
    suites: a.suites,
    banheiros: a.banheiros,
    vagas: a.vagas,
    andar: a.andar,
    anoConstrucao: a.ano,
    condominio: a.condominio,
    iptu: a.iptu,
    caracteristicas,
    empreendimento: vazioParaNull(planilha?.empreendimento ?? ""),
    endereco: vazioParaNull(a.endereco),
    numero: vazioParaNull(a.numero),
    complemento: vazioParaNull(a.complemento),
    cep: vazioParaNull(a.cep),
    fotos: a.fotos,
    avisos,
  };
}

/** Quem só está na planilha: só há categoria, bairro, dormitórios, valores, endereço e empreendimento. */
function daPlanilha(l: LinhaPlanilha, situacao: SituacaoImovel): ImovelLoft {
  const avisos: string[] = [];
  const tipo = mapearTipo(l.categoria, undefined);
  if (!tipo) avisos.push(`Tipo sem mapa: ${l.categoria || "(vazio)"}`);
  let finalidade: Finalidade | null = null;
  let valor: number | null = null;
  let valorLocacao: number | null = null;
  if (l.valorVenda) {
    finalidade = "venda";
    valor = l.valorVenda;
    valorLocacao = l.valorAluguel;
  } else if (l.valorAluguel) {
    finalidade = "locacao";
    valor = l.valorAluguel;
  }
  return {
    referencia: l.referencia,
    situacao,
    finalidade,
    tipo,
    titulo: cortarPorPalavra(tituloGerado(tipo, finalidade, l.bairro, ""), LIMITES.titulo),
    descricao: "",
    bairro: l.bairro,
    cidade: "",
    uf: "",
    valor,
    valorLocacao,
    area: null,
    areaTotal: null,
    quartos: l.quartos,
    suites: null,
    banheiros: null,
    vagas: null,
    andar: null,
    anoConstrucao: null,
    condominio: null,
    iptu: null,
    caracteristicas: [],
    empreendimento: vazioParaNull(l.empreendimento),
    endereco: vazioParaNull(l.endereco),
    numero: vazioParaNull(l.numero),
    complemento: vazioParaNull(l.complemento),
    cep: null,
    fotos: [],
    avisos,
  };
}

/**
 * Junta tudo pela referência. A planilha decide a situação:
 * - no feed (ativo e exibido no site): publicado;
 * - ativo que não está no feed ("Exibir no site" desligado): rascunho;
 * - pendente ou suspenso: rascunho (vale também se ele ainda aparecer no feed).
 */
export function juntar(feed: AnuncioVrsync[], ativos: LinhaPlanilha[], pendentes: LinhaPlanilha[]): ImovelLoft[] {
  const planilhas = new Map<string, LinhaPlanilha>();
  for (const l of [...ativos, ...pendentes]) planilhas.set(l.referencia, l);
  const refsPendentes = new Set(pendentes.map((l) => l.referencia));

  const lista: ImovelLoft[] = [];
  const vistos = new Set<string>();
  for (const a of feed) {
    if (vistos.has(a.referencia)) continue;
    vistos.add(a.referencia);
    const i = doFeed(a, planilhas.get(a.referencia));
    if (refsPendentes.has(a.referencia)) i.situacao = "rascunho";
    lista.push(i);
  }
  for (const l of ativos) {
    if (vistos.has(l.referencia)) continue;
    vistos.add(l.referencia);
    lista.push(daPlanilha(l, "rascunho"));
  }
  for (const l of pendentes) {
    if (vistos.has(l.referencia)) continue;
    vistos.add(l.referencia);
    lista.push(daPlanilha(l, "rascunho"));
  }
  return lista;
}
