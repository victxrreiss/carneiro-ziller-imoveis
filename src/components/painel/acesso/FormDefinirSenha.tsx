"use client";

import Link from "next/link";
import { useActionState, useEffect, useRef, useState } from "react";
import { definirSenhaAction, type EstadoDefinirSenha } from "@/app/painel/_acoes/acesso";
import type { TipoToken } from "@/lib/dados/tipos";
import { painel } from "@/lib/routes";
import { SENHA_MINIMO } from "@/lib/seguranca/politica";
import { IcCheck, IcConta } from "../Icones";
import { CampoSenha, RequisitoSenha } from "../ui";

const MINIMO = SENHA_MINIMO;

/** Link expirado, já usado ou inválido. Convite: só o ADMIN gera outro. */
export function LinkInvalido({ tipo }: { tipo: TipoToken | null }) {
  return (
    <>
      <div className="pn-icon-ring">
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#78323D" strokeWidth="1.4" aria-hidden="true">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
          <path d="M4 4l16 16" />
        </svg>
      </div>
      <h1 className="pn-auth-title">Este link não vale mais</h1>
      <p className="pn-auth-intro" style={{ marginTop: -6 }}>
        O link expirou ou já foi usado. Por segurança, cada link serve uma única vez e tem prazo de validade.
      </p>
      {tipo === "convite" ? (
        <div className="pn-alert is-soft">
          <IcConta size={18} stroke="#0F1D24" />
          <div>
            <p>Peça ao administrador da Carneiro &amp; Ziller para reenviar o seu convite. O novo e-mail chega com um link válido por 72 horas.</p>
          </div>
        </div>
      ) : (
        <Link className="btn" href={painel.esqueci} style={{ width: "100%", minHeight: 52 }}>
          PEDIR UM NOVO LINK
        </Link>
      )}
      <div className="pn-auth-row" style={{ justifyContent: "center" }}>
        <Link className="pn-link" href={painel.entrar}>
          Voltar para entrar
        </Link>
      </div>
    </>
  );
}

export function FormDefinirSenha({ token, tipo, email }: { token: string; tipo: TipoToken; email: string }) {
  const [estado, acao, enviando] = useActionState<EstadoDefinirSenha, FormData>(definirSenhaAction, {
    situacao: "form",
    erros: {},
    tentativa: 0,
  });
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const novaRef = useRef<HTMLInputElement>(null);
  const confRef = useRef<HTMLInputElement>(null);
  const tituloRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    if (estado.situacao === "form" && estado.tentativa) {
      if (estado.erros.nova) novaRef.current?.focus();
      else if (estado.erros.confirmacao) confRef.current?.focus();
    } else if (estado.situacao === "sucesso") tituloRef.current?.focus();
  }, [estado]);

  if (estado.situacao === "expirado") return <LinkInvalido tipo={estado.tipo ?? tipo} />;

  if (estado.situacao === "sucesso") {
    return (
      <>
        <div className="pn-icon-ring">
          <IcCheck size={26} width={1.6} stroke="#0F1D24" />
        </div>
        <h1 ref={tituloRef} className="pn-auth-title" tabIndex={-1}>
          Senha definida
        </h1>
        <p className="pn-auth-intro" style={{ marginTop: -6 }}>
          Pronto. Agora entre com o e-mail <strong style={{ color: "#0F1D24", fontWeight: 600 }}>{estado.email}</strong> e a senha que você
          acabou de criar.
        </p>
        <Link className="btn" href={painel.entrar} style={{ width: "100%", minHeight: 52 }}>
          IR PARA ENTRAR
        </Link>
      </>
    );
  }

  const erros = estado.erros;
  const tentou = estado.tentativa > 0;
  return (
    <>
      <h1 className="pn-auth-title">{tipo === "convite" ? "Crie sua senha" : "Crie uma nova senha"}</h1>
      <p className="pn-auth-intro">Defina a senha que você vai usar para entrar no painel.</p>
      <div className="pn-account-line">
        <IcConta size={18} stroke="#6D6E71" />
        <span>
          Conta <strong>{email}</strong>
        </span>
      </div>
      <form action={acao} noValidate aria-busy={enviando}>
        <input type="hidden" name="token" value={token} />
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
    </>
  );
}
