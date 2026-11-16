import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { linkWhatsApp } from "@/lib/site";
import { moldura, Rotulo, tituloSecao } from "./partes";

const botao =
  "inline-flex min-h-12.5 w-full items-center justify-center border px-7 text-xs font-medium tracking-[0.22em] whitespace-nowrap uppercase transition-colors duration-250 focus-visible:outline-champanhe min-[900px]:w-auto";

/** Foto de fundo do bloco (nenhuma foto se repete na Home: ver fotos-home.test.ts). */
export const FOTO_INSTITUCIONAL = "/images/institucional.jpg";

/**
 * Bloco institucional escuro. Fala de uma empresa só (marca única): o título conta a união das
 * duas trajetórias, sem tratar a Carneiro & Ziller como duas unidades.
 */
export function Institutional() {
  return (
    <section aria-labelledby="inst-titulo" className="relative overflow-hidden bg-noite text-white">
      <Image src={FOTO_INSTITUCIONAL} alt="" fill sizes="100vw" className="object-cover opacity-28" />
      <div className={`${moldura} relative z-1 flex flex-col items-center gap-6.5 py-[clamp(80px,10vw,140px)] text-center`}>
        <Rotulo escuro>A Carneiro &amp; Ziller</Rotulo>
        <h2 id="inst-titulo" className={`${tituloSecao} text-white`}>
          Duas trajetórias.
          <br />
          <em className="text-champanhe italic">Uma só assinatura.</em>
        </h2>
        <p className="m-0 max-w-[58ch] text-[17px] leading-[1.65] font-light text-white/80">
          A Carneiro Invest Imóveis e a Ziller Negócios Imobiliários unem carteiras, equipes e experiência para oferecer uma
          curadoria de imóveis em Belo Horizonte e Nova Lima, com atendimento próximo do primeiro contato à entrega das chaves.
        </p>
        <div className="mt-2 flex w-full flex-wrap justify-center gap-3.5">
          <Link href={routes.sobre} className={`${botao} border-champanhe bg-champanhe text-noite hover:bg-[#D5BE97] hover:text-noite`}>
            Sobre nós
          </Link>
          <a
            href={linkWhatsApp()}
            target="_blank"
            rel="noopener noreferrer"
            className={`${botao} border-white/55 bg-transparent text-white hover:bg-white hover:text-noite`}
          >
            Falar com um consultor
          </a>
        </div>
      </div>
    </section>
  );
}
