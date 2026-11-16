"use client";

import { createContext, use, useEffect, useState, type FormEvent, type ReactNode } from "react";
import type { Imovel } from "@/lib/imoveis";
import { LIMITES, mascararTelefone } from "@/lib/interesse/validacao";
import { ANCORA_AGENDAR } from "@/lib/routes";
import { FormularioInteresse, type InicioInteresse } from "./FormularioInteresse";

type Agendar = { aberto: boolean; abrir: (inicio?: InicioInteresse) => void };

const AgendarContext = createContext<Agendar | null>(null);

function useAgendar(quem: string): Agendar {
  const ctx = use(AgendarContext);
  if (!ctx) throw new Error(`${quem} precisa estar dentro de AgendarProvider`);
  return ctx;
}

/** Estado do formulário de interesse, aberto pela ficha ou pelo formulário curto. */
export function AgendarProvider({ imovel, children }: { imovel: Imovel; children: ReactNode }) {
  const [aberto, setAberto] = useState(false);
  // Cada abertura pelo formulário curto recomeça o formulário com o que a pessoa já digitou.
  const [inicio, setInicio] = useState<{ vez: number; campos?: InicioInteresse }>({ vez: 0 });

  // /imovel/cz1009#agendar (AGENDAR VISITA da Home) chega com o formulário aberto.
  useEffect(() => {
    if (window.location.hash !== `#${ANCORA_AGENDAR}`) return;
    history.replaceState(history.state, "", window.location.pathname + window.location.search);
    setAberto(true); // eslint-disable-line react-hooks/set-state-in-effect -- sincroniza com a URL, só existe no cliente
  }, []);

  function abrir(campos?: InicioInteresse) {
    if (campos) setInicio((i) => ({ vez: i.vez + 1, campos }));
    setAberto(true);
  }

  return (
    <AgendarContext value={{ aberto, abrir }}>
      {children}
      <FormularioInteresse key={inicio.vez} imovel={imovel} inicio={inicio.campos} aberto={aberto} onFechar={() => setAberto(false)} />
    </AgendarContext>
  );
}

export function BotaoAgendar({ id }: { id: string }) {
  const ctx = useAgendar("BotaoAgendar");
  return (
    <button id={id} type="button" className="im-cta" aria-haspopup="dialog" aria-expanded={ctx.aberto} onClick={() => ctx.abrir()}>
      AGENDAR VISITA
    </button>
  );
}

/**
 * Formulário curto do card lateral ("Ou deixe seu contato"): nome e telefone. O envio continua
 * no formulário de interesse, que abre com os dois campos preenchidos e pede o e-mail; a
 * validação e o envio do lead são os de sempre.
 */
export function FormularioCurto() {
  const ctx = useAgendar("FormularioCurto");
  const [nome, setNome] = useState("");
  const [telefone, setTelefone] = useState("");

  function enviar(e: FormEvent) {
    e.preventDefault();
    ctx.abrir({ nome: nome.trim(), telefone });
  }

  return (
    <form className="im-curto" aria-labelledby="im-curto-titulo" noValidate onSubmit={enviar}>
      <span id="im-curto-titulo" className="im-resumo-lbl">
        Ou deixe seu contato
      </span>
      <input
        type="text"
        name="nome"
        autoComplete="name"
        placeholder="Nome"
        aria-label="Nome"
        value={nome}
        onChange={(e) => setNome(e.target.value.slice(0, LIMITES.nome))}
      />
      <input
        type="tel"
        name="telefone"
        autoComplete="tel-national"
        placeholder="Telefone"
        aria-label="Telefone"
        value={telefone}
        onChange={(e) => setTelefone(mascararTelefone(e.target.value))}
      />
      <button type="submit" className="im-cta im-cta-linha" aria-haspopup="dialog">
        TENHO INTERESSE
      </button>
    </form>
  );
}
