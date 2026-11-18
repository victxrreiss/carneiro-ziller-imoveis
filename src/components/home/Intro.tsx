"use client";

import { useEffect, useRef, useSyncExternalStore, type CSSProperties } from "react";
import { ANEL, CARNEIRO, CENTRO_SELO, DIVISOR, INVEST, PONTOS, SIMBOLO, Z } from "./intro-tracos";

/** Chave do `sessionStorage`: a abertura rápida aparece uma vez por sessão do navegador. */
export const CHAVE_INTRO = "cz-intro";
/**
 * Atributo no invólucro da camada: `toca` enquanto a abertura rápida está na tela, `pula` durante
 * a saída rápida de quem pulou e `vista` depois (o CSS a esconde).
 */
export const ATRIBUTO_INTRO = "data-cz-intro";
/** Duração total, saída incluída. Tem de bater com a animação `cz-intro-sai` em `cz-site.css`. */
export const INTRO_MS = 3000;
/** Duração da saída quando o visitante pula. Tem de bater com `cz-intro-pula`. */
export const PULAR_MS = 260;

/** Gestos que pulam a abertura rápida, ouvidos no `document` (a camada não tem nada focável). */
const GESTOS = ["pointerdown", "keydown", "wheel"] as const;

/**
 * Roda antes da primeira pintura (script em linha, logo antes da camada, que ainda nem foi lida):
 * decide se a abertura rápida toca ou se já foi vista nesta sessão, e marca o invólucro. Sem
 * JavaScript o atributo fica vazio e a camada toca e some sozinha pelo CSS. Também já ouve os
 * gestos de pular, para o pulo funcionar antes da hidratação.
 */
export const SCRIPT_INTRO = `(function(r,d,v,g,p){try{v=sessionStorage.getItem("${CHAVE_INTRO}")==="1"}catch(e){}try{v=v||matchMedia("(prefers-reduced-motion: reduce)").matches}catch(e){}r.setAttribute("${ATRIBUTO_INTRO}",v?"vista":"toca");if(v)return;g=${JSON.stringify(GESTOS)};p=function(){g.forEach(function(t){d.removeEventListener(t,p)});if(r.getAttribute("${ATRIBUTO_INTRO}")==="toca")r.setAttribute("${ATRIBUTO_INTRO}","pula")};g.forEach(function(t){d.addEventListener(t,p,{passive:true})})})(document.currentScript.parentNode,document)`;

const ouvintes = new Set<() => void>();
const assinar = (avisar: () => void) => {
  ouvintes.add(avisar);
  return () => void ouvintes.delete(avisar);
};
// Só o invólucro que veio no HTML e que o script marcou conta: numa navegação interna ele não existe.
const involucro = () => document.querySelector(`[${ATRIBUTO_INTRO}]`);
const estado = () => involucro()?.getAttribute(ATRIBUTO_INTRO);
const tocando = () => estado() === "toca" || estado() === "pula";

/** Marca a abertura rápida como vista: nesta página (atributo) e nas próximas da sessão (`sessionStorage`). */
function concluir() {
  try {
    window.sessionStorage.setItem(CHAVE_INTRO, "1");
  } catch {
    // Armazenamento bloqueado: a abertura volta a tocar na próxima carga da Home, e só.
  }
  involucro()?.setAttribute(ATRIBUTO_INTRO, "vista");
  ouvintes.forEach((avisar) => avisar());
}

/**
 * Abertura rápida da Home: a animação da logo da designer refeita em vetor (o selo da Ziller se
 * escreve em círculo, entra o Z, depois o divisor e a Carneiro), sobre uma camada azul-noite que
 * some e revela a página. Aparece só quando a Home é a porta de entrada do site (carga do
 * documento), uma vez por sessão; chegando à Home por navegação interna ela não toca.
 *
 * A camada é decorativa (`aria-hidden`, sem nada focável) e nunca prende a página: a animação
 * inteira, saída incluída, é CSS e termina em `visibility:hidden`. O JavaScript só pula (clique,
 * toque, tecla ou rolagem), grava a sessão e tira a camada do DOM.
 */
export function Intro() {
  // No servidor e na hidratação a camada está sempre no HTML; quem a esconde antes da primeira
  // pintura é o CSS, pelo atributo que o script em linha põe no invólucro.
  const ativa = useSyncExternalStore(assinar, tocando, () => true);
  const camada = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Entrou no site por outra página (ou já viu, ou pediu menos movimento): não toca mais nesta sessão.
    if (!ativa) return concluir();
    // O script em linha pode ter recebido o pulo antes da hidratação: aí só falta esperar a saída rápida.
    let pulou = estado() === "pula";
    let fim = window.setTimeout(concluir, pulou ? PULAR_MS : INTRO_MS);
    const pular = () => {
      if (pulou) return;
      pulou = true;
      // Pulo no meio da saída natural: a saída rápida continua da opacidade em que estava.
      const el = camada.current;
      if (el) el.style.opacity = window.getComputedStyle(el).opacity;
      involucro()?.setAttribute(ATRIBUTO_INTRO, "pula");
      window.clearTimeout(fim);
      fim = window.setTimeout(concluir, PULAR_MS);
    };
    // A saída (a natural ou a do pulo) terminou antes do relógio: a camada já está invisível.
    const aoTerminar = (e: AnimationEvent) => {
      if (e.target === camada.current) concluir();
    };
    const el = camada.current;
    GESTOS.forEach((tipo) => document.addEventListener(tipo, pular, { passive: true }));
    el?.addEventListener("animationend", aoTerminar);
    return () => {
      window.clearTimeout(fim);
      GESTOS.forEach((tipo) => document.removeEventListener(tipo, pular));
      el?.removeEventListener("animationend", aoTerminar);
    };
  }, [ativa]);

  if (!ativa) return null;

  return (
    // O script muda o atributo antes da hidratação: `suppressHydrationWarning` cobre essa diferença.
    <div {...{ [ATRIBUTO_INTRO]: "" }} suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: SCRIPT_INTRO }} />
      <div ref={camada} className="cz-intro" aria-hidden="true">
        <div className="cz-intro-marca">
          <svg viewBox="0 0 1286 383" fill="currentColor" fillRule="evenodd" focusable="false">
            <g className="cz-intro-anel" style={{ transformOrigin: `${CENTRO_SELO.x}px ${CENTRO_SELO.y}px` }}>
              {ANEL.map((d, k) => (
                <path key={k} d={d} style={{ "--i": k } as CSSProperties} />
              ))}
            </g>
            {PONTOS.map((d, k) => (
              <path key={k} className="cz-intro-ponto" d={d} style={{ "--i": k } as CSSProperties} />
            ))}
            <path className="cz-intro-z" d={Z} />
            <rect className="cz-intro-divisor" x={DIVISOR.x} y={DIVISOR.y} width={DIVISOR.largura} height={DIVISOR.altura} />
            <path className="cz-intro-simbolo" d={SIMBOLO} />
            <path className="cz-intro-carneiro" d={CARNEIRO} />
            <path className="cz-intro-invest" d={INVEST} />
          </svg>
        </div>
        <span className="cz-intro-pular">Pular</span>
      </div>
    </div>
  );
}
