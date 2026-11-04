import Link from "next/link";
import { InstagramIcon, LinkedInIcon } from "@/components/ui/Icons";
import { temLancamentosParaMenu } from "@/lib/imoveis/lancamentos";
import { itensNavegacao, routes } from "@/lib/routes";
import { empresa, linkWhatsApp, social } from "@/lib/site";
import { Logo } from "./Logo";

const privacidade = { key: "privacidade", label: "Política de privacidade", href: routes.privacidade };

/** Rodapé do site (versão do grid/Imóvel). Precisa de um ancestral `.cz`. */
export async function Footer() {
  const footerNav = [...itensNavegacao(await temLancamentosParaMenu()), privacidade];
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-col" style={{ gap: 22 }}>
          <Link href={routes.home} className="logo">
            <Logo variant="negative" />
          </Link>
          <p style={{ margin: 0 }}>Imóveis em Belo Horizonte e Nova Lima.</p>
          {(social.instagram || social.linkedin) && (
            <div className="social">
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
        <div className="f-col">
          <div className="f-h">{empresa.nome.toUpperCase()}</div>
          <span>{empresa.creci}</span>
          <span>{empresa.telefone}</span>
          <a href={linkWhatsApp()}>WHATSAPP</a>
          <a href={`mailto:${empresa.email}`}>{empresa.email}</a>
          <span>
            {empresa.endereco[0]}
            <br />
            {empresa.endereco[1]}
          </span>
        </div>
        <nav className="f-col" aria-label="Rodapé">
          <div className="f-h">NAVEGAÇÃO</div>
          {footerNav.map((item) => (
            <Link key={item.key} href={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
      </div>
      <div className="f-bottom">
        <div className="wrap">
          <span>© 2026 Carneiro &amp; Ziller Imóveis. Todos os direitos reservados.</span>
          <span>{empresa.creci}</span>
        </div>
      </div>
    </footer>
  );
}
