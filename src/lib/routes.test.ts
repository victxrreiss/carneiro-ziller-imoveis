import { describe, expect, test } from "vitest";
import { itensNavegacao, navItems } from "./routes";

describe("itensNavegacao", () => {
  test("sem lançamentos: tira Lançamentos e mantém a ordem das demais", () => {
    const itens = itensNavegacao(false);
    expect(itens.map((i) => i.key)).toEqual(["home", "imoveis", "contato", "sobre"]);
  });

  test("com lançamentos: o menu completo", () => {
    expect(itensNavegacao(true)).toEqual(navItems);
  });
});
