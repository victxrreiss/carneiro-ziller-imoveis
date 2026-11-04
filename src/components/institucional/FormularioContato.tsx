"use client";

import { useEffect, useState, type ChangeEvent, type FormEvent } from "react";
import { IcAlerta, IcCheck, IcErro } from "@/components/ui/IconesSite";
import { enviarContato } from "@/lib/interesse/enviar";
import {
  LIMITES,
  mascararTelefone,
  validarInteresse,
  type CamposInteresse,
  type ErrosInteresse,
} from "@/lib/interesse/validacao";
import { routes } from "@/lib/routes";

type Status = "editando" | "enviando" | "sucesso" | "falha";
type Campo = keyof CamposInteresse;

const VAZIO: CamposInteresse = { nome: "", telefone: "", email: "", observacoes: "" };
const ORDEM_FOCO = ["nome", "telefone", "email"] as const;
const ID_CAMPO: Record<Campo, string> = { nome: "ct-nome", telefone: "ct-tel", email: "ct-email", observacoes: "ct-msg" };

/** Formulário "Envie uma mensagem" da página de contato (mesmos campos e regras do formulário do imóvel). */
export function FormularioContato() {
  const [campos, setCampos] = useState(VAZIO);
  const [erros, setErros] = useState<ErrosInteresse>({});
  const [enviado, setEnviado] = useState(false);
  const [status, setStatus] = useState<Status>("editando");
  const [focar, setFocar] = useState<string | null>(null);

  useEffect(() => {
    if (!focar) return;
    document.getElementById(focar)?.focus();
    setFocar(null); // eslint-disable-line react-hooks/set-state-in-effect -- consome o pedido de foco
  }, [focar]);

  const enviando = status === "enviando";

  function alterar(campo: Campo) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (enviando) return;
      const bruto = e.target.value;
      const valor = campo === "telefone" ? mascararTelefone(bruto) : bruto.slice(0, LIMITES[campo]);
      const proximos = { ...campos, [campo]: valor };
      setCampos(proximos);
      if (enviado && campo !== "observacoes" && erros[campo] && !validarInteresse(proximos)[campo]) {
        const resto = { ...erros };
        delete resto[campo];
        setErros(resto);
      }
    };
  }

  async function enviar(e: FormEvent) {
    e.preventDefault();
    if (enviando) return;
    const novos = validarInteresse(campos);
    setEnviado(true);
    setErros(novos);
    const primeiro = ORDEM_FOCO.find((c) => novos[c]);
    if (primeiro) {
      setStatus("editando");
      setFocar(ID_CAMPO[primeiro]);
      return;
    }
    setStatus("enviando");
    try {
      await enviarContato(campos);
      setStatus("sucesso");
      setFocar("ct-ok");
    } catch (erro) {
      console.error(erro);
      setStatus("falha");
    }
  }

  if (status === "sucesso") {
    return (
      <div className="im-success ct-success">
        <div className="notice-icon">
          <IcCheck size={28} width={1.4} />
        </div>
        <p id="ct-ok" tabIndex={-1} role="status">
          Mensagem enviada. Nossa equipe vai falar com você em breve.
        </p>
      </div>
    );
  }

  const classeCampo = enviando ? "im-input is-locked" : "im-input";
  const descricao = (campo: Campo, dica?: string) => (erros[campo as keyof ErrosInteresse] ? `${ID_CAMPO[campo]}-err` : dica);
  const mensagemErro = (campo: keyof ErrosInteresse) =>
    erros[campo] && (
      <p className="im-err" id={`${ID_CAMPO[campo]}-err`}>
        <IcErro size={14} width={1.8} />
        <span>{erros[campo]}</span>
      </p>
    );
  const obrigatorio = (
    <span className="req" aria-hidden="true">
      *
    </span>
  );

  return (
    <form className="im-form ct-form" noValidate aria-labelledby="ct-form-titulo" aria-busy={enviando} onSubmit={enviar}>
      <h2 id="ct-form-titulo" className="ct-h2">
        Envie uma mensagem
      </h2>
      {status === "falha" && (
        <div className="im-alert" role="alert">
          <IcAlerta size={20} />
          <div>
            <strong>Não foi possível enviar</strong>
            <p>Houve uma falha de conexão. Seus dados foram mantidos — é só tentar novamente.</p>
          </div>
        </div>
      )}
      <div className="im-fields">
        <div className="im-field">
          <label className="im-lbl" htmlFor="ct-nome">
            NOME{obrigatorio}
          </label>
          <input
            id="ct-nome"
            name="nome"
            className={classeCampo}
            type="text"
            autoComplete="name"
            aria-required="true"
            aria-invalid={!!erros.nome}
            aria-describedby={descricao("nome")}
            readOnly={enviando}
            value={campos.nome}
            onChange={alterar("nome")}
          />
          {mensagemErro("nome")}
        </div>
        <div className="im-field">
          <label className="im-lbl" htmlFor="ct-tel">
            TELEFONE{obrigatorio}
          </label>
          <input
            id="ct-tel"
            name="telefone"
            className={classeCampo}
            type="tel"
            autoComplete="tel-national"
            placeholder="(31) 99999-9999"
            aria-required="true"
            aria-invalid={!!erros.telefone}
            aria-describedby={descricao("telefone", "ct-tel-hint")}
            readOnly={enviando}
            value={campos.telefone}
            onChange={alterar("telefone")}
          />
          {erros.telefone ? (
            mensagemErro("telefone")
          ) : (
            <p className="im-req-note" id="ct-tel-hint">
              Com DDD. Celular ou fixo.
            </p>
          )}
        </div>
        <div className="im-field">
          <label className="im-lbl" htmlFor="ct-email">
            E-MAIL{obrigatorio}
          </label>
          <input
            id="ct-email"
            name="email"
            className={classeCampo}
            type="email"
            autoComplete="email"
            placeholder="nome@email.com"
            aria-required="true"
            aria-invalid={!!erros.email}
            aria-describedby={descricao("email")}
            readOnly={enviando}
            value={campos.email}
            onChange={alterar("email")}
          />
          {mensagemErro("email")}
        </div>
        <div className="im-field">
          <label className="im-lbl" htmlFor="ct-msg">
            MENSAGEM · OPCIONAL
          </label>
          <textarea
            id="ct-msg"
            name="observacoes"
            className={classeCampo}
            rows={4}
            readOnly={enviando}
            value={campos.observacoes}
            onChange={alterar("observacoes")}
          />
        </div>
      </div>
      <p className="im-req-note">
        <span aria-hidden="true">*</span> Campos obrigatórios
      </p>
      <p className="sr-only" aria-live="polite">
        {enviando ? "Enviando sua mensagem…" : ""}
      </p>
      <p className="im-privacy">
        Ao enviar, você concorda com a <a href={routes.privacidade}>Política de privacidade</a>.
      </p>
      <button type="submit" className="im-cta" disabled={enviando}>
        {enviando ? "ENVIANDO…" : status === "falha" ? "TENTAR NOVAMENTE" : "ENVIAR MENSAGEM"}
        {enviando && <span className="im-progress" aria-hidden="true" />}
      </button>
    </form>
  );
}
