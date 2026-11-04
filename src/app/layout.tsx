import type { Metadata } from "next";
import { dmSerif, montserrat } from "./fonts";
import "./globals.css";
import "@/styles/cz-site.css";
import "@/styles/cz-imovel.css";

export const metadata: Metadata = {
  // Domínio de produção ainda não definido; resolve URLs absolutas do Open Graph.
  metadataBase: new URL(process.env.SITE_URL ?? "http://localhost:3000"),
  title: "Carneiro & Ziller Imóveis",
  description:
    "Imóveis de alto padrão em Belo Horizonte e Nova Lima. Apartamentos, coberturas, casas em condomínio e terrenos selecionados pela Carneiro & Ziller Imóveis.",
  openGraph: { type: "website", siteName: "Carneiro & Ziller Imóveis", locale: "pt_BR" },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className={`${dmSerif.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
