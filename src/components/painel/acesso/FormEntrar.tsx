"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { entrarAction, type EstadoEntrar } from "@/app/painel/_acoes/acesso";
import { painel } from "@/lib/routes";
import { IcCadeado, IcErro, IcRelogio } from "../Icones";
import { CampoSenha, ErroCampo } from "../ui";

export function FormEntrar({ sessaoExpirada, voltar }: { sessaoExpirada: boolean; voltar?: string }) {
  const [estado, acao, enviando] = useActionState<EstadoEntrar, FormData>(entrarAction, { email: "", tentativa: 0 });
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const emailRef = useRef<HTMLInputElement>(null);
  const senhaRef = useRef<HTMLInputElement>(null);
  const bloqueado = !!estado.bloqueado;

  // Nova resposta com erro de credenciais ou bloqueio: limpa a senha.
  const [tentativaVista, setTentativaVista] = useState(0);
  if (estado.tentativa !== tentativaVista) {
    setTentativaVista(estado.tentativa);
    if (estado.credenciais || estado.bloqueado) setSenha("");
  }

  // E leva o foco ao campo certo.
  useEffect(() => {
    if (!estado.tentativa || estado.bloqueado) return;
    if (estado.erroEmail) emailRef.current?.focus();
    else if (estado.erroSenha || estado.credenciais) senhaRef.current?.focus();
  }, [estado]);

  const travado = enviando || bloqueado;
  const mostrarExpirada = sessaoExpirada && !estado.tentativa;

  return (
    <>
      {mostrarExpirada && (
        <div className="pn-alert" role="status">
          <IcRelogio stroke="#0F1D24" width={1.6} />
          <div>
            <strong>Sua sessão expirou</strong>
            <p>Por segurança, você saiu depois de um tempo sem usar o painel. Entre de novo para voltar à página em que estava.</p>
          </div>
        </div>
      )}

      <h1 className="pn-auth-title">Entrar</h1>
      <p className="pn-auth-intro">Acesso exclusivo da equipe Carneiro &amp; Ziller.</p>

      {estado.credenciais && !bloqueado && (
        <div className="pn-alert is-error" role="alert">
          <IcErro size={20} width={1.6} />
          <div>
            <strong>E-mail ou senha incorretos.</strong>
            <p>Confira os dados e tente de novo.</p>
          </div>
        </div>
      )}

      {bloqueado && (
        <div className="pn-alert is-error" role="alert">
          <IcCadeado stroke="#78323D" width={1.6} />
          <div>
            <strong>Acesso bloqueado por alguns minutos</strong>
            <p>Foram várias tentativas sem sucesso. Por segurança, espere 15 minutos para tentar de novo ou redefina sua senha.</p>
            <div className="pn-alert-actions">
              <Link className="pn-link" href={painel.esqueci}>
                Redefinir minha senha
              </Link>
            </div>
          </div>
        </div>
      )}

      <form action={acao} noValidate aria-busy={enviando}>
        {voltar && <input type="hidden" name="voltar" value={voltar} />}
        <div className={estado.erroEmail ? "im-field is-invalid" : "im-field"}>
          <label className="im-lbl" htmlFor="pn-email">
            E-MAIL
          </label>
          <input
            ref={emailRef}
            id="pn-email"
            name="email"
            className="im-input"
            type="email"
            autoComplete="username"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            readOnly={travado}
            aria-invalid={estado.erroEmail ? true : undefined}
            aria-describedby={estado.erroEmail ? "pn-email-err" : undefined}
          />
          {estado.erroEmail && <ErroCampo id="pn-email-err">{estado.erroEmail}</ErroCampo>}
        </div>

        <CampoSenha
          id="pn-senha"
          nome="senha"
          rotulo="SENHA"
          autoComplete="current-password"
          valor={senha}
          onChange={setSenha}
          desabilitado={bloqueado}
          erro={estado.erroSenha}
          inputRef={senhaRef}
        />

        <div className="pn-auth-row">
          <Link className="pn-link" href={painel.esqueci}>
            Esqueci minha senha
          </Link>
        </div>

        <button type="submit" className="btn" disabled={travado}>
          {enviando ? "ENTRANDO…" : bloqueado ? "TENTE DE NOVO EM 15 MIN" : "ENTRAR"}
          {enviando && <span className="im-progress" aria-hidden="true" />}
        </button>
        <span className="sr-only" aria-live="polite">
          {enviando ? "Entrando…" : ""}
        </span>
      </form>
    </>
  );
}
