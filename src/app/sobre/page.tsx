import type { Metadata } from "next";
import Link from "next/link";
import { PaginaInstitucional } from "@/components/institucional/PaginaInstitucional";
import { routes } from "@/lib/routes";

export const metadata: Metadata = {
  title: "Sobre nós — Carneiro & Ziller Imóveis",
  description: "Conheça a Carneiro & Ziller, imobiliária de alto padrão em Belo Horizonte e Nova Lima.",
};

export default function SobrePage() {
  return (
    <PaginaInstitucional current="sobre" titulo="Sobre a Carneiro & Ziller">
      <div className="inst-leitura">
        <p>
          A Carneiro &amp; Ziller Imóveis nasceu da união de duas imobiliárias com atuação em Belo Horizonte e Nova Lima.
          Hoje somos uma única empresa, com uma única equipe e o mesmo compromisso com cada cliente.
        </p>
        <p>
          Trabalhamos com imóveis de alto padrão: apartamentos, coberturas, casas em condomínio e terrenos nos bairros e
          condomínios mais desejados da região.
        </p>
        <p>
          Cada atendimento é conduzido de perto, da primeira visita à entrega das chaves, com conhecimento do mercado
          local e discrição.
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
