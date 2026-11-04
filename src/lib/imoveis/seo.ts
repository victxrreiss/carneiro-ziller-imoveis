// Dados estruturados (schema.org) do imóvel para o Google. Endereço detalhado
// (bairro, rua, número, CEP) fica de fora: só cidade, UF e país.
import type { Imovel } from "./types";

const MAX_FOTOS = 5;

export function jsonLdImovel(i: Imovel, url: string): Record<string, unknown> {
  return {
    "@context": "https://schema.org",
    "@type": "RealEstateListing",
    name: i.titulo,
    ...(i.descricao[0] ? { description: i.descricao[0] } : {}),
    url,
    image: i.fotos.slice(0, MAX_FOTOS).map((f) => f.src),
    // Venda: preço do imóvel; locação: aluguel mensal. Ambos estão em `valor`.
    offers: { "@type": "Offer", price: i.valor, priceCurrency: "BRL" },
    about: {
      "@type": "Residence",
      address: { "@type": "PostalAddress", addressLocality: i.cidade, addressRegion: i.uf, addressCountry: "BR" },
    },
  };
}

/** JSON para `<script type="application/ld+json">`: `<` escapado para o conteúdo não fechar a tag. */
export function serializarJsonLd(dados: Record<string, unknown>): string {
  return JSON.stringify(dados).replace(/</g, "\\u003c");
}
