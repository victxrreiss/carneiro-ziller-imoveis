import Image from "next/image";

type Variant = "default" | "negative";

const styles: Record<Variant, { symbol: string; size: string; text: string; amp: string; rule: string; sub: string }> = {
  default: {
    symbol: "/logo/simbolo-carneiro-azul.svg",
    size: "text-[23px]",
    text: "text-grafite",
    amp: "text-vinho",
    rule: "bg-azul-noite",
    sub: "text-cinza",
  },
  negative: {
    symbol: "/logo/simbolo-carneiro-branco.svg",
    size: "text-[22px]",
    text: "text-white",
    amp: "",
    rule: "bg-prata",
    sub: "text-areia",
  },
};

/**
 * Logomarca tipográfica (não há SVG da marca completa). A barra no Z é a
 * assinatura herdada da Ziller e não pode ser omitida.
 */
export function Logo({ variant = "default" }: { variant?: Variant }) {
  const s = styles[variant];
  return (
    <span className="flex items-center gap-3.5">
      <Image src={s.symbol} alt="" width={40} height={40} className="h-10 w-10" />
      <span className="sr-only">Carneiro &amp; Ziller Imóveis</span>
      {/* Composição visual: lida como "ZILLERIMÓVEIS" se exposta ao leitor de tela. */}
      <span aria-hidden="true" className="flex flex-col gap-1.5">
        <span className={`font-serif ${s.size} leading-none whitespace-nowrap ${s.text}`}>
          CARNEIRO <span className={s.amp}>&amp;</span>{" "}
          <span className="relative inline-block">
            Z
            <span aria-hidden="true" className="absolute top-1/2 right-[30%] left-[12%] h-px bg-current" />
          </span>
          ILLER
        </span>
        <span className={`h-px ${s.rule}`} />
        <span className={`pl-[0.9em] text-center text-[8px] tracking-[0.9em] ${s.sub}`}>IMÓVEIS</span>
      </span>
    </span>
  );
}
