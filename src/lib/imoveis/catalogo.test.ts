import { describe, expect, test } from "vitest";
import { buscarImoveis, contarImoveis, listarIdsImoveis, obterImovel } from "./index";

describe("buscarImoveis", () => {
  test("sem filtros: 35 imóveis, 15 por página", async () => {
    const r = await buscarImoveis({ pagina: 1 });
    expect(r.total).toBe(35);
    expect(r.paginas).toBe(3);
    expect(r.itens).toHaveLength(15);
    expect(r.itens[0].codigo).toBe("CZ1001");
  });

  test("última página e página fora do intervalo", async () => {
    expect((await buscarImoveis({ pagina: 3 })).itens).toHaveLength(5);
    const fora = await buscarImoveis({ pagina: 9 });
    expect(fora.pagina).toBe(3);
  });

  test("busca sem acento e sem caixa, também por código", async () => {
    expect((await buscarImoveis({ q: "NOVA LIMA", finalidade: "comprar", pagina: 1 })).total).toBe(6);
    expect((await buscarImoveis({ q: "cz1009", pagina: 1 })).itens[0].titulo).toBe("Apartamento no Belvedere");
    expect((await buscarImoveis({ q: "sao bento", pagina: 1 })).total).toBe(1);
  });

  test("faixa de preço de aluguel e mínimos", async () => {
    const r = await buscarImoveis({ finalidade: "alugar", preco: "10k-30k", pagina: 1 });
    expect(r.itens.map((i) => i.codigo)).toEqual(["CZ1010", "CZ1030", "CZ1031", "CZ1033"]);
    expect((await buscarImoveis({ quartos: "5", pagina: 1 })).total).toBe(5);
  });

  test("sem resultados", async () => {
    expect((await buscarImoveis({ finalidade: "alugar", tipo: "Terreno", pagina: 1 })).total).toBe(0);
  });

  test("contagem para o painel mobile", async () => {
    expect(await contarImoveis({ finalidade: "lancamentos", pagina: 1 })).toBe(9);
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
  });

  test("sem quartos e vagas", async () => {
    const r = await obterImovel("cz1026");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.quartos).toBeNull();
    expect(r.imovel.vagas).toBeNull();
    expect(r.imovel.fotos).toHaveLength(1);
  });

  test("imóvel do grid sem ficha completa usa a foto do card", async () => {
    const r = await obterImovel("cz1005");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.fotos).toHaveLength(1);
    expect(r.imovel.descricao).toEqual([]);
  });

  test("indisponível e inexistente", async () => {
    expect(await obterImovel("cz1021")).toEqual({ situacao: "indisponivel", codigo: "CZ1021" });
    expect(await obterImovel("cz9999")).toEqual({ situacao: "inexistente" });
    expect(await obterImovel("CZ1009")).toEqual({ situacao: "inexistente" });
  });

  test("ids para pré-renderizar", async () => {
    expect(await listarIdsImoveis()).toHaveLength(35);
  });
});
