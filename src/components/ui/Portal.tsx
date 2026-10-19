"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

const semAssinatura = () => () => {};

/**
 * Renderiza direto no <body>, dentro de um `.cz` (escopo dos estilos do site),
 * para diálogos poderem deixar o resto da página `inert`.
 */
export function Portal({ children }: { children: ReactNode }) {
  const montado = useSyncExternalStore(
    semAssinatura,
    () => true,
    () => false,
  );
  if (!montado) return null;
  return createPortal(<div className="cz cz-portal">{children}</div>, document.body);
}
