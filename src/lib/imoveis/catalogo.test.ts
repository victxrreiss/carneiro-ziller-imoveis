import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { buscarImoveis as buscar, contarImoveis as contar, listarIdsImoveis as listarIds, obterImovel as obter } from "./catalogo";
import type { Filtros } from "./filtros";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const buscarImoveis = (f: Filtros) => buscar(f, amb.db);
const contarImoveis = (f: Filtros) => contar(f, amb.db);
const listarIdsImoveis = () => listarIds(amb.db);
const obterImovel = (id: string) => obter(id, amb.db);
const mudar = (id: string, valores: Partial<typeof imoveis.$inferInsert>) => amb.db.update(imoveis).set(valores).where(eq(imoveis.id, id));

describe("buscarImoveis", () => {
  test("sem filtros: 34 publicados (o indisponível sai do grid), 15 por página", async () => {
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.total).toBe(34);
    expect(r.paginas).toBe(3);
    expect(r.itens).toHaveLength(15);
    expect(r.itens[0].codigo).toBe("CZ1001");
    expect(r.itens.some((i) => i.codigo === "CZ1021")).toBe(false);
  });

  test("última página e página fora do intervalo", async () => {
    expect((await buscarImoveis({ pagina: 3 })).itens).toHaveLength(4);
    expect((await buscarImoveis({ pagina: 9 })).pagina).toBe(3);
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
