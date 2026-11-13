"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import { painel } from "@/lib/routes";
import { empresa, linkTelefone, linkWhatsApp } from "@/lib/site";

export type MenuItem = { label: string; href: string; current: boolean };

export const IconeFechar = ({ cor = "#0F1D24" }: { cor?: string }) => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={cor} strokeWidth="1.6" aria-hidden="true">
    <path d="M6 6l12 12M18 6L6 18" />
  </svg>
);

/**
 * Menu abaixo de 900px: botão no cabeçalho que abre o menu em tela cheia, com os
 * contatos que saíram da barra de utilidades (telefone, WhatsApp e CRECI).
 */
export function MenuDrawer({ items }: { items: MenuItem[] }) {
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
        className="cz-hamb"
        aria-label="Abrir menu"
        aria-expanded={aberto}
        onClick={() => setAberto(true)}
      >
        <span />
        <span />
      </button>
      {aberto && (
        <Portal>
          <div ref={painelRef} className="cz-menu" role="dialog" aria-modal="true" aria-label="Menu">
            <button className="cz-menu-fechar" type="button" aria-label="Fechar menu" onClick={fechar}>
              <IconeFechar cor="currentColor" />
            </button>
            <nav aria-label="Principal (mobile)">
              <ul className="cz-menu-lista">
                {items.map((item) => (
                  <li key={item.href}>
                    <Link href={item.href} aria-current={item.current ? "page" : undefined} onClick={fechar}>
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
            <div className="cz-menu-acoes">
              <a href={linkWhatsApp()} className="cz-btn-champanhe" onClick={fechar}>
                Falar no WhatsApp
              </a>
              <Link href={painel.entrar} className="cz-btn-linha" onClick={fechar}>
                SOU CORRETOR
              </Link>
            </div>
            <p className="cz-menu-contatos">
              <a href={linkTelefone()}>{empresa.telefone}</a> · {empresa.creci}
            </p>
          </div>
        </Portal>
      )}
    </>
  );
}
