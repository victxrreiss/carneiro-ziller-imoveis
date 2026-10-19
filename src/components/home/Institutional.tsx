import Image from "next/image";
import Link from "next/link";
import { routes } from "@/lib/routes";
import { SectionLabel } from "./SectionLabel";

const pilares = [
  { titulo: "Curadoria", texto: "Imóveis avaliados um a um antes de entrar na carteira." },
  { titulo: "Consultoria", texto: "Um consultor dedicado do início ao fim da negociação." },
  { titulo: "Discrição", texto: "Negociações conduzidas com sigilo e cuidado." },
];

function Seal() {
  const serif = { fontFamily: "var(--font-dm-serif), serif", fontSize: 150 };
  return (
    <svg viewBox="0 0 380 380" width="240" height="240" role="img" aria-label="Selo Carneiro & Ziller Imóveis">
      <defs>
        <path id="ring-inst" d="M 30 190 A 160 160 0 1 1 30 190.01" />
      </defs>
      <text style={{ fontFamily: "var(--font-montserrat), sans-serif", fontSize: 18 }} textLength={985} lengthAdjust="spacing">
        <textPath href="#ring-inst">
          <tspan fill="#FFFFFF" fontWeight={600}>CARNEIRO</tspan>
          <tspan fill="#E7E4DC"> • </tspan>
          <tspan fill="#FFFFFF" fontWeight={600}>ZILLER</tspan>
          <tspan fill="#E7E4DC"> • </tspan>
          <tspan fill="#E7E4DC">IMÓVEIS</tspan>
          <tspan fill="#E7E4DC"> • </tspan>
        </textPath>
      </text>
      <text x="112" y="240" style={serif} fill="#FFFFFF">
        C
      </text>
      <rect x="194" y="128" width="2" height="128" fill="#E7E4DC" />
      <text x="208" y="240" style={serif} fill="#FFFFFF">
        Z
      </text>
      <rect x="216" y="182" width="42" height="6" fill="#FFFFFF" />
    </svg>
  );
}

export function Institutional() {
  return (
    <section aria-labelledby="inst-titulo" className="relative mt-30 overflow-hidden">
      <Image src="/images/institucional.jpg" alt="" fill sizes="100vw" className="object-cover" />
      <div className="absolute inset-0 bg-[rgba(15,29,36,0.84)]" />
      <div className="relative mx-auto flex box-content max-w-310 flex-wrap items-center gap-14 px-6 py-28">
        <div className="relative h-60 w-60 flex-none">
          <Seal />
        </div>
        <div className="flex flex-[1_1_480px] flex-col gap-5.5">
          <SectionLabel tone="areia">CARNEIRO INVEST + ZILLER NEGÓCIOS</SectionLabel>
          <h2 id="inst-titulo" className="m-0 font-serif text-[clamp(36px,4vw,54px)] leading-[1.08] font-normal text-white">
            Duas trajetórias.
            <br />
            <em>Uma só assinatura.</em>
          </h2>
          <p className="m-0 max-w-150 text-base leading-[1.75] text-areia">
            A Carneiro Invest Imóveis e a Ziller Negócios Imobiliários unem carteiras, equipes e experiência para oferecer
            uma curadoria de imóveis em Belo Horizonte e Nova Lima, com atendimento próximo do primeiro contato à entrega das
            chaves.
          </p>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(170px,1fr))] gap-6 border-t border-[rgba(231,228,220,0.3)] pt-5.5">
            {pilares.map((p) => (
              <div key={p.titulo} className="flex flex-col gap-1.5">
                <span className="font-serif text-[22px] text-white">{p.titulo}</span>
                <span className="text-sm leading-[1.6] text-prata">{p.texto}</span>
              </div>
            ))}
          </div>
          <Link
            href={routes.sobre}
            className="mt-2 self-start border border-white px-6.5 py-4 text-xs font-semibold tracking-[0.2em] text-white transition-colors duration-200 hover:bg-white hover:text-azul-noite"
          >
            CONHEÇA NOSSA HISTÓRIA
          </Link>
        </div>
      </div>
    </section>
  );
}
