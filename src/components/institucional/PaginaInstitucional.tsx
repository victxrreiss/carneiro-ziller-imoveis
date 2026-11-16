import type { ReactNode } from "react";
import type { NavKey } from "@/lib/routes";
import { SiteChrome } from "@/components/layout/SiteChrome";

/**
 * Moldura das páginas institucionais: a mesma faixa de título da busca (rótulo + título),
 * o conteúdo na largura da página e o rodapé do site.
 */
export function PaginaInstitucional({
  current,
  rotulo,
  titulo,
  children,
}: {
  current?: NavKey;
  /** Rótulo pequeno acima do título (o nome da seção). */
  rotulo: string;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <SiteChrome current={current}>
      <main>
        <section className="pg-cab">
          <div className="wrap">
            <p className="pg-eyebrow">{rotulo}</p>
            <h1 className="pg-titulo">{titulo}</h1>
          </div>
        </section>
        <div className="wrap inst-body">{children}</div>
      </main>
    </SiteChrome>
  );
}
