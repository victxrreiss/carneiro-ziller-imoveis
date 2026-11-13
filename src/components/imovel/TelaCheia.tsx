"use client";

import Image from "next/image";
import { useEffect, useRef, type CSSProperties, type PointerEvent, type RefObject } from "react";
import { MarcaDagua } from "@/components/layout/MarcaDagua";
import { IcAnterior, IcProxima, IcX } from "@/components/ui/IconesSite";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import type { Foto } from "@/lib/imoveis";

/** Arrasto mínimo, em px, para o gesto contar como "deslizar" (abaixo disso é um toque). */
const DESLIZE_MINIMO = 40;

type Props = {
  fotos: Foto[];
  /** Foto na tela; `null` deixa a tela cheia fechada. */
  indice: number | null;
  onMudar: (indice: number) => void;
  onFechar: () => void;
  /** Para onde o foco volta se o elemento que abriu não puder recebê-lo. */
  retornoRef?: RefObject<HTMLElement | null>;
};

/**
 * Fotos em tela cheia: diálogo modal com setas, teclado (←, →, Esc), contador e deslizar com o
 * dedo. A navegação dá a volta (da última para a primeira). Só a foto atual e as duas vizinhas
 * ficam no DOM, então só elas são baixadas.
 */
export function TelaCheia({ fotos, indice, onMudar, onFechar, retornoRef }: Props) {
  const painelRef = useRef<HTMLDivElement>(null);
  const fecharRef = useRef<HTMLButtonElement>(null);
  const inicioRef = useRef<{ dedo: number; x: number; y: number } | null>(null);
  const aberto = indice !== null;
  const n = fotos.length;
  const varias = n > 1;

  useDialog({ aberto, onFechar, painelRef, focoInicialRef: fecharRef, retornoRef });

  const mover = (passo: number) => {
    if (indice !== null && varias) onMudar((indice + passo + n) % n);
  };
  const moverRef = useRef(mover);
  useEffect(() => {
    moverRef.current = mover;
  });

  useEffect(() => {
    if (!aberto) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      if (e.key === "ArrowRight") moverRef.current(1);
      else if (e.key === "ArrowLeft") moverRef.current(-1);
      else return;
      e.preventDefault();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [aberto]);

  if (indice === null) return null;

  // Só um ponteiro desliza. Um segundo dedo é zoom (pinça): o gesto é cancelado e os dois são ignorados.
  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (inicioRef.current) {
      inicioRef.current = null;
      return;
    }
    inicioRef.current = { dedo: e.pointerId, x: e.clientX, y: e.clientY };
    // Com o mouse, soltar fora da foto ainda termina o gesto aqui. (Sem suporte, segue sem captura.)
    try {
      e.currentTarget.setPointerCapture?.(e.pointerId);
    } catch {}
  }
  function onPointerUp(e: PointerEvent) {
    const inicio = inicioRef.current;
    if (!inicio || inicio.dedo !== e.pointerId) return;
    inicioRef.current = null;
    const dx = e.clientX - inicio.x;
    const dy = e.clientY - inicio.y;
    if (Math.abs(dx) < DESLIZE_MINIMO || Math.abs(dx) <= Math.abs(dy)) return;
    mover(dx < 0 ? 1 : -1);
  }

  const atual = fotos[indice];
  // Vizinhas (anterior e próxima), sem repetir a atual quando há poucas fotos.
  const vizinhas = [...new Set([(indice - 1 + n) % n, (indice + 1) % n])].filter((i) => i !== indice);
  const proporcao = atual.largura > 0 && atual.altura > 0 ? atual.largura / atual.altura : 1.5;

  return (
    <Portal>
      <div ref={painelRef} className="im-luz" role="dialog" aria-modal="true" aria-label="Fotos do imóvel">
        <button ref={fecharRef} type="button" className="im-luz-btn im-luz-fechar" aria-label="Fechar fotos" onClick={onFechar}>
          <IcX size={20} stroke="currentColor" width={1.4} />
        </button>
        {varias && (
          <button type="button" className="im-luz-btn im-luz-ant" aria-label="Foto anterior" onClick={() => mover(-1)}>
            <IcAnterior size={22} stroke="currentColor" width={1.4} />
          </button>
        )}
        <div
          className="im-luz-palco"
          onPointerDown={onPointerDown}
          onPointerUp={onPointerUp}
          onPointerCancel={() => (inicioRef.current = null)}
        >
          {/* A moldura tem a proporção da foto: a marca d'água fica sobre a imagem, não na sobra. */}
          <figure className="im-luz-foto" style={{ "--im-prop": proporcao } as CSSProperties}>
            <Image key={atual.src} src={atual.src} alt={atual.alt} fill sizes="(max-width: 1520px) 92vw, 1400px" loading="eager" draggable={false} />
            <MarcaDagua />
          </figure>
          <div className="im-luz-vizinhas" aria-hidden="true">
            {vizinhas.map((i) => (
              <Image key={fotos[i].src} src={fotos[i].src} alt="" fill sizes="(max-width: 1520px) 92vw, 1400px" loading="eager" />
            ))}
          </div>
        </div>
        {varias && (
          <button type="button" className="im-luz-btn im-luz-prox" aria-label="Próxima foto" onClick={() => mover(1)}>
            <IcProxima size={22} stroke="currentColor" width={1.4} />
          </button>
        )}
        {varias && (
          <>
            <span className="im-luz-cont" aria-hidden="true">
              {indice + 1} / {n}
            </span>
            <p className="sr-only" aria-live="polite">
              Foto {indice + 1} de {n}
            </p>
          </>
        )}
      </div>
    </Portal>
  );
}
