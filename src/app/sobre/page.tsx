import type { Metadata } from "next";
import Link from "next/link";
import { PaginaInstitucional } from "@/components/institucional/PaginaInstitucional";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Sobre nós — Carneiro & Ziller Imóveis",
  description: "Conheça a Ziller Negócios & Carneiro Invest: André Ziller e Matheus Carneiro, mais de uma década no mercado imobiliário em Belo Horizonte, Nova Lima e São Paulo.",
};

export default function SobrePage() {
  return (
    <PaginaInstitucional current="sobre" rotulo="Sobre nós" titulo="Sobre a Carneiro & Ziller">
      <div className="inst-leitura">
        <p>
          A Ziller Negócios &amp; Carneiro Invest nasceu da união de André Ziller e Matheus Carneiro, profissionais com
          mais de uma década de experiência no mercado imobiliário, com atuação em Belo Horizonte, Nova Lima e São Paulo.
        </p>
        <p>
          Com uma sólida rede de relacionamentos e profundo conhecimento do mercado, os sócios oferecem um atendimento
          próximo, personalizado e focado em bons negócios.
        </p>
        <p>
          <strong>Ziller Negócios &amp; Carneiro Invest</strong>
          <br />
          Experiência, confiança e bons negócios.
        </p>
        <div className="notice-actions inst-acoes">
          <Link href={routes.imoveis} className="btn">
            VER IMÓVEIS
          </Link>
          <Link href={routes.contato} className="btn btn-ghost">
            FALE CONOSCO
          </Link>
        </div>
      </div>
    </PaginaInstitucional>
  );
}
