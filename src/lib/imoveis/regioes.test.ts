import { describe, expect, test } from "vitest";
import { REGIOES, naRegiao, regiaoPorSlug } from "./regioes";

describe("REGIOES", () => {
  test("slugs na ordem da Home; só a primeira é grande", () => {
    expect(REGIOES.map((r) => r.slug)).toEqual([
      "belvedere-vila-da-serra",
      "lourdes-savassi",
      "alphaville-lagoa-dos-ingleses",
      "vale-dos-cristais",
      "vale-do-sereno",
    ]);
    expect(REGIOES.filter((r) => r.grande).map((r) => r.slug)).toEqual(["belvedere-vila-da-serra"]);
    expect(REGIOES.every((r) => r.img.startsWith("/images/"))).toBe(true);
  });

  test("regiaoPorSlug devolve a região ou undefined", () => {
    expect(regiaoPorSlug("lourdes-savassi")?.nome).toBe("Lourdes e Savassi");
    expect(regiaoPorSlug("nada")).toBeUndefined();
  });

  test("naRegiao compara bairro e cidade sem acento nem caixa, e o par precisa casar", () => {
    const r = regiaoPorSlug("belvedere-vila-da-serra");
    if (!r) throw new Error("região ausente");
    expect(naRegiao(r, { bairro: "BELVEDERE", cidade: "belo horizonte" })).toBe(true);
    expect(naRegiao(r, { bairro: "Vila da Serra", cidade: "Nova Lima" })).toBe(true);
    expect(naRegiao(r, { bairro: "Vila da Serra", cidade: "Belo Horizonte" })).toBe(false);
    expect(naRegiao(r, { bairro: "Lourdes", cidade: "Belo Horizonte" })).toBe(false);
  });
});
