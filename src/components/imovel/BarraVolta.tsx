"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { IcVoltar } from "@/components/ui/IconesSite";
import type { ContextoVolta } from "@/lib/imoveis/filtros";
import { podeVoltarPeloHistorico } from "@/lib/navegacao/retorno";
import { routes } from "@/lib/routes";

type Props = {
  volta: ContextoVolta;
  /** Seção do breadcrumb. */
  secao: { rotulo: string; href: string };
  /** "CÓD. CZ1009" quando a ficha está na tela. */
  codigo?: string;
};

/** "Voltar aos resultados" (com o resumo dos filtros) e breadcrumb. */
export function BarraVolta({ volta, secao, codigo }: Props) {
  return (
    <div className="im-back">
      <div className="wrap">
        <div className="im-back-left">
          <LinkVolta href={volta.href} className="im-back-link">
            <IcVoltar stroke="currentColor" width={1.6} />
            {volta.rotulo}
          </LinkVolta>
          {volta.resumo && <span className="im-filters">Filtros: {volta.resumo}</span>}
        </div>
        <nav className="crumbs" aria-label="Você está em">
          <Link href={routes.home}>Home</Link>
          <span className="sep" aria-hidden="true">
            /
          </span>
          <Link href={secao.href}>{secao.rotulo}</Link>
          {codigo && (
            <>
              <span className="sep" aria-hidden="true">
                /
              </span>
              <span aria-current="page">{codigo}</span>
            </>
          )}
        </nav>
      </div>
    </div>
  );
}

/**
 * Link para o grid. Se a pessoa veio dele, volta pelo histórico para o
 * navegador restaurar a página e a rolagem; senão, navega normalmente.
 */
export function LinkVolta({ href, className, children }: { href: string; className: string; children: React.ReactNode }) {
  const router = useRouter();
  function onClick(e: MouseEvent<HTMLAnchorElement>) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
    if (!podeVoltarPeloHistorico(href, window.location.pathname)) return;
    e.preventDefault();
    router.back();
  }
  return (
    <Link href={href} className={className} onClick={onClick}>
      {children}
    </Link>
  );
}
