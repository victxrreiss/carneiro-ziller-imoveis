import type { Metadata } from "next";
import { Suspense } from "react";
import { ImoveisView } from "@/components/imoveis/ImoveisView";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { buscarImoveis, getContagemPorTipo, getOpcoesLocalizacao, type PaginaImoveis } from "@/lib/imoveis";
import { validarLocal } from "@/lib/imoveis/catalogo";
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
  const pedidos = lerFiltros(await searchParams);
  let filtros = pedidos;
  let resultado: PaginaImoveis | null = null;
  let localizacoes: Awaited<ReturnType<typeof getOpcoesLocalizacao>> = [];
  let tipos: Awaited<ReturnType<typeof getContagemPorTipo>> = [];
  try {
    localizacoes = await getOpcoesLocalizacao();
    filtros = validarLocal(pedidos, localizacoes);
    [resultado, tipos] = await Promise.all([buscarImoveis(filtros), getContagemPorTipo(filtros.finalidade)]);
  } catch (erro) {
    console.error("Falha ao buscar imóveis", erro);
  }
  return (
    <SiteChrome current={filtros.finalidade === "lancamentos" ? "lancamentos" : "imoveis"}>
      <ImoveisView filtros={filtros} resultado={resultado} contar={contarPorQuery} localizacoes={localizacoes} tipos={tipos} />
    </SiteChrome>
  );
}

export default function ImoveisPage({ searchParams }: PageProps<"/imoveis">) {
  return (
    <Suspense
      fallback={
        <SiteChrome current="imoveis">
          <ImoveisView filtros={{ pagina: 1 }} resultado={null} contar={contarPorQuery} localizacoes={[]} tipos={[]} esqueleto />
        </SiteChrome>
      }
    >
      <Grid searchParams={searchParams} />
    </Suspense>
  );
}
