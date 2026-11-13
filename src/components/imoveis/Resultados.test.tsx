import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import type { ImovelResumo } from "@/lib/imoveis";
import type { Filtros } from "@/lib/imoveis/filtros";
import { numerosPaginacao, Resultados } from "./Resultados";

const imovel: ImovelResumo = {
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
const pagina = (extra: Partial<{ total: number; pagina: number; paginas: number }> = {}) => ({ itens: [imovel], total: 1, pagina: 1, paginas: 1, ...extra });

function montar(filtros: Filtros, extra: Partial<ComponentProps<typeof Resultados>> = {}) {
  const onAplicar = vi.fn();
  const onPagina = vi.fn();
  const r = render(
    <Resultados
      estado={{ tipo: "ok", resultado: pagina() }}
      filtros={filtros}
      escolhidos={filtros}
      onPagina={onPagina}
      onAplicar={onAplicar}
      onLimpar={vi.fn()}
      onTentarDeNovo={vi.fn()}
      {...extra}
    />,
  );
  return { onAplicar, onPagina, ...r };
}

describe("Resultados > filtros ativos", () => {
  test("chips continuam removendo cada filtro, incluindo regiao", async () => {
    const filtros: Filtros = {
      finalidade: "comprar",
      q: "vista",
      regiao: "belvedere-vila-da-serra",
      tipo: "Cobertura",
      preco: "6m-10m",
      area: "400-800",
      quartos: "4",
      vagas: "2",
      suites: "3",
      carac: ["piscina", "varanda"],
      ordem: "maior-preco",
      pagina: 2,
    };
    const { onAplicar } = montar(filtros);
    const chips = screen.getAllByRole("button", { name: /^Remover filtro / }).map((b) => b.getAttribute("aria-label")!.replace("Remover filtro ", ""));
    expect(chips).toEqual([
      "Comprar",
      "“vista”",
      "Belvedere e Vila da Serra",
      "Cobertura",
      "R$ 6 a 10 milhões",
      "400 a 800 m²",
      "4+ quartos",
      "2+ vagas",
      "3+ suítes",
      "Piscina",
      "Varanda",
    ]);

    const remover = async (rotulo: string) => {
      await userEvent.click(screen.getByRole("button", { name: `Remover filtro ${rotulo}` }));
      return onAplicar.mock.lastCall![0] as Filtros;
    };
    const semRegiao = await remover("Belvedere e Vila da Serra");
    expect(semRegiao).toEqual({ ...filtros, regiao: undefined, pagina: 1 });
    expect(semRegiao.regiao).toBeUndefined();
    expect((await remover("Cobertura")).tipo).toBeUndefined();
    expect((await remover("“vista”")).q).toBeUndefined();
    expect((await remover("4+ quartos")).quartos).toBeUndefined();
    expect((await remover("2+ vagas")).vagas).toBeUndefined();
    expect((await remover("3+ suítes")).suites).toBeUndefined();
    expect((await remover("400 a 800 m²")).area).toBeUndefined();
    expect((await remover("R$ 6 a 10 milhões")).preco).toBeUndefined();
    expect((await remover("Piscina")).carac).toEqual(["varanda"]);
    // Sem finalidade, a faixa de preço também sai; a ordem fica.
    expect(await remover("Comprar")).toEqual({ ...filtros, finalidade: undefined, preco: undefined, pagina: 1 });
  });

  test("local também é chip; sem filtro não há lista de chips", async () => {
    const { onAplicar, unmount } = montar({ local: "Vila da Serra, Nova Lima", pagina: 1 });
    await userEvent.click(screen.getByRole("button", { name: "Remover filtro Vila da Serra, Nova Lima" }));
    expect(onAplicar).toHaveBeenCalledWith({ local: undefined, pagina: 1 });
    unmount();
    montar({ pagina: 1 });
    expect(screen.queryByRole("list", { name: "Filtros ativos" })).toBeNull();
  });
});

describe("Resultados > lista", () => {
  test("mostra o total e os cards, sem os atalhos por tipo nem ordenação fora dos avançados", () => {
    const { container } = montar({ pagina: 1 }, { estado: { tipo: "ok", resultado: pagina({ total: 34, paginas: 3 }) } });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("34 imóveis encontrados");
    expect(container.querySelectorAll("ul.cards > li .cz-card")).toHaveLength(1);
    expect(screen.queryByRole("navigation", { name: "Categorias" })).toBeNull();
    expect(screen.queryByLabelText(/ordenar/i)).toBeNull();
  });

  test("paginação: Anterior e Próxima só quando existem", async () => {
    const { onPagina, unmount } = montar({ pagina: 1 }, { estado: { tipo: "ok", resultado: pagina({ total: 34, paginas: 3 }) } });
    expect(screen.queryByRole("button", { name: "Página anterior" })).toBeNull();
    expect(screen.getByRole("button", { name: "Página 1" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(screen.getByRole("button", { name: "Próxima página" }));
    expect(onPagina).toHaveBeenCalledWith(2);
    unmount();
    montar({ pagina: 3 }, { estado: { tipo: "ok", resultado: pagina({ total: 34, pagina: 3, paginas: 3 }) } });
    expect(screen.queryByRole("button", { name: "Próxima página" })).toBeNull();
    expect(screen.getByRole("button", { name: "Página anterior" })).toBeInTheDocument();
    expect(numerosPaginacao(6, 12)).toEqual([1, "gap", 5, 6, 7, "gap", 12]);
  });

  test("um imóvel no singular; nenhum mostra o aviso com Limpar filtros", () => {
    const um = montar({ pagina: 1 });
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("1 imóvel encontrado");
    um.unmount();
    montar({ tipo: "Terreno", pagina: 1 }, { estado: { tipo: "ok", resultado: { itens: [], total: 0, pagina: 1, paginas: 1 } } });
    expect(screen.getByRole("heading", { name: "Nenhum imóvel encontrado" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "LIMPAR FILTROS" })).toBeInTheDocument();
  });
});
