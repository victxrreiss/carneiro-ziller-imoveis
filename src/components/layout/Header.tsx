import Link from "next/link";
import { temLancamentosParaMenu } from "@/lib/imoveis/lancamentos";
import { itensNavegacao, painel, routes, type NavKey } from "@/lib/routes";
import { Logo } from "./Logo";
import { MenuDrawer } from "./MenuDrawer";

type Variante = "solida" | "sobre-imagem";

const CLASSE: Record<Variante, string> = {
  solida: "cz-topo cz-topo-solido",
  "sobre-imagem": "cz-topo cz-topo-sobre-imagem",
};

/**
 * Cabeçalho do site. Sólido em azul-noite nas páginas internas; `sobre-imagem` fica
 * transparente por cima da abertura da Home (o pai precisa de `position: relative`).
 * Telefone e CRECI não ficam mais no topo: estão no rodapé e no menu do celular.
 */
export async function Header({ current, variante = "solida" }: { current?: NavKey; variante?: Variante }) {
  const items = itensNavegacao(await temLancamentosParaMenu()).map((item) => ({
    ...item,
    current: current !== undefined && item.key === current,
  }));

  return (
    <header className={CLASSE[variante]}>
      <div className="cz-topo-in">
        <Link href={routes.home} className="cz-topo-logo">
          <Logo forma="selo" variante="negativa" />
        </Link>
        <nav className="nav" aria-label="Principal">
          {items.map((item) => (
            <Link key={item.key} href={item.href} aria-current={item.current ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="cz-topo-acoes">
          <Link href={painel.entrar} className="cz-btn-linha cz-topo-corretor">
            SOU CORRETOR
          </Link>
          <MenuDrawer items={items} />
        </div>
      </div>
    </header>
  );
}
