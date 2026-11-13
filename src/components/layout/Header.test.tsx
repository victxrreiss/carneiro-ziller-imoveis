import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Header } from "./Header";

const temLancamentos = vi.hoisted(() => vi.fn());
vi.mock("@/lib/imoveis", () => ({ getTemLancamentos: temLancamentos }));

beforeEach(() => temLancamentos.mockResolvedValue(true));

describe("Header", () => {
  test("menu principal na ordem Home, Lançamentos, Imóveis, Contato, Sobre nós", async () => {
    render(await Header({ current: "home" }));
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0];
    const links = within(nav).getAllByRole("link");
    expect(links.map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Home", "/"],
      ["Lançamentos", "/imoveis?finalidade=lancamentos"],
      ["Imóveis", "/imoveis"],
      ["Contato", "/contato"],
      ["Sobre nós", "/sobre"],
    ]);
  });

  test("sem lançamento publicado, o menu não tem Lançamentos", async () => {
    temLancamentos.mockResolvedValue(false);
    render(await Header({ current: "home" }));
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0];
    expect(within(nav).getAllByRole("link").map((l) => l.textContent)).toEqual(["Home", "Imóveis", "Contato", "Sobre nós"]);
  });

  test("marca o item atual com aria-current", async () => {
    render(await Header({ current: "imoveis" }));
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0];
    expect(within(nav).getByRole("link", { name: "Imóveis" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  test("SOU CORRETOR leva ao login do painel", async () => {
    render(await Header({ current: "home" }));
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveAttribute("href", "/painel/entrar");
  });

  test("a logo leva à Home e tem o nome da empresa como nome acessível", async () => {
    render(await Header({ current: "home" }));
    expect(screen.getByRole("link", { name: "Carneiro & Ziller Imóveis" })).toHaveAttribute("href", "/");
  });

  test("sem current, nenhum item do menu fica marcado", async () => {
    const { container } = render(await Header({}));
    expect(container.querySelectorAll('[aria-current="page"]')).toHaveLength(0);
  });

  test("por padrão é sólido; sobre-imagem deixa o fundo transparente", async () => {
    const { container, unmount } = render(await Header({ current: "imoveis" }));
    expect(container.querySelector("header")).toHaveClass("cz-topo", "cz-topo-solido");
    unmount();
    const outro = render(await Header({ current: "home", variante: "sobre-imagem" }));
    expect(outro.container.querySelector("header")).toHaveClass("cz-topo", "cz-topo-sobre-imagem");
    expect(outro.container.querySelector("header")).not.toHaveClass("cz-topo-solido");
  });

  test("não tem barra de utilidades: telefone e CRECI ficam fora do cabeçalho", async () => {
    const { container } = render(await Header({ current: "home" }));
    expect(container).not.toHaveTextContent("99539-5988");
    expect(container).not.toHaveTextContent("CRECI");
  });
});
