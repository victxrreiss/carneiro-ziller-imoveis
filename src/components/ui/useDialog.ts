"use client";

import { useEffect, useRef, type RefObject } from "react";

const FOCAVEIS =
  'a[href], button:not([disabled]), input:not([type="hidden"]):not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex="0"]';

/** Visível de fato (CSS pode esconder o botão da ficha no mobile, por exemplo). */
function visivel(el: HTMLElement): boolean {
  return typeof el.checkVisibility === "function" ? el.checkVisibility() : true;
}

function visiveis(painel: HTMLElement): HTMLElement[] {
  return [...painel.querySelectorAll<HTMLElement>(FOCAVEIS)].filter(visivel);
}

type Opcoes = {
  aberto: boolean;
  onFechar: () => void;
  /** Painel com role="dialog". O foco fica preso dentro dele. */
  painelRef: RefObject<HTMLElement | null>;
  /** Elemento que recebe o foco ao abrir; sem ele, o primeiro focável do painel. */
  focoInicialRef?: RefObject<HTMLElement | null>;
  /** Para onde o foco volta se o elemento que abriu não estiver mais visível. */
  retornoRef?: RefObject<HTMLElement | null>;
};

/**
 * Comportamento de diálogo modal: Esc fecha, Tab circula dentro do painel,
 * o resto da página fica `inert` e sem rolagem, e ao fechar o foco volta ao
 * elemento que abriu. O painel deve estar num portal direto no <body>.
 */
export function useDialog({ aberto, onFechar, painelRef, focoInicialRef, retornoRef }: Opcoes) {
  const onFecharRef = useRef(onFechar);
  useEffect(() => {
    onFecharRef.current = onFechar;
  });

  useEffect(() => {
    if (!aberto) return;
    const painel = painelRef.current;
    if (!painel) return;

    const origem = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    const retorno = retornoRef?.current;
    const host = painel.closest("body > *");
    const inertes = [...document.body.children].filter(
      (el): el is HTMLElement => el instanceof HTMLElement && el !== host && !el.inert,
    );
    inertes.forEach((el) => (el.inert = true));
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    (focoInicialRef?.current ?? visiveis(painel)[0])?.focus();

    function onKeyDown(e: KeyboardEvent) {
      // Um componente interno (ex.: lista aberta de um dropdown) já tratou o Esc.
      if (e.key === "Escape" && !e.defaultPrevented) {
        e.preventDefault();
        onFecharRef.current();
        return;
      }
      if (e.key !== "Tab" || !painel) return;
      const els = visiveis(painel);
      if (!els.length) return;
      const primeiro = els[0];
      const ultimo = els[els.length - 1];
      const ativo = document.activeElement;
      if (e.shiftKey && (ativo === primeiro || !painel.contains(ativo))) {
        e.preventDefault();
        ultimo.focus();
      } else if (!e.shiftKey && (ativo === ultimo || !painel.contains(ativo))) {
        e.preventDefault();
        primeiro.focus();
      }
    }
    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.removeEventListener("keydown", onKeyDown);
      inertes.forEach((el) => (el.inert = false));
      document.body.style.overflow = overflow;
      const destino = origem && origem.isConnected && visivel(origem) ? origem : retorno;
      destino?.focus();
    };
  }, [aberto, painelRef, focoInicialRef, retornoRef]);
}
