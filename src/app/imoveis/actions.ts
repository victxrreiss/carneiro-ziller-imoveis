"use server";

import { contarImoveis, getOpcoesLocalizacao } from "@/lib/imoveis";
import { validarLocal } from "@/lib/imoveis/catalogo";
import { lerFiltros } from "@/lib/imoveis/filtros";

/** Contagem para o botão "VER N IMÓVEIS" do painel de filtros mobile. */
export async function contarPorQuery(query: string): Promise<number> {
  if (typeof query !== "string" || query.length > 500) return 0;
  const filtros = validarLocal(lerFiltros(new URLSearchParams(query)), await getOpcoesLocalizacao());
  return contarImoveis(filtros);
}
