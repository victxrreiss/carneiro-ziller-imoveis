import type { Metadata } from "next";
import { FormularioContato } from "@/components/institucional/FormularioContato";
import { PaginaInstitucional } from "@/components/institucional/PaginaInstitucional";
import { empresa, linkWhatsApp } from "@/lib/site";

export const metadata: Metadata = {
  title: "Contato — Carneiro & Ziller Imóveis",
  description: "Fale com a Carneiro & Ziller por WhatsApp, telefone, e-mail ou formulário.",
};

export default function ContatoPage() {
  return (
    <PaginaInstitucional current="contato" titulo="Fale com a Carneiro & Ziller">
      <div className="inst-contato">
        <div className="inst-texto">
          <p className="inst-lead">
            Atendimento personalizado para comprar, vender ou alugar imóveis de alto padrão em Belo Horizonte e Nova Lima.
          </p>
          <a
            className="btn"
            href={linkWhatsApp("Olá! Vim pelo site da Carneiro & Ziller.")}
            target="_blank"
            rel="noopener"
          >
            FALAR NO WHATSAPP<span className="sr-only"> (abre em nova aba)</span>
          </a>
          <dl className="inst-dados">
            <div>
              <dt>TELEFONE</dt>
              <dd>
                <a href={`tel:+${empresa.whatsapp}`}>{empresa.telefone}</a>
              </dd>
            </div>
            <div>
              <dt>E-MAIL</dt>
              <dd>
                <a href={`mailto:${empresa.email}`}>{empresa.email}</a>
              </dd>
            </div>
            <div>
              <dt>CRECI</dt>
              <dd>{empresa.creci}</dd>
            </div>
            <div>
              <dt>ENDEREÇO</dt>
              <dd>
                {empresa.endereco[0]}
                <br />
                {empresa.endereco[1]}
              </dd>
            </div>
          </dl>
        </div>
        <FormularioContato />
      </div>
    </PaginaInstitucional>
  );
}
