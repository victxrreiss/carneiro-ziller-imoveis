import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Header } from "./Header";

describe("Header", () => {
  test("menu principal na ordem Home, Lançamentos, Imóveis, Contato, Sobre nós", () => {
    render(<Header current="home" />);
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

  test("marca o item atual com aria-current", () => {
    render(<Header current="imoveis" />);
    const nav = screen.getAllByRole("navigation", { name: "Principal" })[0];
    expect(within(nav).getByRole("link", { name: "Imóveis" })).toHaveAttribute("aria-current", "page");
    expect(within(nav).getByRole("link", { name: "Home" })).not.toHaveAttribute("aria-current");
  });

  test("SOU CORRETOR leva ao login do painel", () => {
    render(<Header current="home" />);
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveAttribute("href", "/painel/entrar");
  });
});
