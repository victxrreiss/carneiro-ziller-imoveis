"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState, useTransition } from "react";
import { salvarMeuNomeAction, trocarSenhaAction } from "@/app/painel/_acoes/usuarios";
import type { Papel } from "@/lib/dados/tipos";
import type { ErrosTrocaSenha } from "@/lib/painel/contas";
import { painel } from "@/lib/routes";
import { SENHA_MINIMO } from "@/lib/seguranca/politica";
import { IcCheck } from "../Icones";
import { CampoSenha, ErroCampo, RequisitoSenha } from "../ui";

function Dados({ nome: inicial, email, papel }: { nome: string; email: string; papel: Papel }) {
  const router = useRouter();
  const [nome, setNome] = useState(inicial);
  const [erro, setErro] = useState<string | null>(null);
  const [salvo, setSalvo] = useState(false);
  const [salvando, iniciar] = useTransition();
  const ref = useRef<HTMLInputElement>(null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setSalvo(false);
    iniciar(async () => {
      try {
        const r = await salvarMeuNomeAction(nome);
        if (!r.ok) {
          setErro(r.erro);
          ref.current?.focus();
          return;
        }
        setErro(null);
        setSalvo(true);
        router.refresh();
      } catch {
        setErro("Não foi possível salvar. Tente de novo.");
      }
    });
  }

  return (
    <section className="pn-section" aria-labelledby="pn-c1">
      <div className="pn-section-h">
        <h2 id="pn-c1">Seus dados</h2>
      </div>
      <form noValidate onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 20, margin: 0 }} aria-busy={salvando}>
        <div className={erro ? "im-field is-invalid" : "im-field"}>
          <label className="im-lbl" htmlFor="pn-c-nome">
            NOME
          </label>
          <input
            ref={ref}
            id="pn-c-nome"
            className="im-input"
            type="text"
            autoComplete="name"
            maxLength={120}
            value={nome}
            onChange={(e) => {
              setNome(e.target.value);
              setSalvo(false);
            }}
            readOnly={salvando}
            aria-invalid={erro ? true : undefined}
            aria-describedby={["pn-c-nome-hint", erro ? "pn-c-nome-err" : ""].filter(Boolean).join(" ")}
          />
          <p className="pn-hint" id="pn-c-nome-hint">
            É assim que você aparece como responsável na lista de imóveis.
          </p>
          {erro && <ErroCampo id="pn-c-nome-err">{erro}</ErroCampo>}
        </div>
        <div className="pn-row is-2">
          <div className="im-field">
            <span className="im-lbl" id="pn-c-l-email">
              E-MAIL
            </span>
            <div className="pn-ro" aria-labelledby="pn-c-l-email" style={{ overflowWrap: "anywhere" }}>
              {email}
            </div>
          </div>
          <div className="im-field">
            <span className="im-lbl" id="pn-c-l-papel">
              PAPEL
            </span>
            <div className="pn-ro" aria-labelledby="pn-c-l-papel">
              {papel === "admin" ? "ADMIN" : "Corretor"}
            </div>
          </div>
        </div>
        <p className="pn-hint" style={{ marginTop: -8 }}>
          {papel === "admin" ? "O e-mail é o login e não pode ser alterado aqui." : "E-mail e papel só podem ser alterados pelo ADMIN."}
        </p>
        <div className="pn-form-foot">
          <button type="submit" className="btn" disabled={salvando}>
            {salvando ? "SALVANDO…" : "SALVAR"}
            {salvando && <span className="im-progress" aria-hidden="true" />}
          </button>
          {salvo && (
            <span className="pn-saved" role="status">
              <IcCheck stroke="#0F1D24" width={2} />
              Dados salvos.
            </span>
          )}
        </div>
      </form>
    </section>
  );
}

function Senha({ email }: { email: string }) {
  const [atual, setAtual] = useState("");
  const [nova, setNova] = useState("");
  const [confirmacao, setConfirmacao] = useState("");
  const [erros, setErros] = useState<ErrosTrocaSenha>({});
  const [tentou, setTentou] = useState(false);
  const [alterada, setAlterada] = useState(false);
  const [salvando, iniciar] = useTransition();
  const atualRef = useRef<HTMLInputElement>(null);
  const novaRef = useRef<HTMLInputElement>(null);
  const confRef = useRef<HTMLInputElement>(null);

  function salvar(e: React.FormEvent) {
    e.preventDefault();
    setAlterada(false);
    setTentou(true);
    iniciar(async () => {
      try {
        const r = await trocarSenhaAction(atual, nova, confirmacao);
        if (!r.ok) {
          setErros(r.erros);
          (r.erros.atual ? atualRef : r.erros.nova ? novaRef : confRef).current?.focus();
          return;
        }
        setErros({});
        setTentou(false);
        setAtual("");
        setNova("");
        setConfirmacao("");
        setAlterada(true);
      } catch {
        setErros({ atual: "Não foi possível alterar a senha. Tente de novo." });
      }
    });
  }

  return (
    <section className="pn-section" aria-labelledby="pn-c2">
      <div className="pn-section-h">
        <h2 id="pn-c2">Senha</h2>
        <p>Para trocar, confirme a senha atual e crie uma nova.</p>
      </div>
      {alterada && (
        <div className="pn-alert" role="status">
          <IcCheck size={20} stroke="#0F1D24" />
          <div>
            <strong>Senha alterada</strong>
            <p>A partir de agora, use a nova senha para entrar no painel.</p>
          </div>
        </div>
      )}
      <form noValidate onSubmit={salvar} style={{ display: "flex", flexDirection: "column", gap: 20, margin: 0 }} aria-busy={salvando}>
        <input type="email" name="usuario" autoComplete="username" value={email} readOnly hidden />
        <CampoSenha
          id="pn-c-atual"
          nome="atual"
          rotulo="SENHA ATUAL"
          autoComplete="current-password"
          valor={atual}
          onChange={(v) => {
            setAtual(v);
            setAlterada(false);
          }}
          desabilitado={salvando}
          erro={erros.atual}
          inputRef={atualRef}
        />
        <div className="pn-row is-2">
          <CampoSenha
            id="pn-c-nova"
            nome="nova"
            rotulo="NOVA SENHA"
            autoComplete="new-password"
            valor={nova}
            onChange={setNova}
            desabilitado={salvando}
            erro={erros.nova}
            descritoPor="pn-c-reqs"
            inputRef={novaRef}
          />
          <CampoSenha
            id="pn-c-conf"
            nome="confirmacao"
            rotulo="CONFIRME A NOVA SENHA"
            rotuloMostrar="Mostrar confirmação"
            autoComplete="new-password"
            valor={confirmacao}
            onChange={setConfirmacao}
            desabilitado={salvando}
            erro={erros.confirmacao}
            inputRef={confRef}
          />
        </div>
        <RequisitoSenha id="pn-c-reqs" tamanho={nova.length} minimo={SENHA_MINIMO} tentou={tentou && nova.length < SENHA_MINIMO} />
        <div className="pn-form-foot">
          <button type="submit" className="btn" disabled={salvando}>
            {salvando ? "ALTERANDO…" : "ALTERAR SENHA"}
            {salvando && <span className="im-progress" aria-hidden="true" />}
          </button>
          <Link className="pn-link" href={painel.esqueci}>
            Esqueci minha senha atual
          </Link>
        </div>
        <span className="sr-only" aria-live="polite">
          {salvando ? "Alterando a senha…" : alterada ? "Senha alterada." : ""}
        </span>
      </form>
    </section>
  );
}

export function FormConta({ nome, email, papel }: { nome: string; email: string; papel: Papel }) {
  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Minha conta</h1>
          <p className="pn-sub">Seus dados de acesso ao painel.</p>
        </div>
      </div>
      <div className="pn-narrow">
        <Dados nome={nome} email={email} papel={papel} />
        <Senha email={email} />
      </div>
    </>
  );
}
