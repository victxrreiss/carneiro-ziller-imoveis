// Regiões da busca e da Home: lista fixa em código. Uma região junta pares
// bairro + cidade (Belvedere é de BH e Vila da Serra é de Nova Lima, e as duas
// formam uma região só). O parâmetro de URL `regiao` guarda o slug.
import { normalizar } from "./formato";
import type { Imovel } from "./types";

export type Regiao = {
  slug: string;
  nome: string;
  /** Foto do card da Home; nenhuma foto se repete na Home (fotos-home.test.ts). */
  img: string;
  bairros: readonly { bairro: string; cidade: string }[];
  /** Card grande da Home. */
  grande?: boolean;
};

export const REGIOES: readonly Regiao[] = [
  {
    slug: "belvedere",
    nome: "Belvedere",
    img: "/images/imoveis/d4db06613b4c066d84abe7cfea7b132b.jpg",
    bairros: [
      { bairro: "Belvedere", cidade: "Belo Horizonte" },
      // Grafia do feed da Loft: Belvedere cadastrado em Nova Lima.
      { bairro: "Belvedere", cidade: "Nova Lima" },
    ],
    grande: true,
  },
  {
    slug: "lourdes-savassi",
    nome: "Lourdes e Savassi",
    img: "/images/imoveis/9511260c5dbfff8011e2f18b84a6012b.jpg",
    bairros: [
      { bairro: "Lourdes", cidade: "Belo Horizonte" },
      { bairro: "Savassi", cidade: "Belo Horizonte" },
    ],
  },
  {
    slug: "alphaville-lagoa-dos-ingleses",
    nome: "Alphaville Lagoa dos Ingleses",
    img: "/images/regiao-alphaville-lagoa.jpg",
    bairros: [
      { bairro: "Alphaville Lagoa dos Ingleses", cidade: "Nova Lima" },
      // Grafia do feed da Loft.
      { bairro: "Alphaville", cidade: "Nova Lima" },
    ],
  },
  {
    slug: "vale-dos-cristais",
    nome: "Vale dos Cristais",
    img: "/images/venda-vale-dos-cristais.jpg",
    bairros: [{ bairro: "Vale dos Cristais", cidade: "Nova Lima" }],
  },
  {
    // Vila da Serra fica com o Vale do Sereno, vizinhos em Nova Lima (pedido do cliente, 2026-11-24).
    slug: "vale-do-sereno-vila-da-serra",
    nome: "Vale do Sereno e Vila da Serra",
    img: "/images/imoveis/9e9687278cf5c0bc894a25af3ad26b27.jpg",
    bairros: [
      { bairro: "Vale do Sereno", cidade: "Nova Lima" },
      { bairro: "Vila da Serra", cidade: "Nova Lima" },
    ],
  },
];

/** Slugs de antes da troca de 24/11/2026: links antigos (e os já indexados) continuam abrindo a busca. */
const SLUGS_ANTIGOS: Record<string, string> = {
  "belvedere-vila-da-serra": "belvedere",
  "vale-do-sereno": "vale-do-sereno-vila-da-serra",
};

export function regiaoPorSlug(slug: string): Regiao | undefined {
  const atual = SLUGS_ANTIGOS[slug] ?? slug;
  return REGIOES.find((r) => r.slug === atual);
}

/** O imóvel está em algum dos pares bairro + cidade da região? Compara sem acento nem caixa. */
export function naRegiao(r: Regiao, i: Pick<Imovel, "bairro" | "cidade">): boolean {
  return r.bairros.some((b) => normalizar(b.bairro) === normalizar(i.bairro) && normalizar(b.cidade) === normalizar(i.cidade));
}
