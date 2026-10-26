"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { esqueciAction, type EstadoEsqueci } from "@/app/painel/_acoes/acesso";
import { painel } from "@/lib/routes";
import { IcEmail, IcRelogio } from "../Icones";
import { ErroCampo } from "../ui";

function Formulario({ onEnviado }: { onEnviado: () => void }) {
  const [estado, acao, enviando] = useActionState<EstadoEsqueci, FormData>(esqueciAction, { email: "", enviado: false });
  const [email, setEmail] = useState("");
  const campoRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado.enviado) onEnviado();
    else if (estado.erro) campoRef.current?.focus();
  }, [estado, onEnviado]);

  return (
    <>
      <h1 className="pn-auth-title">Esqueci minha senha</h1>
      <p className="pn-auth-intro">Informe o e-mail do seu acesso. Vamos enviar um link para você definir uma nova senha.</p>
      <form action={acao} noValidate aria-busy={enviando}>
        <div className={estado.erro ? "im-field is-invalid" : "im-field"}>
          <label className="im-lbl" htmlFor="pn-email">
            E-MAIL
          </label>
          <input
            ref={campoRef}
            id="pn-email"
            name="email"
            className="im-input"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={enviando}
            aria-invalid={estado.erro ? true : undefined}
            aria-describedby={estado.erro ? "pn-email-err" : undefined}
          />
          {estado.erro && <ErroCampo id="pn-email-err">{estado.erro}</ErroCampo>}
        </div>
        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? "ENVIANDO…" : "ENVIAR LINK"}
          {enviando && <span className="im-progress" aria-hidden="true" />}
        </button>
        <span className="sr-only" aria-live="polite">
          {enviando ? "Enviando…" : ""}
        </span>
      </form>
      <div className="pn-auth-row" style={{ justifyContent: "center" }}>
        <Link className="pn-link" href={painel.entrar}>
          Voltar para entrar
        </Link>
      </div>
    </>
  );
}

export function FormEsqueci() {
  const [enviado, setEnviado] = useState(false);
  // Trocar a chave recomeça o formulário vazio ("Enviar para outro e-mail").
  const [rodada, setRodada] = useState(0);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (enviado) tituloRef.current?.focus();
  }, [enviado]);

  if (!enviado) return <Formulario key={rodada} onEnviado={() => setEnviado(true)} />;

  return (
    <>
      <div className="pn-icon-ring">
        <IcEmail stroke="#0F1D24" />
      </div>
      <h1 ref={tituloRef} className="pn-auth-title" tabIndex={-1}>
        Verifique seu e-mail
      </h1>
      <p className="pn-auth-intro" style={{ marginTop: -6 }}>
        Se o e-mail estiver cadastrado, você vai receber um link para definir uma nova senha.
      </p>
      <div className="pn-alert is-soft">
        <IcRelogio size={18} stroke="#0F1D24" width={1.6} />
        <div>
          <p>O link vale por 1 hora. Se não aparecer em alguns minutos, olhe a caixa de spam ou peça de novo.</p>
        </div>
      </div>
      <Link className="btn" href={painel.entrar} style={{ width: "100%", minHeight: 52 }}>
        VOLTAR PARA ENTRAR
      </Link>
      <div className="pn-auth-row" style={{ justifyContent: "center" }}>
        <button
          type="button"
          className="pn-link"
          onClick={() => {
            setEnviado(false);
            setRodada((r) => r + 1);
          }}
        >
          Enviar para outro e-mail
        </button>
      </div>
    </>
  );
}
