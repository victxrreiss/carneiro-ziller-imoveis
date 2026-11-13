import type { Metadata } from "next";
import { Abertura } from "@/components/home/Abertura";
import { BuscaAbertura } from "@/components/home/BuscaAbertura";
import { CardsRegioes } from "@/components/home/CardsRegioes";
import { CardsTipos } from "@/components/home/CardsTipos";
import { Destaques } from "@/components/home/Destaques";
import { Institutional } from "@/components/home/Institutional";
import { Footer } from "@/components/layout/Footer";
import { Header } from "@/components/layout/Header";
import { getContagemPorTipo, getOpcoesLocalizacao } from "@/lib/imoveis";
import { temLancamentosParaMenu } from "@/lib/imoveis/lancamentos";
import { ogPadrao } from "@/lib/site";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: { ...ogPadrao, url: "/" },
};

export default async function Home() {
  const [temLancamentos, tipos, locais] = await Promise.all([temLancamentosParaMenu(), getContagemPorTipo(undefined), getOpcoesLocalizacao()]);

  return (
    // `relative`: o cabeçalho transparente fica por cima da abertura.
    <div className="relative">
      <Header current="home" variante="sobre-imagem" />
      <main>
        <Abertura>
          <BuscaAbertura temLancamentos={temLancamentos} tipos={tipos.map((t) => t.tipo)} locais={locais} />
        </Abertura>
        {/* Cada seção leva o respiro embaixo (qualquer uma pode não aparecer); o de cima fica aqui. */}
        <div className="pt-[clamp(72px,9vw,128px)]">
          <CardsTipos />
          <CardsRegioes />
          <Destaques />
        </div>
        <Institutional />
      </main>
      <Footer />
    </div>
  );
}
