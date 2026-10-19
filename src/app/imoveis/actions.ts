"use server";

import { contarImoveis } from "@/lib/imoveis";
import { lerFiltros } from "@/lib/imoveis/filtros";

/** Contagem para o botão "VER N IMÓVEIS" do painel de filtros mobile. */
export async function contarPorQuery(query: string): Promise<number> {
  if (typeof query !== "string" || query.length > 500) return 0;
  return contarImoveis(lerFiltros(new URLSearchParams(query)));
}
