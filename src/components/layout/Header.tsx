import Link from "next/link";
import { navItems, painel, routes, type NavKey } from "@/lib/routes";
import { Logo } from "./Logo";
import { MenuDrawer } from "./MenuDrawer";

/** Header da Home, dentro do hero. As outras telas usam o SiteHeader. */
export function Header({ current }: { current: NavKey }) {
  const items = navItems.map((item) => ({ ...item, current: item.key === current }));

  return (
    <header className="relative z-3">
      <div className="mx-auto flex box-content max-w-310 flex-wrap items-center justify-between gap-x-8 gap-y-4.5 px-6 py-6.5">
        <Link href={routes.home} className="flex">
          <Logo />
        </Link>
        <nav aria-label="Principal" className="flex flex-wrap gap-x-8.5 gap-y-2 text-sm font-medium max-[900px]:hidden">
          {items.map((item) => (
            <Link
              key={item.key}
              href={item.href}
              aria-current={item.current ? "page" : undefined}
              className={`pb-1.5 transition-colors duration-200 hover:text-vinho ${
                item.current ? "border-b-2 border-vinho text-azul-noite" : "text-grafite"
              }`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <Link
          href={painel.entrar}
          className="bg-azul-noite px-6.5 py-4 text-xs font-semibold tracking-[0.2em] text-white transition-colors duration-200 hover:bg-azul-noite-hover max-[900px]:hidden"
        >
          SOU CORRETOR
        </Link>
        <div className="min-[900px]:hidden">
          <MenuDrawer
            items={items}
            buttonClassName="flex h-11 w-11 cursor-pointer items-center justify-center border border-areia bg-transparent"
          />
        </div>
      </div>
    </header>
  );
}
