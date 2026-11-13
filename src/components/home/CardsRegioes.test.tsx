import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { getRegioesHome } from "@/lib/imoveis";
import { REGIOES } from "@/lib/imoveis/regioes";
import { CardsRegioes } from "./CardsRegioes";

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
