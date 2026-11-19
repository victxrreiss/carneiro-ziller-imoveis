"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import { MarcaDagua } from "@/components/layout/MarcaDagua";
import type { Foto } from "@/lib/imoveis";
import { TelaCheia } from "./TelaCheia";

/**
 * Galeria na dobra: mosaico com 1 foto grande + 2 (1 foto ocupa tudo, 2 dividem a largura), e o
 * botão "Ver as N fotos", que abre a tela cheia. No celular fica só a primeira, em 4:3, com o
 * mesmo botão. Sem foto, a imagem padrão (`padrao`), sem tela cheia.
 */
export function GaleriaMosaico({ fotos, padrao }: { fotos: Foto[]; padrao: Foto }) {
  const [aberta, setAberta] = useState<number | null>(null);
  const todasRef = useRef<HTMLButtonElement>(null);
  const n = fotos.length;
  const noMosaico = fotos.slice(0, 3);
  const celulas = Math.max(1, noMosaico.length);

  return (
    <section className={`im-mos im-mos-${celulas}`} aria-label="Fotos do imóvel">
      {n === 0 ? (
        <div className="im-mos-item im-mos-vazio">
          <Image src={padrao.src} alt="Imóvel ainda sem fotos" fill sizes="100vw" loading="eager" />
        </div>
      ) : (
        noMosaico.map((f, i) => (
          <button
            key={`${f.src}-${i}`}
            type="button"
            className="im-mos-item"
            onClick={() => setAberta(i)}
          >
            {/* O nome do botão é este texto mais o `alt` da foto ("Abrir foto 2 de 8: Sala de estar"). */}
            <span className="sr-only">
              {n === 1 ? "Ampliar a foto" : `Abrir foto ${i + 1} de ${n}`}
              {f.alt ? ": " : ""}
            </span>
            <Image
              src={f.src}
              alt={f.alt}
              fill
              sizes={i === 0 ? (celulas === 1 ? "100vw" : "(max-width: 900px) 100vw, 62vw") : "(max-width: 900px) 100vw, 38vw"}
              loading={i === 0 ? "eager" : "lazy"}
              fetchPriority={i === 0 ? "high" : "auto"}
            />
            <MarcaDagua src={f.src} />
          </button>
        ))
      )}
      {n > 1 && (
        <button ref={todasRef} type="button" className="im-mos-todas" onClick={() => setAberta(0)}>
          Ver as {n} fotos
        </button>
      )}
      <TelaCheia fotos={fotos} indice={aberta} onMudar={setAberta} onFechar={() => setAberta(null)} retornoRef={todasRef} />
    </section>
  );
}
