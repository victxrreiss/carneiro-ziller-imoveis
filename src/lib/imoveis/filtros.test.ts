import { describe, expect, test } from "vitest";
import { combinaFinalidade, contextoVolta, filtrosParaQuery, lerFiltros, pluralTipo, rotulosFiltros, semFiltro, temFiltroAvancado, tituloGrid, TIPOS, urlGrid } from "./filtros";

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

describe("ordem e local", () => {
  test("lê ordem e local; ordem inválida é descartada; local é aparado e limitado", () => {
    expect(lerFiltros(new URLSearchParams("ordem=maior-preco&local=Vila da Serra, Nova Lima"))).toEqual({
      ordem: "maior-preco",
      local: "Vila da Serra, Nova Lima",
      pagina: 1,
    });
    expect(lerFiltros(new URLSearchParams("ordem=xyz"))).toEqual({ pagina: 1 });
    expect(lerFiltros(new URLSearchParams("local=%20%20"))).toEqual({ pagina: 1 });
    expect(lerFiltros(new URLSearchParams(`local=${"a".repeat(200)}`)).local).toHaveLength(80);
  });

  test("query na ordem canônica: local depois de q, ordem antes de pagina", () => {
    const f = { ordem: "maior-preco", local: "Nova Lima", q: "x", tipo: "Casa", pagina: 2 } as const;
    expect(filtrosParaQuery(f)).toBe("q=x&local=Nova+Lima&tipo=Casa&ordem=maior-preco&pagina=2");
    expect(urlGrid({ ordem: "menor-preco", pagina: 1 })).toBe("/imoveis?ordem=menor-preco");
  });

  test("local vira chip e semFiltro o remove; ordem não é chip", () => {
    const f = { local: "Nova Lima", ordem: "maior-area", pagina: 3 } as const;
    expect(rotulosFiltros(f)).toEqual([{ chave: "local", rotulo: "Nova Lima" }]);
    expect(semFiltro(f, "local")).toEqual({ local: undefined, ordem: "maior-area", pagina: 1 });
  });

  test("o voltar aos resultados mantém ordem e local", () => {
    const v = contextoVolta("local=Nova+Lima&ordem=menor-preco", false);
    expect(v.href).toBe("/imoveis?local=Nova+Lima&ordem=menor-preco");
    expect(v.resumo).toBe("Nova Lima");
  });
});

describe("região", () => {
  test("regiao desconhecida é descartada", () => {
    expect(lerFiltros(new URLSearchParams("regiao=nao-existe"))).toEqual({ pagina: 1 });
  });

  test("regiao e local juntos: vale a regiao", () => {
    expect(lerFiltros(new URLSearchParams("regiao=lourdes-savassi&local=Nova+Lima"))).toEqual({ regiao: "lourdes-savassi", pagina: 1 });
    expect(lerFiltros(new URLSearchParams("regiao=nao-existe&local=Nova+Lima"))).toEqual({ local: "Nova Lima", pagina: 1 });
  });

  test("urlGrid mantém regiao na ordem canônica, logo depois de local", () => {
    expect(urlGrid({ regiao: "lourdes-savassi", tipo: "Casa", q: "x", pagina: 2 })).toBe("/imoveis?q=x&regiao=lourdes-savassi&tipo=Casa&pagina=2");
  });

  test("a região vira chip com o nome e semFiltro a remove", () => {
    const f = { regiao: "belvedere-vila-da-serra", pagina: 3 };
    expect(rotulosFiltros(f)).toEqual([{ chave: "regiao", rotulo: "Belvedere e Vila da Serra" }]);
    expect(semFiltro(f, "regiao")).toEqual({ regiao: undefined, pagina: 1 });
  });
});

describe("lerFiltros: `local` repetido (busca da Home sem JavaScript)", () => {
  test("vale o último preenchido, na URL e no objeto de searchParams", () => {
    expect(lerFiltros(new URLSearchParams("local=Nova+Lima&local=Vila+da+Serra%2C+Nova+Lima")).local).toBe("Vila da Serra, Nova Lima");
    expect(lerFiltros({ local: ["Nova Lima", "Vila da Serra, Nova Lima"] }).local).toBe("Vila da Serra, Nova Lima");
  });

  test("vazios não contam: só a cidade, só o bairro ou nenhum", () => {
    expect(lerFiltros(new URLSearchParams("local=Nova+Lima&local=")).local).toBe("Nova Lima");
    expect(lerFiltros(new URLSearchParams("local=&local=Lourdes%2C+Belo+Horizonte")).local).toBe("Lourdes, Belo Horizonte");
    expect(lerFiltros(new URLSearchParams("local=&local=+")).local).toBeUndefined();
    expect(lerFiltros({ local: "Nova Lima" }).local).toBe("Nova Lima");
  });

  test("com região válida, `local` continua sem valer", () => {
    expect(lerFiltros(new URLSearchParams("regiao=lourdes-savassi&local=Nova+Lima&local=")).local).toBeUndefined();
  });
});

describe("filtros avançados", () => {
  test("preço, área, vagas, suítes, texto, características e ordem são avançados; os principais não", () => {
    for (const f of [{ preco: "3m-6m" }, { area: "100-200" }, { vagas: "1" }, { suites: "2" }, { q: "cz" }, { carac: ["piscina"] }, { ordem: "menor-preco" as const }]) {
      expect(temFiltroAvancado({ ...f, pagina: 1 }), JSON.stringify(f)).toBe(true);
    }
    expect(temFiltroAvancado({ pagina: 3 })).toBe(false);
    expect(temFiltroAvancado({ finalidade: "comprar", tipo: "Casa", local: "Nova Lima", regiao: "lourdes-savassi", quartos: "2", carac: [], pagina: 1 })).toBe(false);
  });
});

describe("pluralTipo", () => {
  test("todo tipo da busca tem plural; tipo desconhecido não", () => {
    for (const t of TIPOS) expect(pluralTipo(t)).toBeTruthy();
    expect(pluralTipo("Cobertura")).toBe("Coberturas");
    expect(pluralTipo("Casa em condomínio")).toBe("Casas em condomínio");
    expect(pluralTipo("Galpão")).toBeUndefined();
  });
});
