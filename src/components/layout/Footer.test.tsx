import { render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { Footer } from "./Footer";

const temLancamentos = vi.hoisted(() => vi.fn());
vi.mock("@/lib/imoveis", () => ({ getTemLancamentos: temLancamentos }));

beforeEach(() => temLancamentos.mockResolvedValue(true));

describe("Footer", () => {
  test("traz telefone, WhatsApp, e-mail, endereço e CRECI de site.ts", async () => {
    const { container } = render(await Footer());
    expect(screen.getByRole("link", { name: "(31) 99539-5988" })).toHaveAttribute("href", "tel:+5531995395988");
    expect(screen.getByRole("link", { name: "WhatsApp" })).toHaveAttribute("href", "https://wa.me/5531995395988");
    expect(screen.getByRole("link", { name: "contato@carneiroinvestimoveis.com.br" })).toHaveAttribute(
      "href",
      "mailto:contato@carneiroinvestimoveis.com.br",
    );
    expect(container).toHaveTextContent("Alameda Oscar Niemeyer, 288");
    expect(container).toHaveTextContent("Vale do Sereno, Nova Lima - MG");
    expect(container).toHaveTextContent("CRECI 7904");
  });

  test("navegação do rodapé: os itens do menu e a política de privacidade", async () => {
    render(await Footer());
    const nav = screen.getByRole("navigation", { name: "Rodapé" });
    expect(within(nav).getAllByRole("link").map((l) => [l.textContent, l.getAttribute("href")])).toEqual([
      ["Home", "/"],
      ["Lançamentos", "/imoveis?finalidade=lancamentos"],
      ["Imóveis", "/imoveis"],
      ["Contato", "/contato"],
      ["Sobre nós", "/sobre"],
      ["Política de privacidade", "/politica-de-privacidade"],
    ]);
  });

  test("sem lançamento publicado, o rodapé não tem Lançamentos", async () => {
    temLancamentos.mockResolvedValue(false);
    render(await Footer());
    expect(screen.queryByRole("link", { name: "Lançamentos" })).toBeNull();
  });

  test("a logo negativa leva à Home", async () => {
    render(await Footer());
    const logo = screen.getByRole("link", { name: "Carneiro & Ziller Imóveis" });
    expect(logo).toHaveAttribute("href", "/");
    expect(logo.querySelector("img")?.getAttribute("src")).toContain("carneiro-ziller-negativo.svg");
  });
});
