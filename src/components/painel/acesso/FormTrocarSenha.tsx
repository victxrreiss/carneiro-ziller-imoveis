"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { sairAction, trocarSenhaObrigatoriaAction, type EstadoTrocaObrigatoria } from "@/app/painel/_acoes/acesso";
import { SENHA_MINIMO } from "@/lib/seguranca/politica";
import { IcConta } from "../Icones";
import { CampoSenha, RequisitoSenha } from "../ui";

const MINIMO = SENHA_MINIMO;

/** Primeiro acesso com senha provisória: a pessoa cria a própria senha antes de usar o painel. */
export function FormTrocarSenha({ email }: { email: string }) {
  const [estado, acao, enviando] = useActionState<EstadoTrocaObrigatoria, FormData>(trocarSenhaObrigatoriaAction, { erros: {}, tentativa: 0 });
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const novaRef = useRef<HTMLInputElement>(null);
  const confRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (estado.tentativa) {
      if (estado.erros.nova) novaRef.current?.focus();
      else if (estado.erros.confirmacao) confRef.current?.focus();
    }
  }, [estado]);

  const erros = estado.erros;
  const tentou = estado.tentativa > 0;
  return (
    <>
      <h1 className="pn-auth-title">Crie sua senha</h1>
      <p className="pn-auth-intro">Você entrou com uma senha provisória. Crie a senha que vai usar daqui em diante; ela precisa ser diferente da provisória.</p>
      <div className="pn-account-line">
        <IcConta size={18} stroke="#6D6E71" />
        <span>
          Conta <strong>{email}</strong>
        </span>
      </div>
      <form action={acao} noValidate aria-busy={enviando}>
        {/* Para o gerenciador de senhas salvar o par certo. */}
        <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
        <div className="im-field" style={{ gap: 8 }}>
          <CampoSenha
            id="pn-nova"
            nome="nova"
            rotulo="NOVA SENHA"
            rotuloMostrar="Mostrar nova senha"
            autoComplete="new-password"
            valor={nova}
            onChange={setNova}
            desabilitado={enviando}
            erro={erros.nova}
            descritoPor="pn-reqs"
            inputRef={novaRef}
          />
          <RequisitoSenha id="pn-reqs" tamanho={nova.length} minimo={MINIMO} tentou={tentou && nova.length < MINIMO} />
        </div>
        <CampoSenha
          id="pn-conf"
          nome="confirmacao"
          rotulo="CONFIRME A NOVA SENHA"
          rotuloMostrar="Mostrar confirmação"
          autoComplete="new-password"
          valor={confirmacao}
          onChange={setConfirmacao}
          desabilitado={enviando}
          erro={erros.confirmacao}
          inputRef={confRef}
        />
        <button type="submit" className="btn" disabled={enviando}>
          {enviando ? "SALVANDO…" : "SALVAR SENHA"}
          {enviando && <span className="im-progress" aria-hidden="true" />}
        </button>
        <span className="sr-only" aria-live="polite">
          {enviando ? "Salvando a senha…" : ""}
        </span>
      </form>
      <form action={sairAction} style={{ marginTop: 12, textAlign: "center" }}>
        <button type="submit" className="pn-link">
          Sair
        </button>
      </form>
    </>
  );
}
