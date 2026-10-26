import type { ReactNode } from "react";
import { Marca } from "../ui";

/** Telas de acesso: sem o menu do painel, só a marca e o cartão. */
export function CartaoAcesso({ children }: { children: ReactNode }) {
  return (
    <main className="pn-auth">
      <div className="pn-auth-brand">
        <span className="logo" role="img" aria-label="Carneiro & Ziller Imóveis">
          <Marca />
        </span>
        <span className="pn-brand-tag">PAINEL INTERNO</span>
      </div>
      <div className="pn-auth-card">{children}</div>
      <p className="pn-auth-foot">© 2026 Carneiro &amp; Ziller Imóveis · Uso restrito à equipe</p>
    </main>
  );
}
