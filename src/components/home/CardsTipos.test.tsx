import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { getContagemPorTipo } from "@/lib/imoveis";
import { CardsTipos } from "./CardsTipos";

vi.mock("@/lib/imoveis", () => ({ getContagemPorTipo: vi.fn() }));
const contagem = vi.mocked(getContagemPorTipo);

const links = () => screen.getAllByRole("link").map((a) => [a.textContent, a.getAttribute("href")]);

beforeEach(() => contagem.mockReset());

describe("CardsTipos", () => {
  test("cards de tipo linkam para /imoveis?tipo=… e omitem tipo sem imóvel", async () => {
    contagem.mockResolvedValue([
      { tipo: "Apartamento", total: 12 },
      { tipo: "Casa em condomínio", total: 3 },
      { tipo: "Casa", total: 1 },
      { tipo: "Loft", total: 2 },
    ]);
    render(await CardsTipos());

    expect(screen.getByRole("heading", { level: 2, name: "O que você procura?" })).toBeInTheDocument();
    expect(contagem).toHaveBeenCalledWith(undefined);
    const cards = links().filter(([, href]) => href?.includes("tipo="));
    expect(cards.map(([, href]) => href)).toEqual([
      "/imoveis?tipo=Apartamento",
      "/imoveis?tipo=Casa+em+condom%C3%ADnio",
      "/imoveis?tipo=Casa",
    ]);
    expect(screen.getByRole("link", { name: /Casas em condomínio/ })).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: /Coberturas/ })).not.toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Todos os tipos/ })).toHaveAttribute("href", "/imoveis");
  });

  test("Terrenos só entra quando cabe: no máximo 4 cards", async () => {
    contagem.mockResolvedValue(["Apartamento", "Cobertura", "Casa em condomínio", "Casa", "Terreno"].map((tipo) => ({ tipo, total: 1 })));
    const { unmount } = render(await CardsTipos());
    expect(links().filter(([, href]) => href?.includes("tipo=")).map(([, href]) => href)).toHaveLength(4);
    expect(screen.queryByRole("link", { name: /Terrenos/ })).not.toBeInTheDocument();
    unmount();

    contagem.mockResolvedValue(["Apartamento", "Casa", "Terreno"].map((tipo) => ({ tipo, total: 1 })));
    render(await CardsTipos());
    expect(screen.getByRole("link", { name: /Terrenos/ })).toHaveAttribute("href", "/imoveis?tipo=Terreno");
  });

  test("número ímpar de cards: no celular (2 colunas) o último ocupa a linha inteira", async () => {
    const cards = () => screen.getAllByRole("link").filter((a) => a.getAttribute("href")?.includes("tipo="));
    const largos = () => cards().map((a) => a.className.split(" ").includes("col-span-2"));

    contagem.mockResolvedValue(["Apartamento", "Casa", "Terreno"].map((tipo) => ({ tipo, total: 1 })));
    const tres = render(await CardsTipos());
    expect(largos()).toEqual([false, false, true]);
    tres.unmount();

    contagem.mockResolvedValue([{ tipo: "Casa", total: 1 }]);
    const um = render(await CardsTipos());
    expect(largos()).toEqual([true]);
    um.unmount();

    contagem.mockResolvedValue(["Apartamento", "Cobertura", "Casa", "Terreno"].map((tipo) => ({ tipo, total: 1 })));
    render(await CardsTipos());
    expect(largos()).toEqual([false, false, false, false]);
  });

  test("sem nenhum tipo com imóvel, a seção some", async () => {
    contagem.mockResolvedValue([{ tipo: "Loft", total: 2 }]);
    expect(await CardsTipos()).toBeNull();
  });
});
