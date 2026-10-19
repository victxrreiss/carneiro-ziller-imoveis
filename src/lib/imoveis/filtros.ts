// Filtros do grid de imóveis. Vivem na URL
// (?finalidade=&q=&tipo=&preco=&area=&quartos=&vagas=&pagina=), para o link ser
// compartilhável e para o "Voltar aos resultados" da tela do imóvel.
import { routes } from "@/lib/routes";
import type { Finalidade } from "./types";

export type FinalidadeFiltro = "comprar" | "alugar" | "lancamentos";

export type Filtros = {
  finalidade?: FinalidadeFiltro;
  q?: string;
  tipo?: string;
  preco?: string;
  area?: string;
  quartos?: string;
  vagas?: string;
  pagina: number;
};

export type ChaveFiltro = Exclude<keyof Filtros, "pagina">;

/** [valor na URL, rótulo, mínimo inclusivo, máximo exclusivo] */
export type Faixa = readonly [string, string, number, number];

export const FINALIDADES: readonly { valor: FinalidadeFiltro | undefined; rotulo: string }[] = [
  { valor: undefined, rotulo: "TODOS" },
  { valor: "comprar", rotulo: "COMPRAR" },
  { valor: "alugar", rotulo: "ALUGAR" },
  { valor: "lancamentos", rotulo: "LANÇAMENTOS" },
];

export const finalidadeDoFiltro: Record<FinalidadeFiltro, Finalidade> = {
  comprar: "venda",
  alugar: "locacao",
  lancamentos: "lancamento",
};

const rotuloChipFinalidade: Record<FinalidadeFiltro, string> = {
  comprar: "Comprar",
  alugar: "Alugar",
  lancamentos: "Lançamentos",
};

export const TIPOS = [
  "Apartamento",
  "Cobertura",
  "Casa em condomínio",
  "Casa",
  "Terreno",
  "Sala / Laje corporativa",
  "Prédio comercial",
  "Casa comercial",
] as const;

export const FAIXAS_PRECO_VENDA: readonly Faixa[] = [
  ["ate-1.5m", "Até R$ 1,5 milhão", 0, 1_500_000],
  ["1.5m-3m", "R$ 1,5 a 3 milhões", 1_500_000, 3_000_000],
  ["3m-6m", "R$ 3 a 6 milhões", 3_000_000, 6_000_000],
  ["6m-10m", "R$ 6 a 10 milhões", 6_000_000, 10_000_000],
  ["10m+", "Acima de R$ 10 milhões", 10_000_000, Infinity],
];

export const FAIXAS_PRECO_ALUGUEL: readonly Faixa[] = [
  ["ate-10k", "Até R$ 10 mil/mês", 0, 10_000],
  ["10k-30k", "R$ 10 a 30 mil/mês", 10_000, 30_000],
  ["30k-60k", "R$ 30 a 60 mil/mês", 30_000, 60_000],
  ["60k+", "Acima de R$ 60 mil/mês", 60_000, Infinity],
];

export const FAIXAS_AREA: readonly Faixa[] = [
  ["ate-100", "Até 100 m²", 0, 100],
  ["100-200", "100 a 200 m²", 100, 200],
  ["200-400", "200 a 400 m²", 200, 400],
  ["400-800", "400 a 800 m²", 400, 800],
  ["800+", "Acima de 800 m²", 800, Infinity],
];

export const MINIMOS_QUARTOS = ["1", "2", "3", "4", "5"] as const;
export const MINIMOS_VAGAS = ["1", "2", "3", "4"] as const;

const TAMANHO_MAX_BUSCA = 80;

/** Sem finalidade não há faixa de preço (o filtro fica desabilitado). */
export function faixasPreco(finalidade: FinalidadeFiltro | undefined): readonly Faixa[] {
  if (!finalidade) return [];
  return finalidade === "alugar" ? FAIXAS_PRECO_ALUGUEL : FAIXAS_PRECO_VENDA;
}

type Entrada = URLSearchParams | Record<string, string | string[] | undefined>;

function ler(entrada: Entrada, chave: string): string | undefined {
  if (entrada instanceof URLSearchParams) return entrada.get(chave) ?? undefined;
  const v = entrada[chave];
  return Array.isArray(v) ? v[0] : v;
}

function seEm<T extends string>(valor: string | undefined, lista: readonly T[]): T | undefined {
  return lista.find((v) => v === valor);
}

/** Lê e valida os filtros da URL. Valor desconhecido é descartado. */
export function lerFiltros(entrada: Entrada): Filtros {
  const finalidade = seEm(ler(entrada, "finalidade"), ["comprar", "alugar", "lancamentos"] as const);
  const q = ler(entrada, "q")?.trim().slice(0, TAMANHO_MAX_BUSCA);
  const preco = faixasPreco(finalidade).find(([v]) => v === ler(entrada, "preco"))?.[0];
  const area = FAIXAS_AREA.find(([v]) => v === ler(entrada, "area"))?.[0];
  const pagina = Number.parseInt(ler(entrada, "pagina") ?? "", 10);

  const filtros: Filtros = {
    finalidade,
    q: q || undefined,
    tipo: seEm(ler(entrada, "tipo"), TIPOS),
    preco,
    area,
    quartos: seEm(ler(entrada, "quartos"), MINIMOS_QUARTOS),
    vagas: seEm(ler(entrada, "vagas"), MINIMOS_VAGAS),
    pagina: Number.isInteger(pagina) && pagina > 1 ? pagina : 1,
  };
  return Object.fromEntries(Object.entries(filtros).filter(([, v]) => v !== undefined)) as Filtros;
}

const ORDEM: ChaveFiltro[] = ["finalidade", "q", "tipo", "preco", "area", "quartos", "vagas"];

export function filtrosParaQuery(filtros: Filtros): string {
  const p = new URLSearchParams();
  for (const chave of ORDEM) {
    const v = filtros[chave];
    if (v) p.set(chave, v);
  }
  if (filtros.pagina > 1) p.set("pagina", String(filtros.pagina));
  return p.toString();
}

export function urlGrid(filtros: Filtros): string {
  const q = filtrosParaQuery(filtros);
  return q ? `${routes.imoveis}?${q}` : routes.imoveis;
}

/** Remove um filtro; sem finalidade, a faixa de preço também sai. */
export function semFiltro(filtros: Filtros, chave: ChaveFiltro): Filtros {
  const proximo: Filtros = { ...filtros, [chave]: undefined, pagina: 1 };
  if (chave === "finalidade") proximo.preco = undefined;
  return proximo;
}

/** Troca a finalidade e limpa uma faixa de preço que não vale para a nova. */
export function comFinalidade(filtros: Filtros, finalidade: FinalidadeFiltro | undefined): Filtros {
  const precoValido = faixasPreco(finalidade).some(([v]) => v === filtros.preco);
  return { ...filtros, finalidade, preco: precoValido ? filtros.preco : undefined, pagina: 1 };
}

export function contarFiltrosPainel(filtros: Filtros): number {
  return rotulosFiltros(filtros).filter((r) => r.chave !== "q").length;
}

export function rotulosFiltros(filtros: Filtros): { chave: ChaveFiltro; rotulo: string }[] {
  const r: { chave: ChaveFiltro; rotulo: string }[] = [];
  const faixa = (lista: readonly Faixa[], v?: string) => lista.find(([valor]) => valor === v)?.[1];
  if (filtros.finalidade) r.push({ chave: "finalidade", rotulo: rotuloChipFinalidade[filtros.finalidade] });
  if (filtros.q) r.push({ chave: "q", rotulo: `“${filtros.q}”` });
  if (filtros.tipo) r.push({ chave: "tipo", rotulo: filtros.tipo });
  const preco = faixa(faixasPreco(filtros.finalidade), filtros.preco);
  if (preco) r.push({ chave: "preco", rotulo: preco });
  const area = faixa(FAIXAS_AREA, filtros.area);
  if (area) r.push({ chave: "area", rotulo: area });
  if (filtros.quartos) r.push({ chave: "quartos", rotulo: `${filtros.quartos}+ quartos` });
  if (filtros.vagas) r.push({ chave: "vagas", rotulo: `${filtros.vagas}+ vagas` });
  return r;
}

export function tituloGrid(finalidade: FinalidadeFiltro | undefined): string {
  if (finalidade === "comprar") return "Imóveis à venda";
  if (finalidade === "alugar") return "Imóveis para alugar";
  if (finalidade === "lancamentos") return "Lançamentos";
  return "Todos os imóveis";
}

export type ContextoVolta = { href: string; rotulo: string; resumo: string | undefined };

/**
 * Link "voltar" da tela do imóvel. `de` é a querystring do grid de onde a pessoa
 * veio (`/imovel/cz1009?de=...`); é entrada externa, então só os filtros
 * conhecidos sobrevivem e o destino é sempre o grid.
 */
export function contextoVolta(de: string | undefined, finalidadeImovel: Finalidade): ContextoVolta {
  if (de === undefined) {
    return finalidadeImovel === "lancamento"
      ? { href: routes.lancamentos, rotulo: "VOLTAR AOS LANÇAMENTOS", resumo: undefined }
      : { href: routes.imoveis, rotulo: "VER TODOS OS IMÓVEIS", resumo: undefined };
  }
  const filtros = lerFiltros(new URLSearchParams(de));
  const lancamentos = filtros.finalidade === "lancamentos";
  const rotulos = rotulosFiltros(filtros).filter((r) => !(lancamentos && r.chave === "finalidade"));
  return {
    href: urlGrid(filtros),
    rotulo: lancamentos ? "VOLTAR AOS LANÇAMENTOS" : "VOLTAR AOS RESULTADOS",
    resumo: rotulos.length ? rotulos.map((r) => r.rotulo).join(" · ") : undefined,
  };
}
