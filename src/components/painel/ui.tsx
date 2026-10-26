"use client";

// Peças pequenas reutilizadas nas telas do painel.
import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import Image from "next/image";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import { IcCheck, IcErro, IcFechar, IcOlho, IcOlhoFechado } from "./Icones";
import { IcChevron } from "@/components/ui/IconesSite";

/** Logomarca no padrão do site (classes .logo de cz-site.css). */
export function Marca() {
  return (
    <>
      <Image src="/logo/simbolo-carneiro-azul.svg" alt="" width={40} height={40} />
      <span className="logo-col" aria-hidden="true">
        <span className="logo-name">
          CARNEIRO <span className="amp">&amp;</span> <span className="zbar">Z</span>ILLER
        </span>
        <span className="logo-rule" />
        <span className="logo-tag">IMÓVEIS</span>
      </span>
    </>
  );
}

/** Mensagem de erro abaixo do campo (ícone + texto, não só cor). */
export function ErroCampo({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p className="im-err" id={id}>
      <IcErro />
      {children}
    </p>
  );
}

export type Opcao = { valor: string; rotulo: string };

type SelecaoProps = {
  rotulo: ReactNode;
  /** Rótulo só para leitor de tela (barra de filtros). */
  rotuloOculto?: boolean;
  opcoes: readonly Opcao[];
  valor: string;
  onChange: (valor: string) => void;
  /** Texto do botão quando nada está escolhido. */
  vazio: string;
  /** Classe do contêiner (im-field no formulário; nada na barra de filtros). */
  className?: string;
  invalido?: boolean;
  descritoPor?: string;
  idCampo?: string;
  alinharDireita?: boolean;
};

/** Dropdown do design (.dd) com comportamento de listbox ARIA (Headless UI). */
export function Selecao({ rotulo, rotuloOculto, opcoes, valor, onChange, vazio, className, invalido, descritoPor, idCampo, alinharDireita }: SelecaoProps) {
  const atual = opcoes.find((o) => o.valor === valor);
  return (
    <Listbox as="div" id={idCampo} className={className ?? "dd-wrap"} value={valor} onChange={onChange}>
      {({ open }) => (
        <>
          <Label as="span" className={rotuloOculto ? "sr-only" : "im-lbl"}>
            {rotulo}
          </Label>
          <div className={open ? "dd is-open" : "dd"}>
            <ListboxButton
              className={atual && atual.valor ? "dd-trigger is-set" : "dd-trigger"}
              aria-invalid={invalido || undefined}
              aria-describedby={descritoPor}
            >
              <span className="dd-value">{atual?.rotulo ?? vazio}</span>
              <IcChevron size={14} width={1.6} className="dd-chev" />
            </ListboxButton>
            <ListboxOptions as="ul" className="dd-list" style={alinharDireita ? { left: "auto", right: 0 } : undefined}>
              {opcoes.map((o) => (
                <ListboxOption key={o.valor} as="li" value={o.valor} className={o.valor ? "dd-opt" : "dd-opt is-placeholder"}>
                  <span>{o.rotulo}</span>
                  <IcCheck className="dd-check" />
                </ListboxOption>
              ))}
            </ListboxOptions>
          </div>
        </>
      )}
    </Listbox>
  );
}

/** Campo de senha com mostrar/ocultar. */
export function CampoSenha({
  id,
  nome,
  rotulo,
  autoComplete,
  valor,
  onChange,
  desabilitado,
  erro,
  descritoPor,
  inputRef,
  rotuloMostrar,
}: {
  rotuloMostrar?: string;
  id: string;
  nome: string;
  rotulo: string;
  autoComplete: string;
  valor: string;
  onChange: (v: string) => void;
  desabilitado?: boolean;
  erro?: string;
  descritoPor?: string;
  inputRef?: React.Ref<HTMLInputElement>;
}) {
  const [mostrar, setMostrar] = useState(false);
  const erroId = `${id}-err`;
  const descr = [descritoPor, erro ? erroId : undefined].filter(Boolean).join(" ") || undefined;
  return (
    <div className={erro ? "im-field is-invalid" : "im-field"}>
      <label className="im-lbl" htmlFor={id}>
        {rotulo}
      </label>
      <div className="pn-pass">
        <input
          ref={inputRef}
          id={id}
          name={nome}
          className="im-input"
          type={mostrar ? "text" : "password"}
          autoComplete={autoComplete}
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          disabled={desabilitado}
          aria-invalid={erro ? true : undefined}
          aria-describedby={descr}
        />
        <button
          type="button"
          className="pn-pass-btn"
          aria-label={rotuloMostrar ?? `Mostrar ${rotulo.toLowerCase()}`}
          aria-pressed={mostrar}
          onClick={() => setMostrar((m) => !m)}
          disabled={desabilitado}
        >
          {mostrar ? <IcOlhoFechado size={20} stroke="#0F1D24" /> : <IcOlho size={20} stroke="#0F1D24" />}
        </button>
      </div>
      {erro && <ErroCampo id={erroId}>{erro}</ErroCampo>}
    </div>
  );
}

/** Requisito visível da senha (mínimo de caracteres). */
export function RequisitoSenha({ id, tamanho, minimo, tentou }: { id: string; tamanho: number; minimo: number; tentou: boolean }) {
  const ok = tamanho >= minimo;
  const cls = ok ? "is-met" : tentou ? "is-fail" : "";
  return (
    <ul className="pn-reqs" id={id} aria-label="Requisitos da senha">
      <li className={cls}>
        {ok ? (
          <IcCheck size={14} width={2.2} stroke="#0F1D24" />
        ) : tentou ? (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#78323D" strokeWidth="2.2" aria-hidden="true">
            <path d="M6 6l12 12M18 6L6 18" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#6D6E71" strokeWidth="1.8" aria-hidden="true">
            <circle cx="12" cy="12" r="6" />
          </svg>
        )}
        Pelo menos {minimo} caracteres <span style={{ fontVariantNumeric: "tabular-nums" }}>({Math.min(tamanho, 99)}/{minimo})</span>
      </li>
    </ul>
  );
}

/** Aviso de sucesso (canto inferior). Some em 6 s, mas não com o mouse ou o foco nele. */
export function Aviso({
  titulo,
  texto,
  link,
  onFechar,
  acimaDaBarra,
}: {
  titulo: string;
  texto?: string;
  link?: { href: string; rotulo: string };
  onFechar: () => void;
  acimaDaBarra?: boolean;
}) {
  const [pausado, setPausado] = useState(false);
  const fecharRef = useRef(onFechar);
  useEffect(() => {
    fecharRef.current = onFechar;
  });
  useEffect(() => {
    if (pausado) return;
    const t = setTimeout(() => fecharRef.current(), 6000);
    return () => clearTimeout(t);
  }, [pausado, titulo, texto]);
  return (
    <div
      className={acimaDaBarra ? "pn-toast is-above-bar" : "pn-toast"}
      role="status"
      onMouseEnter={() => setPausado(true)}
      onMouseLeave={() => setPausado(false)}
      onFocus={() => setPausado(true)}
      onBlur={() => setPausado(false)}
    >
      <IcCheck size={20} stroke="#FFFFFF" style={{ flex: "none" }} />
      <span className="pn-toast-txt">
        <strong>{titulo}</strong> {texto}
      </span>
      {link && (
        <a href={link.href} target="_blank" rel="noopener">
          {link.rotulo}
          <span className="sr-only"> (abre em nova aba)</span>
        </a>
      )}
      <button type="button" aria-label="Fechar aviso" onClick={onFechar}>
        <IcFechar size={16} stroke="#FFFFFF" />
      </button>
    </div>
  );
}

/** Confirmação (alertdialog). O foco começa no botão de cancelar. */
export function Confirmacao({
  titulo,
  children,
  rotuloConfirmar,
  rotuloCancelar = "CANCELAR",
  onConfirmar,
  onCancelar,
  ocupado,
  hrefConfirmar,
}: {
  titulo: string;
  children: ReactNode;
  rotuloConfirmar: string;
  rotuloCancelar?: string;
  onConfirmar?: () => void;
  onCancelar: () => void;
  ocupado?: boolean;
  /** Confirmar é um link (ex.: sair sem salvar). */
  hrefConfirmar?: string;
}) {
  const painelRef = useRef<HTMLDivElement>(null);
  const cancelarRef = useRef<HTMLButtonElement>(null);
  useDialog({ aberto: true, onFechar: onCancelar, painelRef, focoInicialRef: cancelarRef });
  return (
    <Portal>
      <div className="scrim" onClick={ocupado ? undefined : onCancelar} />
      <div ref={painelRef} className="pn-modal" role="alertdialog" aria-modal="true" aria-labelledby="pn-conf-t" aria-describedby="pn-conf-d">
        <div className="pn-modal-body">
          <h2 id="pn-conf-t">{titulo}</h2>
          <div id="pn-conf-d" style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {children}
          </div>
        </div>
        <div className="pn-modal-foot">
          <button ref={cancelarRef} type="button" className="btn btn-ghost" onClick={onCancelar} disabled={ocupado}>
            {rotuloCancelar}
          </button>
          {hrefConfirmar ? (
            <a className="btn btn-danger" href={hrefConfirmar}>
              {rotuloConfirmar}
            </a>
          ) : (
            <button type="button" className="btn btn-danger" onClick={onConfirmar} disabled={ocupado}>
              {rotuloConfirmar}
              {ocupado && <span className="im-progress" aria-hidden="true" />}
            </button>
          )}
        </div>
      </div>
    </Portal>
  );
}
