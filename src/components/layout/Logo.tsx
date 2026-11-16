import Image from "next/image";
import { empresa } from "@/lib/site";

type Variante = "positiva" | "negativa";

// Logo B (refinamento), com o texto em curvas: public/logo/. A barra no Z é a
// assinatura herdada da Ziller e faz parte do desenho.
const ARQUIVO: Record<Variante, string> = {
  positiva: "/logo/carneiro-ziller.svg",
  negativa: "/logo/carneiro-ziller-negativo.svg",
};

/**
 * Logomarca completa. `positiva` para fundo claro, `negativa` para o azul-noite.
 * O tamanho vem do CSS de quem usa (largura; a altura acompanha a proporção 281:45).
 */
export function Logo({ variante = "positiva", className }: { variante?: Variante; className?: string }) {
  return (
    <Image
      src={ARQUIVO[variante]}
      alt={empresa.nome}
      width={281}
      height={45}
      unoptimized
      loading="eager"
      className={className ? `cz-logo ${className}` : "cz-logo"}
    />
  );
}
