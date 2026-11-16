import type { Metadata } from "next";
import { Suspense } from "react";
import { ImoveisView } from "@/components/imoveis/ImoveisView";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { buscarImoveis, getContagemPorTipo, getOpcoesLocalizacao, type PaginaImoveis } from "@/lib/imoveis";
import { validarLocal } from "@/lib/imoveis/catalogo";
import { lerFiltros, tituloGrid } from "@/lib/imoveis/filtros";
import { temLancamentosParaMenu } from "@/lib/imoveis/lancamentos";

export async function generateMetadata({ searchParams }: PageProps<"/imoveis">): Promise<Metadata> {
  const { finalidade } = lerFiltros(await searchParams);
  return {
    title: `${tituloGrid(finalidade)} — Carneiro & Ziller Imóveis`,
    alternates: { canonical: finalidade ? `/imoveis?finalidade=${finalidade}` : "/imoveis" },
  };
}

async function Grid({ searchParams, temLancamentos }: Pick<PageProps<"/imoveis">, "searchParams"> & { temLancamentos: boolean }) {
  const parametros = await searchParams;
  const pedidos = lerFiltros(parametros);
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
      <ImoveisView filtros={filtros} resultado={resultado} localizacoes={localizacoes} tipos={tipos} temLancamentos={temLancamentos} avancados={parametros.avancados === "1"} />
    </SiteChrome>
  );
}

export default async function ImoveisPage({ searchParams }: PageProps<"/imoveis">) {
  const temLancamentos = await temLancamentosParaMenu();
  return (
    <Suspense
      fallback={
        <SiteChrome current="imoveis">
          <ImoveisView filtros={{ pagina: 1 }} resultado={null} localizacoes={[]} tipos={[]} temLancamentos={temLancamentos} esqueleto />
        </SiteChrome>
      }
    >
      <Grid searchParams={searchParams} temLancamentos={temLancamentos} />
    </Suspense>
  );
}
