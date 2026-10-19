"use client";

import Image from "next/image";
import { useRef, useState, type KeyboardEvent } from "react";
import { IcAnterior, IcCamera, IcProxima } from "@/components/ui/IconesSite";
import type { Foto } from "@/lib/imoveis";

/**
 * Desktop: palco 3:2 com setas, contador e miniaturas (← → Home End no palco).
 * ≤900px: trilho com scroll-snap por toque. 1 foto: sem navegação. 0: "FOTOS EM BREVE".
 */
export function Galeria({ fotos }: { fotos: Foto[] }) {
  const [idx, setIdx] = useState(0);
  const trilhoRef = useRef<HTMLDivElement>(null);
  const n = fotos.length;

  if (n === 0) {
    return (
      <div className="im-gal">
        <div className="im-nophoto">
          <IcCamera size={32} stroke="#555456" width={1.3} />
          FOTOS EM BREVE
        </div>
      </div>
    );
  }

  const ir = (i: number) => setIdx((i + n) % n);
  const varias = n > 1;
  const atual = fotos[idx];

  function onTeclaPalco(e: KeyboardEvent) {
    if (!varias) return;
    const destino = { ArrowLeft: idx - 1, ArrowRight: idx + 1, Home: 0, End: n - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    ir(destino);
  }

  function onRolarTrilho() {
    const el = trilhoRef.current;
    if (!el) return;
    const i = Math.round(el.scrollLeft / Math.max(1, el.clientWidth));
    if (i !== idx && i >= 0 && i < n) setIdx(i);
  }

  return (
    <div className="im-gal">
      <div className="im-desk">
        <div
          className="im-stage"
          role="group"
          aria-roledescription="galeria"
          aria-label={`Fotos do imóvel — foto ${idx + 1} de ${n}. Use as setas do teclado para navegar.`}
          tabIndex={0}
          onKeyDown={onTeclaPalco}
        >
          <Image
            key={atual.src}
            src={atual.src}
            alt={atual.alt}
            fill
            sizes="(max-width: 1080px) calc(100vw - 460px), 704px"
            fetchPriority={idx === 0 ? "high" : "auto"}
          />
          {varias && (
            <>
              <button type="button" className="im-arrow im-prev" aria-label="Foto anterior" onClick={() => ir(idx - 1)}>
                <IcAnterior size={20} width={1.6} />
              </button>
              <button type="button" className="im-arrow im-next" aria-label="Próxima foto" onClick={() => ir(idx + 1)}>
                <IcProxima size={20} width={1.6} />
              </button>
              <span className="im-count" aria-hidden="true">
                {idx + 1} / {n}
              </span>
            </>
          )}
        </div>
        {varias && (
          <ul className="im-thumbs" aria-label="Miniaturas">
            {fotos.map((f, i) => (
              <li key={`${f.src}-${i}`}>
                <button
                  type="button"
                  className="im-thumb"
                  aria-label={`Ver foto ${i + 1} de ${n}`}
                  aria-current={i === idx ? "true" : undefined}
                  onClick={() => ir(i)}
                >
                  <Image src={f.src} alt="" fill sizes="96px" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div className="im-touch">
        <div
          ref={trilhoRef}
          className="im-track"
          role="group"
          aria-roledescription="galeria"
          aria-label={`Fotos do imóvel — deslize para ver as ${n} fotos`}
          tabIndex={0}
          onScroll={onRolarTrilho}
        >
          {fotos.map((f, i) => (
            <div className="im-slide" key={`${f.src}-${i}`}>
              <Image src={f.src} alt={f.alt} fill sizes="100vw" fetchPriority={i === 0 ? "high" : "auto"} />
            </div>
          ))}
        </div>
        {varias && (
          <span className="im-count" aria-hidden="true">
            {idx + 1} / {n}
          </span>
        )}
      </div>
      <p className="sr-only" aria-live="polite">
        {varias ? `Foto ${idx + 1} de ${n}` : ""}
      </p>
    </div>
  );
}
