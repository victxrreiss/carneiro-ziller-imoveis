"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import { crecis, unidades } from "@/lib/site";

export type MenuItem = { label: string; href: string; current: boolean };

const IconeMenu = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.6" aria-hidden="true">
    <path d="M3 7h18M3 12h18M3 17h18" />
  </svg>
);

export const IconeFechar = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.6" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/** Menu abaixo de 900px: gaveta à direita (padrão do grid e do Imóvel). */
export function MenuDrawer({ items, buttonClassName }: { items: MenuItem[]; buttonClassName: string }) {
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fechar = () => setAberto(false);
  useDialog({ aberto, onFechar: fechar, painelRef, retornoRef: botaoRef });

  return (
    <>
      <button
        ref={botaoRef}
        type="button"
        className={buttonClassName}
        aria-label="Abrir menu"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        <IconeMenu />
      </button>
      {aberto && (
        <Portal>
          <div className="scrim" data-testid="menu-scrim" onClick={fechar} />
          <div ref={painelRef} className="menu-drawer" role="dialog" aria-modal="true" aria-label="Menu">
            <div className="drawer-head">
              <span className="drawer-title">MENU</span>
              <button className="icon-btn" type="button" aria-label="Fechar menu" onClick={fechar}>
                <IconeFechar />
              </button>
            </div>
            <nav aria-label="Principal (mobile)">
              <ul className="menu-list">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={item.current ? "page" : undefined} onClick={fechar}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="menu-contacts">
              {unidades.carneiro.nome} · {unidades.carneiro.telefone}
              <br />
              {unidades.ziller.nome} · {unidades.ziller.telefone}
              <br />
              <span style={{ color: "#6D6E71" }}>{crecis}</span>
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}
