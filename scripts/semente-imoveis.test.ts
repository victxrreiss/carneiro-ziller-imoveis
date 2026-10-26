import { describe, expect, test } from "vitest";
import { sementeImoveis } from "./semente-imoveis";

describe("semente de imóveis", () => {
  // Mesma regra do painel: publicado ou indisponível não sai sem descrição.
  test.each(sementeImoveis().map((r) => [r.codigo, r] as const))("%s tem descrição", (_, r) => {
    expect(r.descricao.trim()).not.toBe("");
  });

  test("são 35 imóveis, com códigos de CZ1001 a CZ1035 e todos com foto", () => {
    const todos = sementeImoveis();
    expect(todos).toHaveLength(35);
    expect(todos.map((r) => r.codigo)).toEqual(Array.from({ length: 35 }, (_, i) => `CZ${1001 + i}`));
    expect(todos.every((r) => r.fotos.length > 0)).toBe(true);
  });
});
