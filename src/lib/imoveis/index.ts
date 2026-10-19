// Ponto único de acesso aos imóveis. Hoje lê mocks do handoff; quando o
// backend existir, só a implementação destas funções muda.
import { IMOVEIS, INDISPONIVEIS } from "./catalogo-mock";
import { FAIXAS_AREA, faixasPreco, finalidadeDoFiltro, type Filtros } from "./filtros";
import { destaque, lancamentos, locacao, regioes, venda } from "./mock-data";
import type { Destaque, Imovel, ImovelCard, ImovelResumo, PaginaImoveis, Regiao, ResultadoImovel } from "./types";

export type {
  Destaque,
  Finalidade,
  Foto,
  Imovel,
  ImovelCard,
  ImovelResumo,
  PaginaImoveis,
  Regiao,
  ResultadoImovel,
} from "./types";

export const POR_PAGINA = 15;

export async function getDestaque(): Promise<Destaque> {
  return destaque;
}

export async function getRegioes(): Promise<Regiao[]> {
  return regioes;
}

export async function getLancamentos(): Promise<ImovelCard[]> {
  return lancamentos;
}

export async function getImoveisVenda(): Promise<ImovelCard[]> {
  return venda;
}

export async function getImoveisLocacao(): Promise<ImovelCard[]> {
  return locacao;
}

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

function filtrar(filtros: Filtros): Imovel[] {
  const q = filtros.q ? normalizar(filtros.q) : "";
  const preco = faixasPreco(filtros.finalidade).find(([v]) => v === filtros.preco);
  const area = FAIXAS_AREA.find(([v]) => v === filtros.area);
  const finalidade = filtros.finalidade && finalidadeDoFiltro[filtros.finalidade];
  return IMOVEIS.filter(
    (i) =>
      (!finalidade || i.finalidade === finalidade) &&
      (!q || normalizar(`${i.titulo} ${i.bairro} ${i.cidade} ${i.codigo}`).includes(q)) &&
      (!filtros.tipo || i.tipo === filtros.tipo) &&
      (!preco || (i.valor >= preco[2] && i.valor < preco[3])) &&
      (!area || (i.area >= area[2] && i.area < area[3])) &&
      (!filtros.quartos || (i.quartos ?? 0) >= Number(filtros.quartos)) &&
      (!filtros.vagas || (i.vagas ?? 0) >= Number(filtros.vagas)),
  );
}

function resumo(i: Imovel): ImovelResumo {
  const { id, codigo, finalidade, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, foto } = i;
  return { id, codigo, finalidade, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, foto };
}

export async function buscarImoveis(filtros: Filtros): Promise<PaginaImoveis> {
  const lista = filtrar(filtros);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, filtros.pagina), paginas);
  return {
    itens: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(resumo),
    total: lista.length,
    pagina,
    paginas,
  };
}

export async function contarImoveis(filtros: Filtros): Promise<number> {
  return filtrar(filtros).length;
}

export async function obterImovel(id: string): Promise<ResultadoImovel> {
  const imovel = IMOVEIS.find((i) => i.id === id);
  if (!imovel) return { situacao: "inexistente" };
  if (INDISPONIVEIS.has(id)) return { situacao: "indisponivel", codigo: imovel.codigo };
  return { situacao: "disponivel", imovel };
}

export async function listarIdsImoveis(): Promise<string[]> {
  return IMOVEIS.map((i) => i.id);
}
