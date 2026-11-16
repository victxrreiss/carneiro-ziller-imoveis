import Link from "next/link";
import { InstagramIcon, LinkedInIcon } from "@/components/ui/Icons";
import { temLancamentosParaMenu } from "@/lib/imoveis/lancamentos";
import { itensNavegacao, routes } from "@/lib/routes";
import { empresa, linkTelefone, linkWhatsApp, social } from "@/lib/site";
import { Logo } from "./Logo";

const privacidade = { key: "privacidade", label: "Política de privacidade", href: routes.privacidade };

/** Rodapé do site todo: marca, contatos de `site.ts` (telefone, WhatsApp, e-mail, endereço, CRECI) e navegação. */
export async function Footer() {
  const footerNav = [...itensNavegacao(await temLancamentosParaMenu()), privacidade];
  return (
    <footer className="cz-rodape">
      <div className="cz-rodape-in">
        <div className="cz-rodape-marca">
          <Link href={routes.home} className="cz-rodape-logo">
            <Logo variante="negativa" />
          </Link>
          <p>Imóveis de alto padrão em Belo Horizonte e Nova Lima.</p>
          {(social.instagram || social.linkedin) && (
            <div className="cz-rodape-social">
              {social.instagram && (
                <a href={social.instagram} aria-label="Instagram">
                  <InstagramIcon size={18} color="#E7E4DC" />
                </a>
              )}
              {social.linkedin && (
                <a href={social.linkedin} aria-label="LinkedIn">
                  <LinkedInIcon size={18} color="#E7E4DC" />
                </a>
              )}
            </div>
          )}
        </div>
        <div className="cz-rodape-col">
          <h2>Contato</h2>
          <a href={linkTelefone()}>{empresa.telefone}</a>
          <a href={linkWhatsApp()}>WhatsApp</a>
          <a href={`mailto:${empresa.email}`}>{empresa.email}</a>
          <span>
            {empresa.endereco[0]}
            <br />
            {empresa.endereco[1]}
          </span>
        </div>
        <nav className="cz-rodape-col" aria-label="Rodapé">
          <h2>Navegação</h2>
          {footerNav.map((item) => (
            <Link key={item.key} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="cz-rodape-base">
        <span>© 2026 {empresa.nome}. Todos os direitos reservados.</span>
        <span>{empresa.creci}</span>
      </div>
    </footer>
  );
}
