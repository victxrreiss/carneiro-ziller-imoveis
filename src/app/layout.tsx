import type { Metadata } from "next";
import { dmSerif, montserrat } from "./fonts";
import { descricaoSite, ogPadrao } from "@/lib/site";
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
    <html lang="pt-BR" className={`${dmSerif.variable} ${montserrat.variable}`}>
      <body>{children}</body>
    </html>
  );
}
