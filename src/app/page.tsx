import { FeaturedProperty } from "@/components/home/FeaturedProperty";
import { Hero } from "@/components/home/Hero";
import { Institutional } from "@/components/home/Institutional";
import { Launches } from "@/components/home/Launches";
import { Regions } from "@/components/home/Regions";
import { Selected } from "@/components/home/Selected";
import { Footer } from "@/components/layout/Footer";
import { UtilityBar } from "@/components/layout/UtilityBar";

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
