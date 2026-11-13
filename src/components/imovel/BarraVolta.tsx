"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent } from "react";
import { IcVoltar } from "@/components/ui/IconesSite";
import type { ContextoVolta } from "@/lib/imoveis/filtros";
import { podeVoltarPeloHistorico } from "@/lib/navegacao/retorno";

type Props = {
  volta: ContextoVolta;
  /** "CÓD. CZ1009" quando a ficha está na tela. */
  codigo?: string;
};

/** Linha discreta acima da galeria: "Voltar aos resultados" (com o resumo dos filtros) e o código do imóvel. */
export function BarraVolta({ volta, codigo }: Props) {
  return (
    <div className="im-back">
      <div className="wrap">
        <div className="im-back-left">
          <LinkVolta href={volta.href} className="im-back-link">
            <IcVoltar size={16} stroke="currentColor" width={1.4} />
            {volta.rotulo}
          </LinkVolta>
          {volta.resumo && <span className="im-filters">Filtros: {volta.resumo}</span>}
        </div>
        {codigo && <span className="im-back-cod">{codigo}</span>}
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
