import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { getRegioesHome } from "@/lib/imoveis";
import { REGIOES } from "@/lib/imoveis/regioes";
import { CardsRegioes, vaosRegioes } from "./CardsRegioes";

vi.mock("@/lib/imoveis", () => ({ getRegioesHome: vi.fn() }));
const regioes = vi.mocked(getRegioesHome);

describe("CardsRegioes", () => {
  test("cards de região linkam para /imoveis?regiao=<slug>", async () => {
    regioes.mockResolvedValue(REGIOES.map((r) => ({ ...r, total: 2 })));
    render(await CardsRegioes());

    expect(screen.getByRole("heading", { level: 2, name: "Onde você quer morar?" })).toBeInTheDocument();
    expect(screen.getAllByRole("link").map((a) => a.getAttribute("href"))).toEqual(REGIOES.map((r) => `/imoveis?regiao=${r.slug}`));
    const grande = screen.getByRole("link", { name: /Belvedere e Vila da Serra/ });
    expect(grande).toHaveAttribute("data-grande", "true");
    expect(screen.getByRole("link", { name: /Vale do Sereno/ })).not.toHaveAttribute("data-grande");
  });

  test.each([1, 2, 3, 4, 5, 6, 7])("grade sem buracos com %i regiões, no celular e no desktop", (n) => {
    const vaos = vaosRegioes(n);
    expect(vaos).toHaveLength(n);
    // Enche as linhas na ordem, como o grid faz: toda linha tem de fechar exatamente na largura.
    for (const [lado, colunas] of [["celular", 2], ["desktop", 6]] as const) {
      let linha = 0;
      for (const v of vaos) {
        linha += v[lado];
        expect(linha).toBeLessThanOrEqual(colunas);
        if (linha === colunas) linha = 0;
      }
      expect(linha).toBe(0);
    }
  });

  test("o card grande só vale com as 5 regiões; com menos, os cards dividem a linha", async () => {
    regioes.mockResolvedValue(REGIOES.slice(0, 4).map((r) => ({ ...r, total: 2 })));
    render(await CardsRegioes());
    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(4);
    expect(links.some((a) => a.hasAttribute("data-grande"))).toBe(false);
    // 2 por linha no celular e no desktop.
    expect(links.map((a) => a.getAttribute("data-vao"))).toEqual(["1/3", "1/3", "1/3", "1/3"]);
  });

  test("só as regiões que vieram do catálogo; sem nenhuma, a seção some", async () => {
    regioes.mockResolvedValue([{ ...REGIOES[1], total: 1 }]);
    const { unmount } = render(await CardsRegioes());
    expect(screen.getAllByRole("link")).toHaveLength(1);
    unmount();

    regioes.mockResolvedValue([]);
    expect(await CardsRegioes()).toBeNull();
  });

  test("cada região tem uma foto diferente", () => {
    expect(new Set(REGIOES.map((r) => r.img)).size).toBe(REGIOES.length);
  });
});
