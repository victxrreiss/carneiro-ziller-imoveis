import { describe, expect, test } from "vitest";
import { getDestaque, getImoveisLocacao, getImoveisVenda, getLancamentos, getRegioes } from ".";

describe("camada de dados de imóveis (mock)", () => {
  test("lançamentos trazem 4 cards com etiqueta LANÇAMENTO", async () => {
    const items = await getLancamentos();
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.badge === "LANÇAMENTO")).toBe(true);
  });

  test("venda traz 4 cards com etiqueta VENDA", async () => {
    const items = await getImoveisVenda();
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.badge === "VENDA")).toBe(true);
  });

  test("locação traz 4 cards com etiqueta LOCAÇÃO", async () => {
    const items = await getImoveisLocacao();
    expect(items).toHaveLength(4);
    expect(items.every((i) => i.badge === "LOCAÇÃO")).toBe(true);
  });

  test("destaque é o PI0316", async () => {
    expect((await getDestaque()).codigo).toBe("PI0316");
  });

  test("regiões trazem as 4 da Home", async () => {
    expect((await getRegioes()).map((r) => r.nome)).toEqual([
      "Belvedere",
      "Vila da Serra",
      "Lagoa dos Ingleses",
      "Savassi e Lourdes",
    ]);
  });

  test("toda imagem é servida de /images/", async () => {
    const all = [
      ...(await getLancamentos()),
      ...(await getImoveisVenda()),
      ...(await getImoveisLocacao()),
      ...(await getRegioes()),
      await getDestaque(),
    ];
    expect(all.every((i) => i.img.startsWith("/images/"))).toBe(true);
  });
});
