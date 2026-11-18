import Image from "next/image";
import { empresa } from "@/lib/site";

type Forma = "horizontal" | "selo";
type Variante = "positiva" | "negativa";

// Logo da designer (novembro de 2026): Carneiro Invest Imóveis e Ziller Negócios Imobiliários
// lado a lado, vetorizada dos PNGs dela em public/logo/. A horizontal é a "Logo 04" (o "IMŌVEIS"
// do arquivo original foi corrigido para "IMÓVEIS"); o selo é a "Logo 03", com o Z no círculo.
const ARQUIVO: Record<Forma, Record<Variante, string>> = {
  horizontal: {
    positiva: "/logo/carneiro-ziller-horizontal.svg",
    negativa: "/logo/carneiro-ziller-horizontal-negativo.svg",
  },
  selo: {
    positiva: "/logo/carneiro-ziller-selo.svg",
    negativa: "/logo/carneiro-ziller-selo-negativo.svg",
  },
};

const TAMANHO: Record<Forma, { width: number; height: number }> = {
  horizontal: { width: 1428, height: 181 },
  selo: { width: 1286, height: 383 },
};

/**
 * Logomarca completa. `horizontal` (compacta) no topo e no painel; `selo` onde há espaço
 * (rodapé, entrada do painel). `positiva` para fundo claro, `negativa` para o azul-noite.
 * O tamanho vem do CSS de quem usa (largura; a altura acompanha a proporção do arquivo).
 */
export function Logo({
  forma = "horizontal",
  variante = "positiva",
  className,
}: {
  forma?: Forma;
  variante?: Variante;
  className?: string;
}) {
  return (
    <Image
      src={ARQUIVO[forma][variante]}
      alt={empresa.nome}
      {...TAMANHO[forma]}
      unoptimized
      loading="eager"
      className={["cz-logo", `cz-logo-${forma}`, className].filter(Boolean).join(" ")}
    />
  );
}
