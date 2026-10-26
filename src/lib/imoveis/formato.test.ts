import { describe, expect, test } from "vitest";
import { formatarArea, formatarPreco, formatarQuartos, formatarReais } from "./formato";

describe("formato", () => {
  test("reais com separador de milhar", () => {
    expect(formatarReais(7890000)).toBe("R$ 7.890.000");
    expect(formatarReais(12500)).toBe("R$ 12.500");
    expect(formatarReais(900)).toBe("R$ 900");
  });

  test("preço do card: locação em R$/mês", () => {
    expect(formatarPreco(12500, "locacao")).toBe("R$ 12.500/mês");
    expect(formatarPreco(6200000, "venda")).toBe("R$ 6.200.000");
  });

  test("área com milhar e m²", () => {
    expect(formatarArea(398)).toBe("398 m²");
    expect(formatarArea(1043)).toBe("1.043 m²");
  });

  test("quartos no singular e no plural", () => {
    expect(formatarQuartos(1)).toBe("1 quarto");
    expect(formatarQuartos(3)).toBe("3 quartos");
  });
});
