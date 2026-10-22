// Ponto único de acesso do site aos imóveis. Lê a base (lib/dados) por
// ./catalogo.ts e guarda o resultado com "use cache"; o painel invalida a tag
// TAG_IMOVEIS ao salvar, publicar ou excluir, e o site passa a mostrar a mudança.
import { cacheLife, cacheTag } from "next/cache";
import * as catalogo from "./catalogo";
import type { Filtros } from "./filtros";

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

export { POR_PAGINA } from "./catalogo";

export const TAG_IMOVEIS = "imoveis";

function marcar() {
  cacheTag(TAG_IMOVEIS);
  cacheLife("max");
}

export async function getDestaque() {
  "use cache";
  marcar();
  return catalogo.oportunidadeDeHoje();
}

export async function getRegioes() {
  "use cache";
  cacheLife("max");
  return catalogo.regioesHome();
}

export async function getLancamentos() {
  "use cache";
  marcar();
  return catalogo.lancamentosHome();
}

export async function getImoveisVenda() {
  "use cache";
  marcar();
  return catalogo.vendaHome();
}

export async function getImoveisLocacao() {
  "use cache";
  marcar();
  return catalogo.locacaoHome();
}

export async function buscarImoveis(filtros: Filtros) {
  "use cache";
  marcar();
  return catalogo.buscarImoveis(filtros);
}

export async function contarImoveis(filtros: Filtros) {
  "use cache";
  marcar();
  return catalogo.contarImoveis(filtros);
}

export async function obterImovel(id: string) {
  "use cache";
  marcar();
  return catalogo.obterImovel(id);
}

export async function listarIdsImoveis() {
  "use cache";
  marcar();
  return catalogo.listarIdsImoveis();
}
