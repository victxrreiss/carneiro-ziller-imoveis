import Link from "next/link";
import type { ReactNode } from "react";
import { navItems, routes, type NavKey } from "@/lib/routes";
import { crecis, unidades } from "@/lib/site";
import { Footer } from "./Footer";
import { Logo } from "./Logo";
import { MenuDrawer } from "./MenuDrawer";

export function Topbar() {
  return (
    <div className="topbar">
      <div className="wrap">
        <div className="units">
          <span>
            {unidades.carneiro.nome} · {unidades.carneiro.telefone}
          </span>
          <span>
            {unidades.ziller.nome} · {unidades.ziller.telefone}
          </span>
        </div>
        <div className="creci">{crecis}</div>
      </div>
    </div>
  );
}

export function SiteHeader({ current }: { current: NavKey }) {
  const items = navItems.map((item) => ({ ...item, current: item.key === current }));
  return (
    <header className="site-header">
      <div className="wrap">
        <Link href={routes.home} className="logo">
          <Logo />
        </Link>
        <nav className="nav" aria-label="Principal">
          {items.map((item) => (
            <Link key={item.key} href={item.href} aria-current={item.current ? "page" : undefined}>
              {item.label}
            </Link>
          ))}
        </nav>
        <MenuDrawer items={items} buttonClassName="menu-btn" />
      </div>
    </header>
  );
}

/**
 * Moldura das telas internas (grid e imóvel): barra superior, header, conteúdo
 * e rodapé, sob o escopo `.cz` dos estilos do handoff.
 */
export function SiteChrome({
  current,
  className,
  children,
}: {
  current: NavKey;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={className ? `cz ${className}` : "cz"}>
      <Topbar />
      <SiteHeader current={current} />
      {children}
      <Footer />
    </div>
  );
}
