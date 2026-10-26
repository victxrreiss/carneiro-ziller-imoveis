import type { Metadata } from "next";
import "@/styles/cz-painel.css";

export const metadata: Metadata = {
  title: { default: "Painel — Carneiro & Ziller", template: "%s — Painel Carneiro & Ziller" },
  // Ferramenta interna: fora dos buscadores e do sitemap.
  robots: { index: false, follow: false },
};

// Todo o painel depende da sessão (cookie): as páginas esperam a requisição.
export const instant = false;

export default function PainelLayout({ children }: LayoutProps<"/painel">) {
  return <div className="cz">{children}</div>;
}
