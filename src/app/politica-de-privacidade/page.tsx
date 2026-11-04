import type { Metadata } from "next";
import { PaginaInstitucional } from "@/components/institucional/PaginaInstitucional";
import { empresa } from "@/lib/site";

export const metadata: Metadata = {
  title: "Política de privacidade — Carneiro & Ziller Imóveis",
  description: "Como a Carneiro & Ziller coleta, usa e protege os dados pessoais informados neste site.",
};

export default function PrivacidadePage() {
  return (
    <PaginaInstitucional titulo="Política de privacidade">
      <div className="inst-leitura">
        <h2>Quem somos</h2>
        <p>
          A {empresa.nome} ({empresa.creci}), com sede em {empresa.endereco[0]}, {empresa.endereco[1]}, é a controladora
          dos dados pessoais tratados neste site.
        </p>
        <h2>Quais dados coletamos</h2>
        <p>
          Nos formulários, coletamos nome, telefone, e-mail, a mensagem e o imóvel de interesse. Para limitar abusos,
          guardamos também um código derivado do endereço IP (não guardamos o IP). O site não usa cookies de
          publicidade.
        </p>
        <h2>Para que usamos</h2>
        <p>
          Usamos os dados para responder ao seu contato, agendar visitas e oferecer imóveis relacionados ao seu pedido.
          As bases legais são os procedimentos preliminares a contrato e o legítimo interesse (LGPD, art. 7º, V e IX).
        </p>
        <h2>Com quem compartilhamos</h2>
        <p>
          Compartilhamos apenas com a equipe da Carneiro &amp; Ziller e com os sistemas que usamos para atender (e-mail e
          CRM). Não vendemos dados.
        </p>
        <h2>Por quanto tempo guardamos</h2>
        <p>
          Guardamos os dados enquanto houver atendimento em andamento e, depois, pelo prazo exigido por lei ou até o seu
          pedido de exclusão.
        </p>
        <h2>Seus direitos</h2>
        <p>
          Você pode confirmar o tratamento, acessar, corrigir, pedir a exclusão ou a portabilidade dos seus dados e
          revogar o consentimento, escrevendo para {empresa.email}.
        </p>
        <h2>Contato</h2>
        <p>
          E-mail: <a href={`mailto:${empresa.email}`}>{empresa.email}</a>
          <br />
          Telefone: {empresa.telefone}
        </p>
        <p className="inst-data">Atualizada em 4 de novembro de 2026.</p>
      </div>
    </PaginaInstitucional>
  );
}
