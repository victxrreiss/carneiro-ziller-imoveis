import Image from "next/image";
import type { CSSProperties } from "react";

/*
 * Uma única imagem (1240×1160, céu transparente) vista por 3 janelas que se
 * alinham como uma foto contínua. A cor de fundo de cada janela vira o céu.
 * Percentuais do README do handoff, relativos ao container 620×580.
 */
const windows: { box: CSSProperties; img: CSSProperties; sky: string }[] = [
  {
    box: { left: 0, top: 0, width: "37.1%", height: "74.14%" },
    img: { left: 0, top: 0, width: "269.54%" },
    sky: "bg-areia-quadro",
  },
  {
    box: { left: 0, top: "79.31%", width: "37.1%", height: "20.69%" },
    img: { left: 0, top: "-383.33%", width: "269.54%" },
    sky: "bg-areia-quadro",
  },
  {
    box: { left: "41.94%", top: 0, width: "58.06%", height: "100%" },
    img: { left: "-72.24%", top: 0, width: "172.24%" },
    sky: "bg-azul-noite",
  },
];

export function HeroComposition() {
  return (
    <div role="img" aria-label="Fachada de edifício residencial moderno" className="relative aspect-[620/580] w-full max-w-155">
      {windows.map((w, i) => (
        <div key={i} className={`absolute overflow-hidden ${w.sky}`} style={w.box}>
          <Image
            src="/images/hero-predio.png"
            alt=""
            width={1240}
            height={1160}
            sizes="(max-width: 668px) calc(100vw - 48px), 620px"
            loading="eager"
            fetchPriority="high"
            className="absolute h-auto max-w-none"
            style={w.img}
          />
        </div>
      ))}
    </div>
  );
}
