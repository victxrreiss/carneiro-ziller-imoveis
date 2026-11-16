"use client";

import Image from "next/image";
import { useEffect, useState, type ReactNode } from "react";
import { abertura } from "@/lib/site";
import { ANCORA_CONTEUDO, moldura, Rotulo } from "./partes";

type Config = typeof abertura;

/** Intervalo da troca de imagem e de frase. */
const TROCA_MS = 6000;

/**
 * Abertura em tela cheia: imagens alternando com zoom lento (ou o vídeo de `site.ts`), véu
 * azul-noite, frases alternando e, embaixo, a busca (`children`). O HTML do servidor já traz a
 * primeira imagem e a primeira frase ativas; a troca só começa no cliente e não acontece com
 * `prefers-reduced-motion`. O h1 é sempre a primeira frase; as outras são decoração.
 */
export function Abertura({ config = abertura, children }: { config?: Config; children: ReactNode }) {
  const [passo, setPasso] = useState(0);
  const { video, frases } = config;
  // Com vídeo, só a primeira imagem: é o fundo enquanto ele carrega e o que fica com movimento reduzido.
  const imagens = video ? config.imagens.slice(0, 1) : config.imagens;

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const relogio = window.setInterval(() => setPasso((p) => p + 1), TROCA_MS);
    return () => window.clearInterval(relogio);
  }, []);

  return (
    <section aria-label="Apresentação" className="relative flex min-h-svh flex-col justify-end overflow-hidden bg-noite text-white">
      <div className="absolute inset-0">
        {imagens.map((img, k) => {
          const ativa = k === passo % imagens.length;
          return (
            <Image
              key={img.src}
              src={img.src}
              alt={img.alt}
              aria-hidden={!ativa}
              fill
              // No celular a abertura é mais alta que larga: a foto cobre pela altura e precisa de mais pixels.
              sizes="(max-width: 899px) 250vw, 100vw"
              quality={90}
              preload={k === 0}
              loading={k === 0 ? "eager" : "lazy"}
              data-abertura-imagem=""
              data-ativa={ativa}
              className="[transform:scale(1.02)] object-cover opacity-0 transition-opacity duration-2400 ease-[ease] data-[ativa=true]:animate-kenburns data-[ativa=true]:opacity-100 motion-reduce:animate-none!"
            />
          );
        })}
        {video && (
          <video
            autoPlay
            muted
            loop
            playsInline
            poster={video.poster}
            aria-hidden="true"
            tabIndex={-1}
            className="absolute inset-0 h-full w-full object-cover motion-reduce:hidden"
          >
            <source src={video.mp4} type="video/mp4" />
          </video>
        )}
        <div
          aria-hidden="true"
          className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,29,36,.55)_0%,rgba(15,29,36,.15)_35%,rgba(15,29,36,.35)_65%,rgba(15,29,36,.9)_100%)]"
        />
      </div>

      <div className={`${moldura} relative z-2 flex flex-col gap-7.5 pt-27.5 pb-[clamp(56px,8vh,84px)] min-[900px]:gap-[clamp(34px,5vh,64px)] min-[900px]:pt-35`}>
        <div className="flex max-w-215 flex-col gap-5.5">
          <Rotulo escuro>Belo Horizonte · Nova Lima</Rotulo>
          {/* O h1 é só a primeira frase, estável para leitores de tela e buscadores; as outras se
              alternam por cima dela, na mesma célula da grade, como decoração (aria-hidden). */}
          <div className="grid font-display text-[clamp(36px,10.5vw,54px)] leading-[1.02] font-light tracking-[-0.015em] min-[900px]:text-[clamp(40px,6.2vw,92px)]">
            {frases.map((frase, k) => {
              const ativa = k === passo % frases.length;
              const [primeira, segunda] = frase.split("\n");
              const Tag = k === 0 ? "h1" : "span";
              return (
                <Tag
                  key={frase}
                  aria-hidden={k === 0 ? undefined : true}
                  data-abertura-frase=""
                  data-ativa={ativa}
                  className="col-start-1 row-start-1 m-0 translate-y-3.5 opacity-0 transition-[opacity,translate] duration-1200 ease-[ease] data-[ativa=true]:translate-y-0 data-[ativa=true]:opacity-100"
                >
                  {primeira}
                  {segunda && (
                    <>
                      {" "}
                      <br />
                      <em className="text-champanhe italic">{segunda}</em>
                    </>
                  )}
                </Tag>
              );
            })}
          </div>
          <p className="m-0 max-w-[46ch] text-[15px] leading-[1.65] font-light text-white/80 min-[900px]:text-[17px]">
            Apartamentos, coberturas e casas selecionados em Belo Horizonte e Nova Lima.
          </p>
        </div>
        {children}
      </div>

      <a
        href={`#${ANCORA_CONTEUDO}`}
        aria-label="Rolar para baixo"
        className="absolute right-(--cz-respiro) bottom-7 z-3 hidden h-12 w-7 justify-center rounded-[14px] border border-white/40 pt-2 focus-visible:outline-champanhe min-[900px]:flex"
      >
        <span className="h-3 w-px animate-desce bg-white motion-reduce:animate-none" />
      </a>
    </section>
  );
}
