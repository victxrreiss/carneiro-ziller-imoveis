import { describe, expect, test } from "vitest";
import { jsonLdImovel, serializarJsonLd } from "./seo";
import type { Imovel } from "./types";

const foto = (n: number) => ({ src: `https://fotos.exemplo/${n}.jpg`, alt: "", largura: 1600, altura: 1200 });

const imovel = {
  id: "cz1009",
  codigo: "CZ1009",
  finalidade: "venda",
  lancamento: false,
  tipo: "Apartamento",
  titulo: "Cobertura de alto padrão",
  bairro: "Belvedere",
  cidade: "Belo Horizonte",
  uf: "MG",
  valor: 7890000,
  area: 320,
  quartos: 4,
  vagas: 4,
  suites: 4,
  valorLocacao: null,
  foto: foto(0),
  banheiros: 5,
  areaTotal: null,
  condominio: null,
  iptu: null,
  andar: null,
  anoConstrucao: null,
  empreendimento: null,
  caracteristicas: [],
  descricao: ["Primeiro parágrafo.", "Segundo parágrafo."],
  fotos: [0, 1, 2, 3, 4, 5, 6].map(foto),
  // Campos que não existem no tipo, mas que nunca devem vazar para o JSON-LD.
  endereco: "Rua Secreta",
  numero: "123",
  cep: "30000-000",
} as unknown as Imovel;

describe("jsonLdImovel", () => {
  test("campos principais, preço e moeda", () => {
    const j = jsonLdImovel(imovel, "https://site.com/imovel/cz1009");
    expect(j["@type"]).toBe("RealEstateListing");
    expect(j.name).toBe("Cobertura de alto padrão");
    expect(j.description).toBe("Primeiro parágrafo.");
    expect(j.url).toBe("https://site.com/imovel/cz1009");
    expect(j.offers).toEqual({ "@type": "Offer", price: 7890000, priceCurrency: "BRL" });
  });

  test("locação usa o aluguel mensal", () => {
    const j = jsonLdImovel({ ...imovel, finalidade: "locacao", valor: 12000 }, "https://site.com/imovel/cz1009");
    expect((j.offers as { price: number }).price).toBe(12000);
  });

  test("até 5 fotos", () => {
    expect(jsonLdImovel(imovel, "u").image).toHaveLength(5);
  });

  test("endereço só com cidade, UF e país; nada de rua, número, CEP ou bairro", () => {
    const j = jsonLdImovel(imovel, "u");
    expect((j.about as { address: unknown }).address).toEqual({
      "@type": "PostalAddress",
      addressLocality: "Belo Horizonte",
      addressRegion: "MG",
      addressCountry: "BR",
    });
    const texto = JSON.stringify(j);
    for (const proibido of ["Rua Secreta", "123", "30000-000", "Belvedere"]) expect(texto).not.toContain(proibido);
    expect(texto).not.toContain("streetAddress");
  });
});

describe("serializarJsonLd", () => {
  test("escapa < para não fechar a tag script", () => {
    const s = serializarJsonLd({ name: "</script><b>" });
    expect(s).not.toContain("<");
    expect(JSON.parse(s)).toEqual({ name: "</script><b>" });
  });
});
