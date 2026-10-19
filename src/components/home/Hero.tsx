import type { ReactNode } from "react";
import { Header } from "@/components/layout/Header";
import { HouseIcon, PersonIcon, PinIcon } from "@/components/ui/Icons";
import { HeroComposition } from "./HeroComposition";
import { SearchBox } from "./SearchBox";
import { SectionLabel } from "./SectionLabel";

const highlights: { icon: ReactNode; title: string; caption: string }[] = [
  { icon: <PinIcon size={22} color="#78323D" />, title: "2 unidades", caption: "BH e Nova Lima" },
  { icon: <HouseIcon size={22} color="#78323D" />, title: "Curadoria", caption: "Imóveis selecionados" },
  { icon: <PersonIcon size={22} color="#78323D" />, title: "Consultoria", caption: "Do início às chaves" },
];

const dots = "absolute bg-size-[20px_20px]";

export function Hero() {
  return (
    <section className="relative overflow-hidden bg-fundo-hero">
      <div
        aria-hidden="true"
        className={`${dots} bottom-4 left-0 h-15 w-42 bg-[radial-gradient(#78323D_1.2px,transparent_1.3px)] opacity-55`}
      />
      <div
        aria-hidden="true"
        className={`${dots} top-30 right-0 h-35 w-30 bg-[radial-gradient(#6D6E71_1.2px,transparent_1.3px)] opacity-45`}
      />

      <Header current="home" />

      <div className="relative z-2 mx-auto flex box-content max-w-310 flex-wrap items-center gap-12 px-6 pt-8 pb-24">
        <div className="flex flex-[1_1_460px] flex-col gap-6.5">
          <SectionLabel>BELO HORIZONTE · NOVA LIMA</SectionLabel>
          <h1 className="m-0 font-serif text-[clamp(42px,4.6vw,66px)] leading-[1.08] font-normal tracking-[-0.01em] text-azul-noite">
            Encontre o endereço que traduz <em className="text-vinho">quem você é</em>
          </h1>
          <p className="m-0 max-w-115 text-base leading-[1.75] text-texto-secundario">
            Apartamentos, coberturas, casas em condomínio e lançamentos em Belo Horizonte e Nova Lima.
          </p>

          <SearchBox />

          <div className="flex flex-wrap gap-x-10 gap-y-5 pt-2.5">
            {highlights.map((h) => (
              <div key={h.title} className="flex items-start gap-3">
                {h.icon}
                <div className="flex flex-col gap-0.5">
                  <span className="font-serif text-xl text-azul-noite">{h.title}</span>
                  <span className="text-xs text-cinza">{h.caption}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="relative flex flex-[1_1_520px] justify-end">
          <HeroComposition />
        </div>
      </div>
    </section>
  );
}
