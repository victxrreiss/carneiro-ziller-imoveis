import { describe, expect, test } from "vitest";
import { combinaFinalidade, contextoVolta, filtrosParaQuery, lerFiltros, rotulosFiltros, tituloGrid } from "./filtros";

describe("lerFiltros", () => {
  test("aceita só valores conhecidos", () => {
    const f = lerFiltros(
      new URLSearchParams("finalidade=comprar&q=%20Belvedere%20&tipo=Apartamento&preco=3m-6m&area=200-400&quartos=3&vagas=2&pagina=2"),
    );
    expect(f).toEqual({
      finalidade: "comprar",
      q: "Belvedere",
      tipo: "Apartamento",
      preco: "3m-6m",
      area: "200-400",
      quartos: "3",
      vagas: "2",
      pagina: 2,
    });
  });

  test("descarta valores inválidos e página fora do padrão", () => {
    const f = lerFiltros(new URLSearchParams("finalidade=x&tipo=Castelo&quartos=9&vagas=5&pagina=-3&area=1"));
    expect(f).toEqual({ pagina: 1 });
  });

  test("faixa de preço só vale com finalidade compatível", () => {
    expect(lerFiltros(new URLSearchParams("preco=3m-6m")).preco).toBeUndefined();
    expect(lerFiltros(new URLSearchParams("finalidade=alugar&preco=3m-6m")).preco).toBeUndefined();
    expect(lerFiltros(new URLSearchParams("finalidade=alugar&preco=10k-30k")).preco).toBe("10k-30k");
    expect(lerFiltros(new URLSearchParams("finalidade=lancamentos&preco=ate-1.5m")).preco).toBe("ate-1.5m");
  });

  test("aceita o objeto de searchParams do Next", () => {
    expect(lerFiltros({ finalidade: "alugar", q: ["sion", "x"] })).toEqual({ finalidade: "alugar", q: "sion", pagina: 1 });
  });

  test("limita o tamanho da busca", () => {
    expect(lerFiltros(new URLSearchParams(`q=${"a".repeat(200)}`)).q).toHaveLength(80);
  });
});

describe("filtrosParaQuery", () => {
  test("ordem fixa e página só acima de 1", () => {
    expect(filtrosParaQuery({ quartos: "3", finalidade: "comprar", q: "belvedere", pagina: 1 })).toBe(
      "finalidade=comprar&q=belvedere&quartos=3",
    );
    expect(filtrosParaQuery({ pagina: 3 })).toBe("pagina=3");
    expect(filtrosParaQuery({ pagina: 1 })).toBe("");
  });
});

describe("rótulos e títulos", () => {
  test("chips na ordem do handoff", () => {
    const f = lerFiltros(new URLSearchParams("finalidade=alugar&tipo=Apartamento&preco=10k-30k&quartos=2&vagas=1&q=lourdes&area=100-200"));
    expect(rotulosFiltros(f).map((r) => r.rotulo)).toEqual([
      "Alugar",
      "“lourdes”",
      "Apartamento",
      "R$ 10 a 30 mil/mês",
      "100 a 200 m²",
      "2+ quartos",
      "1+ vagas",
    ]);
  });

  test("título conforme a finalidade", () => {
    expect(tituloGrid(undefined)).toBe("Todos os imóveis");
    expect(tituloGrid("comprar")).toBe("Imóveis à venda");
    expect(tituloGrid("alugar")).toBe("Imóveis para alugar");
    expect(tituloGrid("lancamentos")).toBe("Lançamentos");
  });
});

describe("contextoVolta", () => {
  test("com filtros do grid: volta com eles e mostra o resumo", () => {
    expect(contextoVolta("finalidade=comprar&q=belvedere&quartos=3", false)).toEqual({
      href: "/imoveis?finalidade=comprar&q=belvedere&quartos=3",
      rotulo: "VOLTAR AOS RESULTADOS",
      resumo: "Comprar · “belvedere” · 3+ quartos",
    });
  });

  test("vindo do grid de lançamentos: rótulo próprio, sem resumo", () => {
    expect(contextoVolta("finalidade=lancamentos", true)).toEqual({
      href: "/imoveis?finalidade=lancamentos",
      rotulo: "VOLTAR AOS LANÇAMENTOS",
      resumo: undefined,
    });
  });

  test("grid sem filtros", () => {
    expect(contextoVolta("", false)).toEqual({ href: "/imoveis", rotulo: "VOLTAR AOS RESULTADOS", resumo: undefined });
  });

  test("acesso direto", () => {
    expect(contextoVolta(undefined, false)).toEqual({ href: "/imoveis", rotulo: "VER TODOS OS IMÓVEIS", resumo: undefined });
    expect(contextoVolta(undefined, true)).toEqual({
      href: "/imoveis?finalidade=lancamentos",
      rotulo: "VOLTAR AOS LANÇAMENTOS",
      resumo: undefined,
    });
  });

  test("descarta parâmetros desconhecidos do de", () => {
    expect(contextoVolta("finalidade=comprar&redirect=https://x.com", false).href).toBe("/imoveis?finalidade=comprar");
  });

  test("mantém a página do grid", () => {
    expect(contextoVolta("finalidade=comprar&pagina=2", false).href).toBe("/imoveis?finalidade=comprar&pagina=2");
  });
});

describe("suítes e características", () => {
  test("lê e valida; característica desconhecida cai", () => {
    expect(lerFiltros(new URLSearchParams("suites=2&carac=piscina&carac=xxx&carac=academia"))).toEqual({
      suites: "2",
      carac: ["piscina", "academia"],
      pagina: 1,
    });
    expect(lerFiltros(new URLSearchParams("suites=9&carac=xxx"))).toEqual({ pagina: 1 });
  });

  test("monta a querystring (características na ordem canônica) e os rótulos", () => {
    const f = { suites: "2", carac: ["academia", "piscina"], pagina: 1 };
    expect(filtrosParaQuery(f)).toBe("suites=2&carac=piscina&carac=academia");
    const rotulos = rotulosFiltros(f).map((r) => r.rotulo);
    expect(rotulos).toContain("2+ suítes");
    expect(rotulos).toContain("Piscina");
    expect(rotulos).toContain("Academia");
  });

  test("Alugar aceita venda com valor de locação", () => {
    const venda = { finalidade: "venda" as const, lancamento: false };
    expect(combinaFinalidade("alugar", { ...venda, valorLocacao: 9000 })).toBe(true);
    expect(combinaFinalidade("alugar", { ...venda, valorLocacao: null })).toBe(false);
    expect(combinaFinalidade("comprar", { ...venda, valorLocacao: 9000 })).toBe(true);
  });
});
