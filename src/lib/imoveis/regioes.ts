// Regiões da busca e da Home: lista fixa em código. Uma região junta pares
// bairro + cidade (Belvedere é de BH e Vila da Serra é de Nova Lima, e as duas
// formam uma região só). O parâmetro de URL `regiao` guarda o slug.
import { normalizar } from "./formato";
import type { Imovel } from "./types";

export type Regiao = {
  slug: string;
  nome: string;
  /** Linha pequena do card (cidades). */
  legenda: string;
  img: string;
  bairros: readonly { bairro: string; cidade: string }[];
  /** Card grande da Home. */
  grande?: boolean;
};

export const REGIOES: readonly Regiao[] = [
  {
    slug: "belvedere-vila-da-serra",
    nome: "Belvedere e Vila da Serra",
    legenda: "BELO HORIZONTE · NOVA LIMA",
    img: "/images/regiao-belvedere.jpg",
    bairros: [
      { bairro: "Belvedere", cidade: "Belo Horizonte" },
      { bairro: "Vila da Serra", cidade: "Nova Lima" },
    ],
    grande: true,
  },
  {
    slug: "lourdes-savassi",
    nome: "Lourdes e Savassi",
    legenda: "BELO HORIZONTE",
    img: "/images/regiao-savassi-lourdes.jpg",
    bairros: [
      { bairro: "Lourdes", cidade: "Belo Horizonte" },
      { bairro: "Savassi", cidade: "Belo Horizonte" },
    ],
  },
  {
    slug: "alphaville-lagoa-dos-ingleses",
    nome: "Alphaville Lagoa dos Ingleses",
    legenda: "NOVA LIMA",
    img: "/images/regiao-lagoa-dos-ingleses.jpg",
    bairros: [{ bairro: "Alphaville Lagoa dos Ingleses", cidade: "Nova Lima" }],
  },
  {
    slug: "vale-dos-cristais",
    nome: "Vale dos Cristais",
    legenda: "NOVA LIMA",
    img: "/images/venda-vale-dos-cristais.jpg",
    bairros: [{ bairro: "Vale dos Cristais", cidade: "Nova Lima" }],
  },
  {
    slug: "vale-do-sereno",
    nome: "Vale do Sereno",
    legenda: "NOVA LIMA",
    img: "/images/regiao-vila-da-serra.jpg",
    bairros: [{ bairro: "Vale do Sereno", cidade: "Nova Lima" }],
  },
];

export function regiaoPorSlug(slug: string): Regiao | undefined {
  return REGIOES.find((r) => r.slug === slug);
}

/** O imóvel está em algum dos pares bairro + cidade da região? Compara sem acento nem caixa. */
export function naRegiao(r: Regiao, i: Pick<Imovel, "bairro" | "cidade">): boolean {
  return r.bairros.some((b) => normalizar(b.bairro) === normalizar(i.bairro) && normalizar(b.cidade) === normalizar(i.cidade));
}
