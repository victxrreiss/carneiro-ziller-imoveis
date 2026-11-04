import type { ReactNode } from "react";
import type { NavKey } from "@/lib/routes";
import { SiteChrome } from "@/components/layout/SiteChrome";

/** Moldura das páginas institucionais: título, largura de leitura e rodapé do site. */
export function PaginaInstitucional({
  current,
  titulo,
  children,
}: {
  current?: NavKey;
  titulo: string;
  children: ReactNode;
}) {
  return (
    <SiteChrome current={current}>
      <main>
        <section className="page-head">
          <div className="wrap">
            <h1 className="page-title">{titulo}</h1>
          </div>
        </section>
        <div className="wrap inst-body">{children}</div>
      </main>
    </SiteChrome>
  );
}
