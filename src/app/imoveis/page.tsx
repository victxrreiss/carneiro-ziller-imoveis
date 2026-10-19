import type { Metadata } from "next";
import { Suspense } from "react";
import { ImoveisView } from "@/components/imoveis/ImoveisView";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { buscarImoveis, type PaginaImoveis } from "@/lib/imoveis";
import { lerFiltros, tituloGrid } from "@/lib/imoveis/filtros";
import { contarPorQuery } from "./actions";

export async function generateMetadata({ searchParams }: PageProps<"/imoveis">): Promise<Metadata> {
  const { finalidade } = lerFiltros(await searchParams);
  return {
    title: `${tituloGrid(finalidade)} — Carneiro & Ziller Imóveis`,
    alternates: { canonical: finalidade ? `/imoveis?finalidade=${finalidade}` : "/imoveis" },
  };
}

async function Grid({ searchParams }: Pick<PageProps<"/imoveis">, "searchParams">) {
  const filtros = lerFiltros(await searchParams);
  let resultado: PaginaImoveis | null = null;
  try {
    resultado = await buscarImoveis(filtros);
  } catch (erro) {
    console.error("Falha ao buscar imóveis", erro);
  }
  return (
    <SiteChrome current={filtros.finalidade === "lancamentos" ? "lancamentos" : "imoveis"}>
      <ImoveisView filtros={filtros} resultado={resultado} contar={contarPorQuery} />
    </SiteChrome>
  );
}

export default function ImoveisPage({ searchParams }: PageProps<"/imoveis">) {
  return (
    <Suspense
      fallback={
        <SiteChrome current="imoveis">
          <ImoveisView filtros={{ pagina: 1 }} resultado={null} contar={contarPorQuery} esqueleto />
        </SiteChrome>
      }
    >
      <Grid searchParams={searchParams} />
    </Suspense>
  );
}
