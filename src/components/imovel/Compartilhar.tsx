"use client";

import { useEffect, useRef, useState } from "react";

type Props = {
  titulo: string;
  /** URL canônica do imóvel, sem `?de=` (contexto de navegação de quem compartilha). */
  url: string;
};

const IcCompartilhar = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true" focusable="false">
    <path d="M12 15V3.5M7.5 8 12 3.5 16.5 8M5 12.5V20h14v-7.5" />
  </svg>
);

/**
 * Compartilhar o imóvel: usa o compartilhamento nativo do aparelho (`navigator.share`) quando
 * existe; sem ele, ou se ele falhar, abre as alternativas WhatsApp e "Copiar link".
 */
export function Compartilhar({ titulo, url }: Props) {
  const [aberto, setAberto] = useState(false);
  const [copiado, setCopiado] = useState<"sim" | "falhou" | null>(null);
  const caixaRef = useRef<HTMLDivElement>(null);
  const botaoRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!aberto) return;
    function onPointerDown(e: Event) {
      if (!caixaRef.current?.contains(e.target as Node)) setAberto(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [aberto]);

  async function onClick() {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ title: titulo, url });
        return;
      } catch (erro) {
        // A pessoa fechou a folha de compartilhamento: nada a fazer.
        if ((erro as { name?: unknown } | null)?.name === "AbortError") return;
        // Qualquer outro erro (bloqueio do navegador, dado recusado): oferece as alternativas.
        setCopiado(null);
        setAberto(true);
        return;
      }
    }
    setCopiado(null);
    setAberto((a) => !a);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(url);
      setCopiado("sim");
    } catch {
      setCopiado("falhou");
    }
  }

  function fechar() {
    setAberto(false);
    botaoRef.current?.focus();
  }

  return (
    <div
      ref={caixaRef}
      className="im-comp"
      onKeyDown={(e) => {
        if (e.key !== "Escape" || !aberto) return;
        e.stopPropagation();
        fechar();
      }}
    >
      <button ref={botaoRef} type="button" className="im-comp-btn" aria-expanded={aberto} onClick={onClick}>
        <IcCompartilhar />
        Compartilhar
      </button>
      {aberto && (
        <div className="im-comp-menu" role="group" aria-label="Compartilhar este imóvel">
          <a href={`https://wa.me/?text=${encodeURIComponent(`${titulo} ${url}`)}`} target="_blank" rel="noopener">
            WhatsApp<span className="sr-only"> (abre em nova aba)</span>
          </a>
          <button type="button" onClick={copiar}>
            Copiar link
          </button>
          <p className="im-comp-aviso" role="status">
            {copiado === "sim" ? "Link copiado" : copiado === "falhou" ? "Não foi possível copiar. Copie o endereço do navegador." : ""}
          </p>
        </div>
      )}
    </div>
  );
}
