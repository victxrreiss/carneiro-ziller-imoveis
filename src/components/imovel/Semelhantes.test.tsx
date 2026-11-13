import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { ImovelCard } from "@/lib/imoveis";
import { Semelhantes } from "./Semelhantes";

const card = (n: number): ImovelCard => ({
  id: `cz20${n}`,
  codigo: `CZ20${n}`,
  finalidade: "venda",
  lancamento: false,
  tipo: "Cobertura",
  titulo: `Cobertura semelhante ${n}`,
  bairro: "Lourdes",
  cidade: "Belo Horizonte",
  valor: 5_000_000 + n,
  area: 400,
  quartos: 4,
  vagas: 4,
  suites: 2,
  valorLocacao: null,
  foto: { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 },
});

describe("Semelhantes", () => {
  test("Semelhantes some sem itens e mostra até 3 cards", () => {
    const { container, unmount } = render(<Semelhantes itens={[]} />);
    expect(container).toBeEmptyDOMElement();
    unmount();

    render(<Semelhantes itens={[1, 2, 3, 4].map(card)} />);
    const secao = screen.getByRole("region", { name: "Imóveis semelhantes" });
    expect(within(secao).getAllByRole("article")).toHaveLength(3);
    // Fora do grid: o link do card não leva `?de=`.
    expect(within(secao).getByRole("link", { name: "Cobertura semelhante 1" })).toHaveAttribute("href", "/imovel/cz201");
  });
});
