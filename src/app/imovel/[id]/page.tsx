import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { ImovelAusente, ImovelCarregando, ImovelTela } from "@/components/imovel/ImovelTela";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { listarIdsImoveis, obterImovel } from "@/lib/imoveis";
import { contextoVolta } from "@/lib/imoveis/filtros";
import { formatarArea, formatarReais } from "@/lib/imoveis/formato";
import { routes } from "@/lib/routes";

export async function generateStaticParams() {
  return (await listarIdsImoveis()).map((id) => ({ id }));
}

export async function generateMetadata({ params }: PageProps<"/imovel/[id]">): Promise<Metadata> {
  const { id } = await params;
  const r = await obterImovel(id);
  if (r.situacao === "inexistente") return { title: "Imóvel não encontrado — Carneiro & Ziller Imóveis" };
  if (r.situacao === "indisponivel") {
    return { title: "Imóvel indisponível — Carneiro & Ziller Imóveis", robots: { index: false, follow: true } };
  }
  const { imovel } = r;
  const descricao =
    imovel.descricao[0] ??
    `${imovel.tipo} em ${imovel.bairro}, ${imovel.cidade} - ${imovel.uf}. ${formatarArea(imovel.area)}, ${formatarReais(imovel.valor)}.`;
  const capa = imovel.fotos[0];
  return {
    title: `${imovel.titulo} — CÓD. ${imovel.codigo} | Carneiro & Ziller Imóveis`,
    description: descricao,
    // Sem a querystring ?de= (contexto de navegação, não conteúdo).
    alternates: { canonical: routes.imovel(imovel.id) },
    openGraph: capa
      ? { title: imovel.titulo, description: descricao, images: [{ url: capa.src, width: capa.largura, height: capa.altura, alt: capa.alt }] }
      : undefined,
  };
}

async function Conteudo({ params, searchParams }: PageProps<"/imovel/[id]">) {
  const { id } = await params;
  const { de: deBruto } = await searchParams;
  const de = typeof deBruto === "string" ? deBruto : undefined;
  const r = await obterImovel(id);

  if (r.situacao === "inexistente") notFound();

  if (r.situacao === "indisponivel") {
    return (
      <SiteChrome current="imoveis">
        <ImovelAusente tipo="indisponivel" codigo={r.codigo} volta={contextoVolta(de, false)} veioDoGrid={de !== undefined} />
      </SiteChrome>
    );
  }

  const { imovel } = r;
  return (
    <SiteChrome current={imovel.lancamento ? "lancamentos" : "imoveis"} className="im-has-bar">
      <ImovelTela imovel={imovel} volta={contextoVolta(de, imovel.lancamento)} />
    </SiteChrome>
  );
}

export default function ImovelPage(props: PageProps<"/imovel/[id]">) {
  return (
    <Suspense
      fallback={
        <SiteChrome current="imoveis">
          <ImovelCarregando />
        </SiteChrome>
      }
    >
      <Conteudo {...props} />
    </Suspense>
  );
}
