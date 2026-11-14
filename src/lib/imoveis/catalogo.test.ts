import { eq, inArray } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { carregarImoveis } from "@/lib/dados/consultas";
import { imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import {
  buscarImoveis as buscar,
  contarPorTipo as contarTipo,
  listarIdsImoveis as listarIds,
  listarParaSitemap as listarSitemap,
  obterImovel as obter,
  opcoesLocalizacao as opcoes,
  regioesComImoveis as regioesCom,
  semelhantes as semelhantesDe,
  temLancamentos as temLanc,
  validarLocal,
} from "./catalogo";
import type { FinalidadeFiltro, Filtros } from "./filtros";

// A leitura de imóveis continua a real; o espião só conta o que cada consulta trouxe do banco.
vi.mock("@/lib/dados/consultas", async (original) => {
  const real = await original<typeof import("@/lib/dados/consultas")>();
  return { ...real, carregarImoveis: vi.fn(real.carregarImoveis) };
});

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const buscarImoveis = (f: Filtros) => buscar(f, amb.db);
const contarImoveis = async (f: Filtros) => (await buscar(f, amb.db)).total;
const opcoesLocalizacao = () => opcoes(amb.db);
const contarPorTipo = (f: FinalidadeFiltro | undefined) => contarTipo(f, amb.db);
const temLancamentos = () => temLanc(amb.db);
const listarIdsImoveis = () => listarIds(amb.db);
const obterImovel = (id: string) => obter(id, amb.db);
const mudar = (id: string, valores: Partial<typeof imoveis.$inferInsert>) => amb.db.update(imoveis).set(valores).where(eq(imoveis.id, id));

describe("buscarImoveis", () => {
  test("sem filtros: 34 publicados (o indisponível sai do grid), 24 por página", async () => {
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.total).toBe(34);
    expect(r.paginas).toBe(2);
    expect(r.itens).toHaveLength(24);
    expect(r.itens.some((i) => i.codigo === "CZ1021")).toBe(false);
  });

  test("25 publicados: 24 + 1", async () => {
    await amb.db.update(imoveis).set({ situacao: "rascunho" }).where(inArray(imoveis.codigo, ["CZ1001", "CZ1002", "CZ1003", "CZ1004", "CZ1005", "CZ1006", "CZ1007", "CZ1008", "CZ1009"]));
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.total).toBe(25);
    expect(r.paginas).toBe(2);
    expect((await buscarImoveis({ pagina: 2 })).itens).toHaveLength(1);
  });

  test("última página e página fora do intervalo", async () => {
    expect((await buscarImoveis({ pagina: 2 })).itens).toHaveLength(10);
    expect((await buscarImoveis({ pagina: 9 })).pagina).toBe(2);
  });

  test("sem ordem: publicadoEm mais recente primeiro, empate pelo código, sem data por último", async () => {
    await amb.db.update(imoveis).set({ publicadoEm: new Date("2026-01-01T00:00:00Z") });
    await mudar("cz1030", { publicadoEm: new Date("2026-03-01T00:00:00Z") });
    await mudar("cz1010", { publicadoEm: new Date("2026-02-01T00:00:00Z") });
    await mudar("cz1005", { publicadoEm: null });
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.itens.slice(0, 4).map((i) => i.codigo)).toEqual(["CZ1030", "CZ1010", "CZ1001", "CZ1002"]);
    const ultima = await buscarImoveis({ pagina: 2 });
    expect(ultima.itens.at(-1)?.codigo).toBe("CZ1005");
  });

  test("ordem por preço em Alugar usa o aluguel do imóvel de venda", async () => {
    await mudar("cz1001", { finalidade: "venda", valor: 9_000_000, valorLocacao: 1 });
    await mudar("cz1002", { finalidade: "venda", valor: 100, valorLocacao: 900_000 });
    const menor = await buscarImoveis({ finalidade: "alugar", ordem: "menor-preco", pagina: 1 });
    expect(menor.itens[0].codigo).toBe("CZ1001");
    const maior = await buscarImoveis({ finalidade: "alugar", ordem: "maior-preco", pagina: 1 });
    expect(maior.itens[0].codigo).toBe("CZ1002");
    const efetivo = (i: (typeof menor.itens)[number]) => (i.finalidade === "venda" ? i.valorLocacao : i.valor) ?? 0;
    const valores = menor.itens.map(efetivo);
    expect(valores).toEqual([...valores].sort((a, b) => a - b));
  });

  test("ordem por preço e por área fora de Alugar usa o valor", async () => {
    const menor = (await buscarImoveis({ ordem: "menor-preco", pagina: 1 })).itens.map((i) => i.valor);
    expect(menor).toEqual([...menor].sort((a, b) => a - b));
    const area = (await buscarImoveis({ ordem: "maior-area", pagina: 1 })).itens.map((i) => i.area);
    expect(area).toEqual([...area].sort((a, b) => b - a));
  });

  test("local: cidade inteira ou bairro+cidade, sem acento nem caixa", async () => {
    const cidade = await buscarImoveis({ local: "Nova Lima", pagina: 1 });
    expect(cidade.total).toBeGreaterThan(0);
    expect(cidade.itens.every((i) => i.cidade === "Nova Lima")).toBe(true);
    const bairro = await buscarImoveis({ local: "vila da serra, nova lima", pagina: 1 });
    expect(bairro.total).toBeGreaterThan(0);
    expect(bairro.total).toBeLessThan(cidade.total);
    expect(bairro.itens.every((i) => i.bairro === "Vila da Serra" && i.cidade === "Nova Lima")).toBe(true);
    expect((await buscarImoveis({ local: "Vila da Serra, Belo Horizonte", pagina: 1 })).total).toBe(0);
    expect((await buscarImoveis({ local: "Inexistente", pagina: 1 })).total).toBe(0);
  });

  test("busca sem acento e sem caixa, também por código", async () => {
    // Comprar inclui os lançamentos à venda: lançamento é marcação, não finalidade.
    expect((await buscarImoveis({ q: "NOVA LIMA", finalidade: "comprar", pagina: 1 })).total).toBe(9);
    expect((await buscarImoveis({ q: "cz1009", pagina: 1 })).itens[0].titulo).toBe("Apartamento no Belvedere");
    expect((await buscarImoveis({ q: "sao bento", pagina: 1 })).total).toBe(1);
  });

  test("faixa de preço de aluguel e mínimos", async () => {
    const r = await buscarImoveis({ finalidade: "alugar", preco: "10k-30k", pagina: 1 });
    expect(r.itens.map((i) => i.codigo)).toEqual(["CZ1010", "CZ1030", "CZ1031", "CZ1033"]);
    expect((await buscarImoveis({ quartos: "5", pagina: 1 })).total).toBe(4);
  });

  test("sem resultados", async () => {
    expect((await buscarImoveis({ finalidade: "alugar", tipo: "Terreno", pagina: 1 })).total).toBe(0);
  });

  test("Lançamentos filtra pela marcação, em qualquer finalidade", async () => {
    expect(await contarImoveis({ finalidade: "lancamentos", pagina: 1 })).toBe(9);
    await mudar("cz1030", { lancamento: true });
    const r = await buscarImoveis({ finalidade: "lancamentos", pagina: 1 });
    expect(r.total).toBe(10);
    expect(r.itens.find((i) => i.codigo === "CZ1030")?.finalidade).toBe("locacao");
  });

  test("rascunho não aparece no site", async () => {
    await mudar("cz1005", { situacao: "rascunho" });
    expect((await buscarImoveis({ pagina: 1 })).total).toBe(33);
    expect(await obterImovel("cz1005")).toEqual({ situacao: "inexistente" });
    expect(await listarIdsImoveis()).not.toContain("cz1005");
  });

  test("as fotos vêm da URL pública do armazenamento", async () => {
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.itens.every((i) => i.foto.src.startsWith("https://fotos.teste/fotos/"))).toBe(true);
  });
});

describe("opcoesLocalizacao e validarLocal", () => {
  test("cidades e bairros dos publicados, em ordem alfabética", async () => {
    const o = await opcoesLocalizacao();
    const cidades = o.map((c) => c.cidade);
    expect(cidades).toEqual([...cidades].sort((a, b) => a.localeCompare(b, "pt-BR")));
    const nova = o.find((c) => c.cidade === "Nova Lima");
    expect(nova?.bairros).toContain("Vila da Serra");
    expect(nova?.bairros).toEqual([...(nova?.bairros ?? [])].sort((a, b) => a.localeCompare(b, "pt-BR")));
  });

  test("bairro vazio não vira opção; a cidade continua", async () => {
    await amb.db.update(imoveis).set({ bairro: "  " });
    const o = await opcoesLocalizacao();
    expect(o.length).toBeGreaterThan(0);
    expect(o.every((c) => c.bairros.length === 0)).toBe(true);
  });

  test("rascunho não aparece nas opções", async () => {
    await amb.db.update(imoveis).set({ situacao: "rascunho" });
    expect(await opcoesLocalizacao()).toEqual([]);
  });

  test("validarLocal usa a grafia do catálogo, descarta o desconhecido e respeita a cidade", () => {
    const o = [
      { cidade: "Belo Horizonte", bairros: ["Centro"] },
      { cidade: "Nova Lima", bairros: ["Centro", "Vila da Serra"] },
    ];
    expect(validarLocal({ local: "vila da serra, nova lima", pagina: 1 }, o).local).toBe("Vila da Serra, Nova Lima");
    expect(validarLocal({ local: "NOVA LIMA", pagina: 1 }, o).local).toBe("Nova Lima");
    expect(validarLocal({ local: "Inexistente", pagina: 2 }, o)).toEqual({ pagina: 2 });
    expect(validarLocal({ local: "Vila da Serra, Belo Horizonte", pagina: 1 }, o)).toEqual({ pagina: 1 });
    expect(validarLocal({ local: "centro, belo horizonte", pagina: 1 }, o).local).toBe("Centro, Belo Horizonte");
    expect(validarLocal({ pagina: 1 }, o)).toEqual({ pagina: 1 });
  });
});

describe("contarPorTipo", () => {
  test("só tipos com total, na ordem de TIPOS, somando os publicados", async () => {
    const t = await contarPorTipo(undefined);
    expect(t.every((x) => x.total > 0)).toBe(true);
    expect(t.reduce((n, x) => n + x.total, 0)).toBe(34);
    expect(t.some((x) => x.tipo === "Terreno" && x.total === 0)).toBe(false);
  });

  test("conta só o que combina com a finalidade", async () => {
    const alugar = await contarPorTipo("alugar");
    expect(alugar.reduce((n, x) => n + x.total, 0)).toBe(await contarImoveis({ finalidade: "alugar", pagina: 1 }));
    expect(alugar.some((x) => x.tipo === "Terreno")).toBe(false);
    expect(alugar.length).toBeLessThan((await contarPorTipo(undefined)).length);
  });
});

describe("obterImovel", () => {
  test("imóvel completo do handoff", async () => {
    const r = await obterImovel("cz1009");
    expect(r.situacao).toBe("disponivel");
    if (r.situacao !== "disponivel") return;
    expect(r.imovel.fotos).toHaveLength(6);
    expect(r.imovel.descricao).toHaveLength(2);
    expect(r.imovel.uf).toBe("MG");
    expect(r.imovel.lancamento).toBe(false);
  });

  test("lançamento é venda marcada", async () => {
    const r = await obterImovel("cz1015");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.finalidade).toBe("venda");
    expect(r.imovel.lancamento).toBe(true);
  });

  test("sem quartos e vagas", async () => {
    const r = await obterImovel("cz1026");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.quartos).toBeNull();
    expect(r.imovel.vagas).toBeNull();
    expect(r.imovel.fotos).toHaveLength(1);
  });

  test("imóvel do grid sem ficha completa usa a foto do card e a descrição montada", async () => {
    const r = await obterImovel("cz1005");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.fotos).toHaveLength(1);
    expect(r.imovel.descricao).toHaveLength(1);
  });

  test("indisponível e inexistente", async () => {
    expect(await obterImovel("cz1021")).toEqual({ situacao: "indisponivel", codigo: "CZ1021" });
    expect(await obterImovel("cz9999")).toEqual({ situacao: "inexistente" });
    expect(await obterImovel("CZ1009")).toEqual({ situacao: "inexistente" });
  });

  test("ids para pré-renderizar: publicados e indisponíveis", async () => {
    expect(await listarIdsImoveis()).toHaveLength(35);
  });
});

describe("banco vazio (produção começa assim)", () => {
  test("nada quebra: grid vazio, imóvel inexistente, sem ids", async () => {
    await amb.reiniciar();
    expect(await buscarImoveis({ pagina: 1 })).toMatchObject({ total: 0, pagina: 1, paginas: 1, itens: [] });
    expect(await obterImovel("cz1001")).toEqual({ situacao: "inexistente" });
    expect(await listarIdsImoveis()).toEqual([]);
  });
});

describe("ficha completa e privacidade do endereço", () => {
  const secreto = { endereco: "Rua Secreta", numero: "99", complemento: "1201", cep: "30000-000", referenciaLoft: "777" };

  test("o Imovel público não tem endereço nem referência da Loft", async () => {
    await mudar("cz1009", secreto);
    const r = await obterImovel("cz1009");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    for (const k of ["endereco", "numero", "complemento", "cep", "referenciaLoft"]) expect(r.imovel).not.toHaveProperty(k);
    expect(JSON.stringify(r.imovel)).not.toMatch(/Rua Secreta|30000-000|1201|777/);
  });

  test("busca pública não encontra pelo endereço nem pela referência", async () => {
    await mudar("cz1009", secreto);
    expect((await buscarImoveis({ q: "Rua Secreta", pagina: 1 })).total).toBe(0);
    expect((await buscarImoveis({ q: "30000-000", pagina: 1 })).total).toBe(0);
    expect((await buscarImoveis({ q: "777", pagina: 1 })).total).toBe(0);
  });

  test("a ficha traz os campos novos; característica desconhecida cai fora", async () => {
    await mudar("cz1009", {
      banheiros: 5,
      suites: 3,
      areaTotal: 500,
      condominio: 4200,
      iptu: 9000,
      valorLocacao: 25000,
      andar: 12,
      anoConstrucao: 2015,
      empreendimento: "Edifício Aurora",
      caracteristicas: ["piscina", "inexistente", "academia"],
    });
    const r = await obterImovel("cz1009");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel).toMatchObject({ banheiros: 5, suites: 3, areaTotal: 500, condominio: 4200, iptu: 9000, valorLocacao: 25000, andar: 12, anoConstrucao: 2015, empreendimento: "Edifício Aurora" });
    expect(r.imovel.caracteristicas).toEqual([
      { chave: "piscina", rotulo: "Piscina" },
      { chave: "academia", rotulo: "Academia" },
    ]);
  });

  test("busca encontra pelo empreendimento", async () => {
    await mudar("cz1009", { empreendimento: "Edifício Aurora" });
    expect((await buscarImoveis({ q: "aurora", pagina: 1 })).itens.map((i) => i.id)).toEqual(["cz1009"]);
  });

  test("alugar inclui venda com valor de locação, e a faixa usa o valor de locação", async () => {
    await mudar("cz1009", { valorLocacao: 12000 });
    const r = await buscarImoveis({ finalidade: "alugar", preco: "10k-30k", pagina: 1 });
    expect(r.itens.map((i) => i.id)).toContain("cz1009");
    expect(r.itens.find((i) => i.id === "cz1009")?.valorLocacao).toBe(12000);
    expect((await buscarImoveis({ finalidade: "alugar", preco: "60k+", pagina: 1 })).itens.map((i) => i.id)).not.toContain("cz1009");
  });

  test("filtros de suítes e características", async () => {
    await mudar("cz1009", { suites: 2, caracteristicas: ["piscina", "academia"] });
    await mudar("cz1010", { suites: 1, caracteristicas: ["piscina"] });
    const ids = async (f: Filtros) => (await buscarImoveis(f)).itens.map((i) => i.id).sort();
    expect(await ids({ suites: "2", pagina: 1 })).toEqual(["cz1009"]);
    expect(await ids({ suites: "1", pagina: 1 })).toEqual(["cz1009", "cz1010"]);
    expect(await ids({ carac: ["piscina"], pagina: 1 })).toEqual(["cz1009", "cz1010"]);
    expect(await ids({ carac: ["piscina", "academia"], pagina: 1 })).toEqual(["cz1009"]);
  });
});

describe("temLancamentos (menu)", () => {
  test("verdadeiro com lançamento publicado na semente", async () => {
    expect(await temLancamentos()).toBe(true);
  });

  test("falso sem nenhum lançamento", async () => {
    await amb.db.update(imoveis).set({ lancamento: false });
    expect(await temLancamentos()).toBe(false);
  });

  test("lançamento em rascunho não conta", async () => {
    await amb.db.update(imoveis).set({ lancamento: false });
    await mudar("cz1001", { lancamento: true, situacao: "rascunho" });
    expect(await temLancamentos()).toBe(false);
    await mudar("cz1001", { situacao: "publicado" });
    expect(await temLancamentos()).toBe(true);
  });
});

describe("listarParaSitemap", () => {
  test("só publicados (sem rascunho nem indisponível), com alteradoEm ISO", async () => {
    await mudar("cz1001", { situacao: "rascunho" });
    const lista = await listarSitemap(amb.db);
    expect(lista).toHaveLength(34 - 1);
    expect(lista.some((i) => i.id === "cz1001" || i.id === "cz1021")).toBe(false);
    expect(lista[0].alteradoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  test("publicado incompleto (sem área) fica fora: a página o mostra como indisponível", async () => {
    await mudar("cz1002", { area: null });
    const lista = await listarSitemap(amb.db);
    expect(lista.some((i) => i.id === "cz1002")).toBe(false);
    expect(lista).toHaveLength(34 - 1);
  });
});

// Deixa só os imóveis dados publicados (os demais viram rascunho) com os valores pedidos.
async function montar(itens: Record<string, Partial<typeof imoveis.$inferInsert>>) {
  await amb.db.update(imoveis).set({ situacao: "rascunho" });
  for (const [id, valores] of Object.entries(itens)) await mudar(id, { situacao: "publicado", ...valores });
}
const semelhantes = (id: string) => semelhantesDe(id, amb.db);
const codigos = (l: { id: string }[]) => l.map((i) => i.id);

describe("regiões", () => {
  test("regiao válida filtra Belvedere (BH) e Vila da Serra (Nova Lima) juntos", async () => {
    await montar({
      cz1001: { bairro: "Belvedere", cidade: "Belo Horizonte" },
      cz1002: { bairro: "Vila da Serra", cidade: "Nova Lima" },
      cz1003: { bairro: "Vila da Serra", cidade: "Belo Horizonte" },
      cz1004: { bairro: "Lourdes", cidade: "Belo Horizonte" },
    });
    const r = await buscarImoveis({ regiao: "belvedere-vila-da-serra", pagina: 1 });
    expect(r.itens.map((i) => i.id).sort()).toEqual(["cz1001", "cz1002"]);
    expect(await contarImoveis({ regiao: "belvedere-vila-da-serra", pagina: 1 })).toBe(2);
  });

  test("regioesComImoveis omite região sem imóvel publicado", async () => {
    await montar({
      cz1001: { bairro: "Belvedere", cidade: "Belo Horizonte" },
      cz1002: { bairro: "Vila da Serra", cidade: "Nova Lima" },
      cz1003: { bairro: "Vale do Sereno", cidade: "Nova Lima" },
      cz1004: { bairro: "Lourdes", cidade: "Belo Horizonte", situacao: "rascunho" },
    });
    const r = await regioesCom(amb.db);
    expect(r.map((x) => [x.slug, x.total])).toEqual([
      ["belvedere-vila-da-serra", 2],
      ["vale-do-sereno", 1],
    ]);
  });
});

describe("semelhantes", () => {
  const base = { tipo: "Apartamento", finalidade: "venda", cidade: "Belo Horizonte", valor: 1_000_000 } as const;

  test("mesmo tipo e cidade a até 30% primeiro, ordenados pela diferença de preço", async () => {
    await montar({
      cz1001: base,
      cz1002: { ...base, valor: 1_250_000 },
      cz1003: { ...base, valor: 950_000 },
      cz1004: { ...base, valor: 1_300_000 },
      cz1005: { ...base, valor: 1_400_000 }, // fora dos 30%, mesma cidade
      cz1006: { ...base, valor: 1_010_000, tipo: "Casa" },
    });
    expect(codigos(await semelhantes("cz1001"))).toEqual(["cz1003", "cz1002", "cz1004"]);
  });

  test("completa com outra cidade quando faltam", async () => {
    await montar({
      cz1001: base,
      cz1002: { ...base, valor: 1_100_000 },
      cz1003: { ...base, cidade: "Nova Lima", valor: 1_050_000 },
      cz1004: { ...base, cidade: "Nova Lima", valor: 1_020_000 },
      cz1005: { ...base, cidade: "Nova Lima", valor: 1_900_000 },
    });
    expect(codigos(await semelhantes("cz1001"))).toEqual(["cz1002", "cz1004", "cz1003"]);
  });

  test("nunca inclui o próprio imóvel nem rascunho", async () => {
    await montar({
      cz1001: base,
      cz1002: { ...base, valor: 1_000_001 },
      cz1003: { ...base, valor: 1_000_002, situacao: "rascunho" },
    });
    expect(codigos(await semelhantes("cz1001"))).toEqual(["cz1002"]);
  });

  test("de imóvel sem valor ignora o preço", async () => {
    await montar({
      cz1001: base,
      cz1002: { ...base, valor: 9_000_000 },
      cz1003: { ...base, valor: 100_000, cidade: "Nova Lima" },
      cz1004: { ...base, valor: 5_000_000 },
    });
    // Sem valor o imóvel não é "completo" (não é candidato), mas continua sendo ponto de partida.
    await mudar("cz1001", { valor: null });
    expect(codigos(await semelhantes("cz1001"))).toEqual(["cz1002", "cz1004", "cz1003"]);
  });

  test("lê do banco só os candidatos (publicados do mesmo tipo e finalidade), não o catálogo inteiro", async () => {
    // A semente inteira publicada: 34 imóveis de vários tipos e finalidades.
    const espiao = vi.mocked(carregarImoveis);
    espiao.mockClear();
    const r = await semelhantes("cz1009"); // Apartamento à venda
    expect(r.length).toBeGreaterThan(0);
    const lidos = (await Promise.all(espiao.mock.results.map((x) => x.value))).flat();
    expect(lidos.length).toBeGreaterThan(0);
    expect(lidos.length).toBeLessThan(34);
    for (const i of lidos) expect([i.situacao, i.tipo, i.finalidade, i.id === "cz1009"]).toEqual(["publicado", "Apartamento", "venda", false]);
  });

  test("de imóvel de locação só traz locação", async () => {
    await montar({
      cz1001: { ...base, finalidade: "locacao", valor: 10_000 },
      cz1002: { ...base, finalidade: "venda", valor: 10_000 },
      cz1003: { ...base, finalidade: "locacao", valor: 11_000 },
    });
    expect(codigos(await semelhantes("cz1001"))).toEqual(["cz1003"]);
  });
});
