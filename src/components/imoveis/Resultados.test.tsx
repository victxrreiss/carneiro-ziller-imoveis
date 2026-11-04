import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { Resultados } from "./Resultados";

const vazio = { itens: [], total: 3, pagina: 2, paginas: 1 };
const tipos = [
  { tipo: "Apartamento", total: 168 },
  { tipo: "Cobertura", total: 12 },
];

function montar(extra: Partial<React.ComponentProps<typeof Resultados>> = {}) {
  const onAplicar = vi.fn();
  render(
    <Resultados
      estado={{ tipo: "ok", resultado: vazio }}
      filtros={{ pagina: 2, finalidade: "comprar" }}
      tipos={tipos}
      onPagina={vi.fn()}
      onAplicar={onAplicar}
      onLimpar={vi.fn()}
      onTentarDeNovo={vi.fn()}
      {...extra}
    />,
  );
  return { onAplicar };
}

describe("Resultados > ordenação", () => {
  it("escolher Maior preço aplica a ordem e volta para a página 1", async () => {
    const { onAplicar } = montar();
    await userEvent.click(screen.getByRole("button", { name: /ORDENAR POR/ }));
    await userEvent.click(screen.getByRole("option", { name: "Maior preço" }));
    expect(onAplicar).toHaveBeenCalledWith({ finalidade: "comprar", ordem: "maior-preco", pagina: 1 });
  });

  it("voltar a Mais recentes limpa a ordem", async () => {
    const { onAplicar } = montar({ filtros: { pagina: 1, ordem: "menor-preco" } });
    await userEvent.click(screen.getByRole("button", { name: /ORDENAR POR/ }));
    await userEvent.click(screen.getByRole("option", { name: "Mais recentes" }));
    expect(onAplicar).toHaveBeenCalledWith({ ordem: undefined, pagina: 1 });
  });
});

describe("Resultados > atalhos por categoria", () => {
  it("lista só os tipos informados, com contagem, e Todos", () => {
    montar();
    const nav = screen.getByRole("navigation", { name: "Categorias" });
    expect(within(nav).getAllByRole("link").map((a) => a.textContent)).toEqual(["Todos", "Apartamento (168)", "Cobertura (12)"]);
    expect(within(nav).queryByText(/Terreno/)).toBeNull();
  });

  it("marca o tipo ativo e linka com a página 1", () => {
    montar({ filtros: { pagina: 3, tipo: "Cobertura" } });
    expect(screen.getByRole("link", { name: "Cobertura (12)" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Todos" })).not.toHaveAttribute("aria-current");
    expect(screen.getByRole("link", { name: "Apartamento (168)" })).toHaveAttribute("href", "/imoveis?tipo=Apartamento");
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("href", "/imoveis");
  });

  it("sem filtro de tipo, Todos é o ativo", () => {
    montar({ filtros: { pagina: 1 } });
    expect(screen.getByRole("link", { name: "Todos" })).toHaveAttribute("aria-current", "true");
  });
});
