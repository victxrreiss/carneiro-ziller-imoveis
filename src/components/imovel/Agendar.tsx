"use client";

import { createContext, use, useEffect, useState, type ReactNode } from "react";
import type { Imovel } from "@/lib/imoveis";
import { ANCORA_AGENDAR } from "@/lib/routes";
import { FormularioInteresse } from "./FormularioInteresse";

type Agendar = { aberto: boolean; abrir: () => void };

const AgendarContext = createContext<Agendar | null>(null);

/** Estado do formulário de interesse, aberto pela ficha ou pela barra fixa. */
export function AgendarProvider({ imovel, children }: { imovel: Imovel; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);

  // /imovel/cz1009#agendar (AGENDAR VISITA da Home) chega com o formulário aberto.
  useEffect(() => {
    if (window.location.hash !== `#${ANCORA_AGENDAR}`) return;
    history.replaceState(history.state, "", window.location.pathname + window.location.search);
    setAberto(true); // eslint-disable-line react-hooks/set-state-in-effect -- sincroniza com a URL, só existe no cliente
  }, []);

  return (
    <AgendarContext value={{ aberto, abrir: () => setAberto(true) }}>
      {children}
      <FormularioInteresse imovel={imovel} aberto={aberto} onFechar={() => setAberto(false)} />
    </AgendarContext>
  );
}

export function BotaoAgendar({ id }: { id: string }) {
  const ctx = use(AgendarContext);
  if (!ctx) throw new Error("BotaoAgendar precisa estar dentro de AgendarProvider");
  return (
    <button id={id} type="button" className="im-cta" aria-haspopup="dialog" aria-expanded={ctx.aberto} onClick={ctx.abrir}>
      AGENDAR VISITA
    </button>
  );
}
