import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { getDestaquesHome, type ImovelCard } from "@/lib/imoveis";
import { Destaques } from "./Destaques";

vi.mock("@/lib/imoveis", () => ({ getDestaquesHome: vi.fn() }));
const destaques = vi.mocked(getDestaquesHome);

const imovel = (id: string, titulo: string): ImovelCard => ({
  id,
  codigo: id.toUpperCase(),
  finalidade: "venda",
  lancamento: false,
  tipo: "Cobertura",
  titulo,
  bairro: "Belvedere",
  cidade: "Belo Horizonte",
  valor: 9_800_000,
  area: 520,
  quartos: 4,
  vagas: 6,
  suites: 4,
  valorLocacao: null,
  foto: { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 },
});

describe("Destaques", () => {
  test("seção de destaques some sem destaques", async () => {
    destaques.mockResolvedValue([]);
    expect(await Destaques()).toBeNull();
  });

  test("mostra os destaques na ordem recebida, cada um com link para o imóvel", async () => {
    destaques.mockResolvedValue([imovel("cz2", "Cobertura no Belvedere"), imovel("cz1", "Casa no Vale dos Cristais")]);
    render(await Destaques());

    expect(screen.getByRole("heading", { level: 2, name: "Imóveis em destaque" })).toBeInTheDocument();
    expect(screen.getAllByRole("heading", { level: 3 }).map((h) => h.textContent)).toEqual(["Cobertura no Belvedere", "Casa no Vale dos Cristais"]);
    expect(screen.getByRole("link", { name: "Cobertura no Belvedere" })).toHaveAttribute("href", "/imovel/cz2");
    expect(screen.getByRole("link", { name: /Ver todos/ })).toHaveAttribute("href", "/imoveis");
  });
});
