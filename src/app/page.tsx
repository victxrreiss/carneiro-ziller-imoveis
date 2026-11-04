import type { Metadata } from "next";
import { FeaturedProperty } from "@/components/home/FeaturedProperty";
import { Hero } from "@/components/home/Hero";
import { Institutional } from "@/components/home/Institutional";
import { Launches } from "@/components/home/Launches";
import { Regions } from "@/components/home/Regions";
import { Selected } from "@/components/home/Selected";
import { Footer } from "@/components/layout/Footer";
import { UtilityBar } from "@/components/layout/UtilityBar";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
  openGraph: {
    title: "Carneiro & Ziller Imóveis",
    description:
      "Imóveis de alto padrão em Belo Horizonte e Nova Lima. Apartamentos, coberturas, casas em condomínio e terrenos selecionados pela Carneiro & Ziller Imóveis.",
    url: "/",
    images: [{ url: "/images/hero-predio.png", width: 1240, height: 1160, alt: "Fachada de edifício residencial moderno" }],
  },
};

export default function Home() {
  return (
    <>
      <UtilityBar />
      <main>
        <Hero />
        <Regions />
        <FeaturedProperty />
        <Launches />
        <Institutional />
        <Selected />
      </main>
      {/* Rodapé do grid/Imóvel, adotado no site todo (decisão do usuário). */}
      <div className="cz">
        <Footer />
      </div>
    </>
  );
}
