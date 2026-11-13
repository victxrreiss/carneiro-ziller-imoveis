import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ImovelResumo } from "@/lib/imoveis";
import { CardImovel } from "./CardImovel";

const base: ImovelResumo = {
  id: "cz1009",
  codigo: "CZ1009",
  finalidade: "venda",
  lancamento: false,
  tipo: "Cobertura",
  titulo: "Cobertura no Belvedere",
  bairro: "Belvedere",
  cidade: "Belo Horizonte",
  valor: 9_800_000,
  area: 520,
  quartos: 4,
  vagas: 6,
  suites: 4,
  valorLocacao: null,
  foto: { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 },
};

describe("CardImovel", () => {
  test("etiqueta, bairro · cidade, título, área · quartos · vagas, preço e marca d'água", () => {
    const { container } = render(<CardImovel imovel={base} />);
    const card = container.querySelector("article")!;
    expect(card.querySelector(".cz-card-tag")).toHaveTextContent("VENDA");
    expect(card.querySelector(".cz-card-meta")).toHaveTextContent("Belvedere · Belo Horizonte");
    expect(screen.getByRole("heading", { level: 3, name: "Cobertura no Belvedere" })).toBeInTheDocument();
    expect([...card.querySelectorAll(".cz-card-dados span")].map((s) => s.textContent)).toEqual(["520 m²", "4 quartos", "6 vagas"]);
    expect(card.querySelector(".cz-card-preco")).toHaveTextContent("R$ 9.800.000");
    expect(card.querySelector(".cz-card-foto .cz-marca-dagua")).toHaveAttribute("aria-hidden", "true");
  });

  test("sem quartos nem vagas, só a área; uma vaga no singular", () => {
    const { container, rerender } = render(<CardImovel imovel={{ ...base, quartos: null, vagas: null }} />);
    const dados = () => [...container.querySelectorAll(".cz-card-dados span")].map((s) => s.textContent);
    expect(dados()).toEqual(["520 m²"]);
    rerender(<CardImovel imovel={{ ...base, quartos: 1, vagas: 1 }} />);
    expect(dados()).toEqual(["520 m²", "1 quarto", "1 vaga"]);
  });

  test("fora do grid, o link vai direto ao imóvel; no grid, leva os filtros em `de`", () => {
    const { rerender } = render(<CardImovel imovel={base} />);
    expect(screen.getByRole("link", { name: "Cobertura no Belvedere" })).toHaveAttribute("href", "/imovel/cz1009");
    rerender(<CardImovel imovel={base} de="finalidade=comprar" grid="/imoveis?finalidade=comprar" />);
    expect(screen.getByRole("link", { name: "Cobertura no Belvedere" })).toHaveAttribute("href", "/imovel/cz1009?de=finalidade%3Dcomprar");
  });

  test("locação mostra /mês; venda com locação mostra o aluguel ao lado", () => {
    const { container, rerender } = render(<CardImovel imovel={{ ...base, finalidade: "locacao", valor: 12_000 }} />);
    expect(container.querySelector(".cz-card-preco")).toHaveTextContent("R$ 12.000/mês");
    expect(container.querySelector(".cz-card-tag")).toHaveTextContent("LOCAÇÃO");
    rerender(<CardImovel imovel={{ ...base, valorLocacao: 30_000 }} />);
    expect(container.querySelector(".cz-card-preco")).toHaveTextContent("R$ 9.800.000 ou R$ 30.000/mês");
  });
});
