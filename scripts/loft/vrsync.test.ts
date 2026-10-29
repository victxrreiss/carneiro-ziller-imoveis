import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { lerVrsync } from "./vrsync";

const xml = readFileSync(join(process.cwd(), "scripts/loft/fixtures/feed.xml"), "utf8");

describe("lerVrsync", () => {
  const lista = lerVrsync(xml);
  const por = (ref: string) => lista.find((a) => a.referencia === ref)!;

  test("lê todos os anúncios do feed", () => {
    expect(lista.map((a) => a.referencia)).toEqual(["901", "902", "903", "904", "905"]);
  });

  test("lote: área útil zerada vira null e a área do terreno vem da LotArea", () => {
    const lote = por("902");
    expect(lote.areaUtil).toBeNull();
    expect(lote.areaTerreno).toBe(633);
    expect(lote.tipoVrsync).toBe("Residential / Land Lot");
  });

  test("Sale/Rent é venda-locacao e traz o preço de locação", () => {
    const a = por("903");
    expect(a.transacao).toBe("venda-locacao");
    expect(a.precoVenda).toBe(3_200_000);
    expect(a.precoLocacao).toBe(15_000);
    expect(por("901").transacao).toBe("venda");
    expect(por("901").precoLocacao).toBeNull();
  });

  test("a primeira foto é a primary, as demais seguem a ordem do feed", () => {
    expect(por("901").fotos).toEqual([
      "https://cdn.exemplo.test/fotos/901/1.jpg",
      "https://cdn.exemplo.test/fotos/901/2.jpg",
      "https://cdn.exemplo.test/fotos/901/3.jpg",
    ]);
  });

  test("zeros viram null (banheiros, condomínio, IPTU) e campos raros ficam null quando ausentes", () => {
    const a = por("901");
    expect(a.banheiros).toBeNull();
    expect(a.condominio).toBe(1250);
    expect(a.suites).toBe(1);
    expect(a.andar).toBe(7);
    expect(a.ano).toBe(2015);
    expect(por("902").condominio).toBeNull();
    expect(por("902").iptu).toBeNull();
    expect(por("902").quartos).toBeNull();
    expect(por("902").suites).toBeNull();
    expect(por("902").vagas).toBeNull();
  });

  test("features, endereço e título ausente", () => {
    const a = por("901");
    expect(a.features).toEqual(["Gym", "Pool", "Number of stories", "Rooftop"]);
    expect(por("902").features).toEqual([]);
    expect(a).toMatchObject({ endereco: "Rua Exemplo", numero: "100", complemento: "101", cep: "34000-000", bairro: "Bairro Exemplo", cidade: "Cidade Exemplo", uf: "MG" });
    expect(por("904").titulo).toBe("");
    expect(por("902").complemento).toBe("");
  });
});
