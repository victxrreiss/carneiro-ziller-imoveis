import type { ReactNode } from "react";
import type { NavKey } from "@/lib/routes";
import { Footer } from "./Footer";
import { Header } from "./Header";

/**
 * Moldura das telas internas (grid, imóvel e institucionais): cabeçalho sólido,
 * conteúdo e rodapé, sob o escopo `.cz` dos estilos dessas telas.
 */
export function SiteChrome({
  current,
  className,
  children,
}: {
  current?: NavKey;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ? `cz ${className}` : "cz"}>
      <Header current={current} />
      {children}
      <Footer />
    </div>
  );
}
