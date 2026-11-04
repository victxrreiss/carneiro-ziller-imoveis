import { afterEach, describe, expect, it, vi } from "vitest";

const { getTemLancamentos } = vi.hoisted(() => ({ getTemLancamentos: vi.fn() }));
vi.mock("@/lib/imoveis", () => ({ getTemLancamentos }));

import { temLancamentosParaMenu } from "./lancamentos";

describe("temLancamentosParaMenu", () => {
  afterEach(() => vi.restoreAllMocks());

  it("repassa o valor lido", async () => {
    getTemLancamentos.mockResolvedValueOnce(false);
    expect(await temLancamentosParaMenu()).toBe(false);
    getTemLancamentos.mockResolvedValueOnce(true);
    expect(await temLancamentosParaMenu()).toBe(true);
  });

  it("se a leitura falhar, devolve true (menu completo) e registra o erro", async () => {
    const erro = vi.spyOn(console, "error").mockImplementation(() => {});
    getTemLancamentos.mockRejectedValueOnce(new Error("banco fora"));
    expect(await temLancamentosParaMenu()).toBe(true);
    expect(erro).toHaveBeenCalled();
  });
});
