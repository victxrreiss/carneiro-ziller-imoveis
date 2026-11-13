import Link from "next/link";
import { getContagemPorTipo } from "@/lib/imoveis";
import { pluralTipo, urlGrid } from "@/lib/imoveis/filtros";
import { routes } from "@/lib/routes";
import { CabecalhoSecao, CardCategoria, linkSeta, moldura } from "./partes";

/** No máximo 4 cards, nesta ordem; "Terrenos" só entra quando algum dos outros não tem imóvel. */
const MAX_CARDS = 4;

const CARDS: readonly { tipo: string; legenda: string; img: string }[] = [
  { tipo: "Apartamento", legenda: "Belo Horizonte · Nova Lima", img: "/images/destaque-belvedere.jpg" },
  { tipo: "Cobertura", legenda: "Vista e terraço", img: "/images/imoveis/fb93739e7184d00c58fed8564f56afa2.jpg" },
  { tipo: "Casa em condomínio", legenda: "Nova Lima", img: "/images/venda-residencial-das-minas.jpg" },
  { tipo: "Casa", legenda: "Belo Horizonte", img: "/images/venda-cidade-jardim.jpg" },
  { tipo: "Terreno", legenda: "Para construir", img: "/images/regiao-lagoa-dos-ingleses.jpg" },
];

const colunas: Record<number, string> = {
  1: "min-[900px]:grid-cols-1",
  2: "min-[900px]:grid-cols-2",
  3: "min-[900px]:grid-cols-3",
  4: "min-[900px]:grid-cols-4",
};

/** "O que você procura?": um card por tipo, já como link para a busca. Tipo sem imóvel publicado não aparece. */
export async function CardsTipos() {
  const comImovel = new Set((await getContagemPorTipo(undefined)).map((t) => t.tipo));
  const cards = CARDS.filter((c) => comImovel.has(c.tipo)).slice(0, MAX_CARDS);
  if (!cards.length) return null;

  return (
    <section aria-labelledby="tipos-titulo" className="pb-[clamp(72px,9vw,128px)]">
      <div className={moldura}>
        <CabecalhoSecao
          id="tipos-titulo"
          rotulo="Explore"
          titulo="O que você procura?"
          lado={
            <Link href={routes.imoveis} className={linkSeta}>
              Todos os tipos
            </Link>
          }
        />
        <div className={`grid grid-cols-2 gap-3 min-[900px]:gap-4.5 ${colunas[cards.length]}`}>
          {cards.map((c, i) => {
            // Celular (2 colunas) com número ímpar: o último ocupa a linha inteira, mais baixo.
            const largo = cards.length % 2 === 1 && i === cards.length - 1;
            return (
              <CardCategoria
                key={c.tipo}
                href={urlGrid({ tipo: c.tipo, pagina: 1 })}
                img={c.img}
                legenda={c.legenda}
                nome={pluralTipo(c.tipo) ?? c.tipo}
                sizes={largo ? "(max-width: 899px) 100vw, 420px" : "(max-width: 899px) 50vw, 320px"}
                // Com menos de 4 cards a coluna alarga: a altura para de acompanhar a largura.
                className={`${largo ? "col-span-2 aspect-3/2 min-[900px]:col-span-1" : "aspect-3/4"} ${
                  cards.length === MAX_CARDS ? "" : "min-[900px]:aspect-auto min-[900px]:h-105"
                }`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
