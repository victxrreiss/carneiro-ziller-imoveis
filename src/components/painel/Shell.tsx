"use client";

// Estrutura do painel: menu lateral no desktop; barra superior + gaveta no mobile.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef, useState, type ReactNode } from "react";
import { sairAction } from "@/app/painel/_acoes/acesso";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import type { Papel } from "@/lib/dados/tipos";
import { painel } from "@/lib/routes";
import { IcConta, IcFechar, IcImoveis, IcMenu, IcSair, IcUsuarios } from "./Icones";
import { Marca } from "./ui";

export type UsuarioShell = { nome: string; papel: Papel };

const iniciais = (nome: string) =>
  nome
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((p) => p[0])
    .filter((_, i, a) => i === 0 || i === a.length - 1)
    .join("")
    .toUpperCase();

function Itens({ usuario, onNavegar }: { usuario: UsuarioShell; onNavegar?: () => void }) {
  const caminho = usePathname();
  const atual = (base: string) => (caminho === base || caminho.startsWith(`${base}/`) ? "page" : undefined);
  return (
    <ul className="pn-nav">
      <li>
        <Link href={painel.imoveis} aria-current={atual(painel.imoveis)} onClick={onNavegar}>
          <IcImoveis />
          Imóveis
        </Link>
      </li>
      {usuario.papel === "admin" && (
        <li>
          <Link href={painel.usuarios} aria-current={atual(painel.usuarios)} onClick={onNavegar}>
            <IcUsuarios />
            Usuários
          </Link>
        </li>
      )}
      <li>
        <Link href={painel.conta} aria-current={atual(painel.conta)} onClick={onNavegar}>
          <IcConta />
          Minha conta
        </Link>
      </li>
    </ul>
  );
}

function Usuario({ usuario }: { usuario: UsuarioShell }) {
  return (
    <>
      <div className="pn-user">
        <span className="pn-avatar" aria-hidden="true">
          {iniciais(usuario.nome)}
        </span>
        <span className="pn-user-txt">
          <span className="pn-user-name">{usuario.nome}</span>
          <span className="pn-user-role">{usuario.papel === "admin" ? "ADMIN" : "CORRETOR"}</span>
        </span>
      </div>
      <form action={sairAction}>
        <ul className="pn-nav" style={{ padding: 0 }}>
          <li>
            <button type="submit">
              <IcSair />
              Sair
            </button>
          </li>
        </ul>
      </form>
    </>
  );
}

function MenuMobile({ usuario }: { usuario: UsuarioShell }) {
  const [aberto, setAberto] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);
  const fechar = () => setAberto(false);
  useDialog({ aberto, onFechar: fechar, painelRef, retornoRef: botaoRef });
  return (
    <>
      <button ref={botaoRef} className="menu-btn" type="button" aria-label="Abrir menu" aria-expanded={aberto} onClick={() => setAberto(true)}>
        <IcMenu />
      </button>
      {aberto && (
        <Portal>
          <div className="scrim" onClick={fechar} />
          <div ref={painelRef} className="menu-drawer" role="dialog" aria-modal="true" aria-label="Menu do painel">
            <div className="drawer-head">
              <span className="drawer-title">MENU</span>
              <button className="icon-btn" type="button" aria-label="Fechar menu" onClick={fechar}>
                <IcFechar />
              </button>
            </div>
            <nav className="pn-drawer-nav" aria-label="Painel (mobile)">
              <Itens usuario={usuario} onNavegar={fechar} />
            </nav>
            <div className="pn-drawer-user">
              <Usuario usuario={usuario} />
            </div>
          </div>
        </Portal>
      )}
    </>
  );
}

export function Shell({ usuario, children }: { usuario: UsuarioShell; children: ReactNode }) {
  return (
    <>
      <a className="pn-skip" href="#pn-main">
        Pular para o conteúdo
      </a>
      <div className="pn-app">
        <aside className="pn-side" aria-label="Menu do painel">
          <div className="pn-brand">
            <Link href={painel.imoveis} className="logo" aria-label="Carneiro & Ziller — painel, início">
              <Marca />
            </Link>
            <span className="pn-brand-tag">PAINEL</span>
          </div>
          <nav aria-label="Painel">
            <Itens usuario={usuario} />
          </nav>
          <div className="pn-side-foot">
            <Usuario usuario={usuario} />
          </div>
        </aside>
        <div className="pn-main">
          <header className="pn-top">
            <Link href={painel.imoveis} className="logo" aria-label="Carneiro & Ziller — painel, início">
              <Marca />
            </Link>
            <div className="pn-top-r">
              <MenuMobile usuario={usuario} />
            </div>
          </header>
          <main className="pn-content" id="pn-main">
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
