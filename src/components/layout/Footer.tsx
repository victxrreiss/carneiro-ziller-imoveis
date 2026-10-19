import Link from "next/link";
import { InstagramIcon, LinkedInIcon } from "@/components/ui/Icons";
import { navItems, routes } from "@/lib/routes";
import { crecis, social, unidades } from "@/lib/site";
import { Logo } from "./Logo";

const footerNav = [...navItems, { key: "privacidade", label: "Política de privacidade", href: routes.privacidade }];

/** Rodapé do site (versão do grid/Imóvel). Precisa de um ancestral `.cz`. */
export function Footer() {
  const { carneiro, ziller } = unidades;
  return (
    <footer className="footer">
      <div className="wrap">
        <div className="f-col" style={{ gap: 22 }}>
          <Link href={routes.home} className="logo">
            <Logo variant="negative" />
          </Link>
          <p style={{ margin: 0 }}>Imóveis em Belo Horizonte e Nova Lima.</p>
          <div className="social">
            <a href={social.instagram} aria-label="Instagram">
              <InstagramIcon size={18} color="#E7E4DC" />
            </a>
            <a href={social.linkedin} aria-label="LinkedIn">
              <LinkedInIcon size={18} color="#E7E4DC" />
            </a>
          </div>
        </div>
        <div className="f-col">
          <div className="f-h">UNIDADE CARNEIRO</div>
          <span>{carneiro.creci}</span>
          <span>{carneiro.telefone}</span>
          <a href={`mailto:${carneiro.email}`}>{carneiro.email}</a>
          <span>
            {carneiro.endereco[0]}
            <br />
            {carneiro.endereco[1]}
          </span>
        </div>
        <div className="f-col">
          <div className="f-h">UNIDADE ZILLER</div>
          <span>{ziller.creci}</span>
          <span>{ziller.telefone}</span>
          <a href={`mailto:${ziller.email}`}>{ziller.email}</a>
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
          <span>{crecis}</span>
        </div>
      </div>
    </footer>
  );
}
