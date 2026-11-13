// Peças que as seções da Home repetem: moldura, rótulo, título e o card de categoria.
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/** Largura e respiro lateral da página (os mesmos do cabeçalho e do rodapé). */
export const moldura = "mx-auto w-full max-w-(--cz-largura) px-(--cz-respiro)";

const rotuloBase =
  "inline-flex items-center gap-3.5 text-[10.5px] font-medium tracking-[0.22em] whitespace-nowrap uppercase before:h-px before:w-8.5 before:bg-current before:content-[''] sm:text-[11px] sm:tracking-[0.32em]";

/** Rótulo pequeno acima dos títulos: filete + caixa alta. Bronze no claro, champanhe no escuro. */
export function Rotulo({ escuro, children }: { escuro?: boolean; children: ReactNode }) {
  return <span className={`${rotuloBase} ${escuro ? "text-champanhe" : "text-bronze"}`}>{children}</span>;
}

export const tituloSecao = "m-0 font-display text-[clamp(34px,3.6vw,52px)] leading-[1.05] font-light tracking-[-0.01em]";

export const linkSeta =
  "inline-flex items-center gap-2.5 border-b border-champanhe pb-1.5 text-[13px] font-medium tracking-[0.14em] text-noite uppercase after:content-['→'] hover:text-vinho";

/** Cabeçalho de seção: rótulo e título à esquerda, um link ou texto à direita. */
export function CabecalhoSecao({ id, rotulo, titulo, lado }: { id: string; rotulo: string; titulo: string; lado?: ReactNode }) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-x-10 gap-y-4 min-[900px]:mb-11">
      <div className="flex flex-col gap-3.5">
        <Rotulo>{rotulo}</Rotulo>
        <h2 id={id} className={`${tituloSecao} text-noite`}>
          {titulo}
        </h2>
      </div>
      {lado}
    </div>
  );
}

type PropsCategoria = {
  href: string;
  img: string;
  legenda: string;
  nome: string;
  sizes: string;
  /** Card-âncora (ocupa duas colunas): nome maior e mais respiro. */
  grande?: boolean;
  className?: string;
};

/** Card de categoria (tipo ou região): foto, véu azul-noite embaixo e o texto por cima. */
export function CardCategoria({ href, img, legenda, nome, sizes, grande, className = "" }: PropsCategoria) {
  return (
    <Link
      href={href}
      data-grande={grande ? "true" : undefined}
      className={`group relative block overflow-hidden bg-noite text-white hover:text-white focus-visible:outline-offset-[-4px] focus-visible:outline-champanhe ${className}`}
    >
      <Image
        src={img}
        alt=""
        fill
        sizes={sizes}
        className="object-cover transition-transform duration-1200 ease-[cubic-bezier(.2,.6,.2,1)] group-hover:scale-[1.06]"
      />
      <span aria-hidden="true" className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,29,36,0)_30%,rgba(15,29,36,.55)_62%,rgba(15,29,36,.9)_100%)]" />
      <span
        className={`absolute z-1 flex flex-col gap-2 ${
          grande
            ? "right-4.5 bottom-4.5 left-4.5 min-[900px]:right-10 min-[900px]:bottom-9 min-[900px]:left-10"
            : "right-4.5 bottom-4.5 left-4.5 min-[900px]:right-6.5 min-[900px]:bottom-6.5 min-[900px]:left-6.5"
        }`}
      >
        <span className="text-[11px] tracking-[0.28em] text-champanhe uppercase">{legenda}</span>
        <span className={`font-display leading-[1.05] font-light ${grande ? "text-[32px] min-[900px]:text-[44px]" : "text-2xl min-[900px]:text-3xl"}`}>
          {nome}
        </span>
        <span className="mt-1.5 text-xs tracking-[0.16em] uppercase opacity-85 after:content-['_→']">Ver imóveis</span>
      </span>
    </Link>
  );
}
