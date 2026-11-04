import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SiteHeader } from "./SiteChrome";

const temLancamentos = vi.hoisted(() => vi.fn());
vi.mock("@/lib/imoveis", () => ({ getTemLancamentos: temLancamentos }));

describe("SiteHeader", () => {
  test("SOU CORRETOR leva ao login do painel", async () => {
    temLancamentos.mockResolvedValue(true);
    render(await SiteHeader({ current: "imoveis" }));
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveAttribute("href", "/painel/entrar");
  });

  test("sem current, nenhum item do menu fica marcado", async () => {
    temLancamentos.mockResolvedValue(true);
    const { container } = render(await SiteHeader({}));
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  test("Lançamentos aparece no menu só quando há lançamento publicado", async () => {
    temLancamentos.mockResolvedValue(false);
    const { unmount } = render(await SiteHeader({}));
    expect(screen.queryByRole("link", { name: "Lançamentos" })).toBeNull();
    unmount();
    temLancamentos.mockResolvedValue(true);
    render(await SiteHeader({}));
    expect(screen.getAllByRole("link", { name: "Lançamentos" }).length).toBeGreaterThan(0);
  });
});
