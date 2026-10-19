"use client";

import Image from "next/image";
import { useEffect, useId, useRef, useState, type ChangeEvent, type FormEvent } from "react";
import { IconeFechar } from "@/components/layout/MenuDrawer";
import { IcAlerta, IcCheck, IcErro } from "@/components/ui/IconesSite";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import type { Imovel } from "@/lib/imoveis";
import { enviarInteresse } from "@/lib/interesse/enviar";
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
const ID_CAMPO: Record<Campo, string> = { nome: "im-nome", telefone: "im-tel", email: "im-email", observacoes: "im-obs" };

type Props = { imovel: Imovel; aberto: boolean; onFechar: () => void };

/** Painel lateral (desktop) / tela cheia (mobile) com o formulário de interesse. */
export function FormularioInteresse({ imovel, aberto, onFechar }: Props) {
  const [campos, setCampos] = useState(VAZIO);
  const [erros, setErros] = useState<ErrosInteresse>({});
  const [enviado, setEnviado] = useState(false);
  const [status, setStatus] = useState<Status>("editando");
  const painelRef = useRef<HTMLDivElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const [focar, setFocar] = useState<string | null>(null);
  const tituloId = useId();

  function fechar() {
    if (status === "sucesso") {
      setCampos(VAZIO);
      setErros({});
      setEnviado(false);
      setStatus("editando");
    }
    onFechar();
  }

  useDialog({ aberto, onFechar: fechar, painelRef, focoInicialRef: nomeRef });

  // Foco depois do render: primeiro campo inválido ou o título do sucesso.
  useEffect(() => {
    if (!focar) return;
    document.getElementById(focar)?.focus();
    setFocar(null); // eslint-disable-line react-hooks/set-state-in-effect -- consome o pedido de foco
  }, [focar]);

  if (!aberto) return null;

  const enviando = status === "enviando";
  const codigo = `CÓD. ${imovel.codigo}`;
  const capa = imovel.fotos[0];

  function alterar(campo: Campo) {
    return (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      if (enviando) return;
      const bruto = e.target.value;
      const valor = campo === "telefone" ? mascararTelefone(bruto) : bruto.slice(0, LIMITES[campo]);
      const proximos = { ...campos, [campo]: valor };
      setCampos(proximos);
      // Depois do primeiro envio, o erro some quando o campo fica válido; erro novo só no próximo envio.
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
      await enviarInteresse({ id: imovel.id, codigo: imovel.codigo }, campos);
      setStatus("sucesso");
      setFocar("im-ok-title");
    } catch (erro) {
      console.error(erro);
      setStatus("falha");
    }
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

  return (
    <Portal>
      <div className="im-scrim" onClick={fechar} />
      <div ref={painelRef} className="im-panel" role="dialog" aria-modal="true" aria-labelledby={tituloId}>
        <div className="im-panel-head">
          <h2 id={tituloId} className="im-form-title">
            Agendar visita
          </h2>
          <button type="button" className="icon-btn" aria-label="Fechar formulário" onClick={fechar}>
            <IconeFechar />
          </button>
        </div>
        <form className="im-form" noValidate aria-labelledby={tituloId} aria-busy={enviando} onSubmit={enviar}>
          <div className="im-panel-body">
            {status !== "sucesso" ? (
              <>
                <div className="im-ref" role="group" aria-label="Imóvel de interesse">
                  {capa && <Image src={capa.src} alt="" width={88} height={66} />}
                  <div className="im-ref-txt">
                    <span className="im-ref-code">
                      {codigo} · {imovel.tipo.toUpperCase()}
                    </span>
                    <span className="im-ref-title">{imovel.titulo}</span>
                  </div>
                </div>
                <input type="hidden" name="imovel" value={imovel.codigo} />
                <p className="im-form-intro">
                  Deixe seu contato e um consultor retorna para combinar o dia e o horário da visita.
                </p>
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
                    <label className="im-lbl" htmlFor="im-nome">
                      NOME
                      <span className="req" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      ref={nomeRef}
                      id="im-nome"
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
                    <label className="im-lbl" htmlFor="im-tel">
                      TELEFONE
                      <span className="req" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="im-tel"
                      name="telefone"
                      className={classeCampo}
                      type="tel"
                      autoComplete="tel-national"
                      placeholder="(31) 99999-9999"
                      aria-required="true"
                      aria-invalid={!!erros.telefone}
                      aria-describedby={descricao("telefone", "im-tel-hint")}
                      readOnly={enviando}
                      value={campos.telefone}
                      onChange={alterar("telefone")}
                    />
                    {erros.telefone ? (
                      mensagemErro("telefone")
                    ) : (
                      <p className="im-req-note" id="im-tel-hint">
                        Com DDD. Celular ou fixo.
                      </p>
                    )}
                  </div>
                  <div className="im-field">
                    <label className="im-lbl" htmlFor="im-email">
                      E-MAIL
                      <span className="req" aria-hidden="true">
                        *
                      </span>
                    </label>
                    <input
                      id="im-email"
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
                    <label className="im-lbl" htmlFor="im-obs">
                      OBSERVAÇÕES · OPCIONAL
                    </label>
                    <textarea
                      id="im-obs"
                      name="observacoes"
                      className={classeCampo}
                      rows={4}
                      placeholder="Ex.: melhores dias e horários para a visita"
                      readOnly={enviando}
                      value={campos.observacoes}
                      onChange={alterar("observacoes")}
                    />
                  </div>
                </div>
                <p className="im-req-note">
                  <span aria-hidden="true">*</span> Campos obrigatórios
                </p>
              </>
            ) : (
              <div className="im-success">
                <div className="notice-icon">
                  <IcCheck size={28} width={1.4} />
                </div>
                <h3 id="im-ok-title" tabIndex={-1}>
                  Solicitação enviada
                </h3>
                <p>
                  Recebemos seu interesse no imóvel {codigo} — {imovel.titulo}. Um consultor vai entrar em contato pelo
                  telefone ou e-mail informado.
                </p>
                <dl className="im-recap">
                  <div>
                    <dt>NOME</dt>
                    <dd>{campos.nome}</dd>
                  </div>
                  <div>
                    <dt>TELEFONE</dt>
                    <dd>{campos.telefone}</dd>
                  </div>
                  <div>
                    <dt>E-MAIL</dt>
                    <dd>{campos.email}</dd>
                  </div>
                </dl>
              </div>
            )}
          </div>
          <div className="im-panel-foot">
            <p className="sr-only" aria-live="polite">
              {enviando ? "Enviando sua solicitação…" : ""}
            </p>
            {status !== "sucesso" ? (
              <>
                <p className="im-privacy">
                  Ao enviar, você concorda com a{" "}
                  <a href={routes.privacidade} target="_blank" rel="noopener">
                    Política de privacidade<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                  .
                </p>
                <button type="submit" className="im-cta" disabled={enviando}>
                  {enviando ? "ENVIANDO…" : status === "falha" ? "TENTAR NOVAMENTE" : "ENVIAR"}
                  {enviando && <span className="im-progress" aria-hidden="true" />}
                </button>
              </>
            ) : (
              <button type="button" className="im-cta" onClick={fechar}>
                VOLTAR AO IMÓVEL
              </button>
            )}
          </div>
        </form>
      </div>
    </Portal>
  );
}
