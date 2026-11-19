import type { Metadata } from "next";
import { Suspense } from "react";
import { cormorant, jost } from "./fonts";
import { Rastreamento } from "@/components/layout/Rastreamento";
import { descricaoSite, ogPadrao, rastreamentoAtivo } from "@/lib/site";
import "./globals.css";
import "@/styles/cz-site.css";
import "@/styles/cz-imovel.css";

export const metadata: Metadata = {
  // Domínio de produção ainda não definido; resolve URLs absolutas do Open Graph.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Carneiro & Ziller Imóveis",
  description: descricaoSite,
  openGraph: ogPadrao,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${cormorant.variable} ${jost.variable}`}>
      <body>
        {/* Tag Manager e Pixel: só no domínio de produção (ver `rastreamento` em lib/site.ts). */}
        {/* Suspense: o Rastreamento lê o caminho (usePathname). Fora dele, o Next 16.4.6 recusa as
            páginas dinâmicas, como /imovel/[id], com erro 500 (só em produção, onde ele é ligado). */}
        {rastreamentoAtivo(process.env.SITE_URL) && (
          <Suspense fallback={null}>
            <Rastreamento />
          </Suspense>
        )}
        {children}
      </body>
    </html>
  );
}
