import { describe, expect, test } from "vitest";
import { REGIOES, naRegiao, regiaoPorSlug } from "./regioes";

describe("REGIOES", () => {
  test("slugs na ordem da Home; só a primeira é grande", () => {
    expect(REGIOES.map((r) => r.slug)).toEqual([
      "belvedere",
      "lourdes-savassi",
      "alphaville-lagoa-dos-ingleses",
      "vale-dos-cristais",
      "vale-do-sereno-vila-da-serra",
    ]);
    expect(REGIOES.filter((r) => r.grande).map((r) => r.slug)).toEqual(["belvedere"]);
    expect(REGIOES.every((r) => r.img.startsWith("/images/"))).toBe(true);
  });

  test("regiaoPorSlug devolve a região ou undefined", () => {
    expect(regiaoPorSlug("lourdes-savassi")?.nome).toBe("Lourdes e Savassi");
    expect(regiaoPorSlug("nada")).toBeUndefined();
  });

  test("slugs antigos levam à região nova", () => {
    expect(regiaoPorSlug("belvedere-vila-da-serra")?.slug).toBe("belvedere");
    expect(regiaoPorSlug("vale-do-sereno")?.slug).toBe("vale-do-sereno-vila-da-serra");
  });

  test("naRegiao compara bairro e cidade sem acento nem caixa, e o par precisa casar", () => {
    const r = regiaoPorSlug("vale-do-sereno-vila-da-serra");
    if (!r) throw new Error("região ausente");
    expect(naRegiao(r, { bairro: "VALE DO SERENO", cidade: "nova lima" })).toBe(true);
    expect(naRegiao(r, { bairro: "Vila da Serra", cidade: "Nova Lima" })).toBe(true);
    expect(naRegiao(r, { bairro: "Vila da Serra", cidade: "Belo Horizonte" })).toBe(false);
    expect(naRegiao(r, { bairro: "Belvedere", cidade: "Belo Horizonte" })).toBe(false);
  });

  test("grafias reais do feed da Loft caem na região esperada", () => {
    const regiaoDe = (bairro: string, cidade: string) => REGIOES.find((r) => naRegiao(r, { bairro, cidade }))?.slug;
    expect(regiaoDe("Alphaville", "Nova Lima")).toBe("alphaville-lagoa-dos-ingleses");
    expect(regiaoDe("Alphaville Lagoa Dos Ingleses", "Nova Lima")).toBe("alphaville-lagoa-dos-ingleses");
    expect(regiaoDe("Belvedere", "Nova Lima")).toBe("belvedere");
    expect(regiaoDe("Belvedere", "Belo Horizonte")).toBe("belvedere");
  });
});
