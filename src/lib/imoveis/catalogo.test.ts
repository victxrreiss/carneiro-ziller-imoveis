import { beforeEach, describe, expect, test } from "vitest";
import { banco, reiniciarBanco } from "@/lib/dados/banco";
import { buscarImoveis, contarImoveis, listarIdsImoveis, obterImovel } from "./catalogo";

beforeEach(() => {
  reiniciarBanco();
});

describe("buscarImoveis", () => {
  test("sem filtros: 34 publicados (o indisponível sai do grid), 15 por página", () => {
    const r = buscarImoveis({ pagina: 1 });
    expect(r.total).toBe(34);
    expect(r.paginas).toBe(3);
    expect(r.itens).toHaveLength(15);
    expect(r.itens[0].codigo).toBe("CZ1001");
    expect(r.itens.some((i) => i.codigo === "CZ1021")).toBe(false);
  });

  test("última página e página fora do intervalo", () => {
    expect(buscarImoveis({ pagina: 3 }).itens).toHaveLength(4);
    expect(buscarImoveis({ pagina: 9 }).pagina).toBe(3);
  });

  test("busca sem acento e sem caixa, também por código", () => {
    // Comprar inclui os lançamentos à venda: lançamento é marcação, não finalidade.
    expect(buscarImoveis({ q: "NOVA LIMA", finalidade: "comprar", pagina: 1 }).total).toBe(9);
    expect(buscarImoveis({ q: "cz1009", pagina: 1 }).itens[0].titulo).toBe("Apartamento no Belvedere");
    expect(buscarImoveis({ q: "sao bento", pagina: 1 }).total).toBe(1);
  });

  test("faixa de preço de aluguel e mínimos", () => {
    const r = buscarImoveis({ finalidade: "alugar", preco: "10k-30k", pagina: 1 });
    expect(r.itens.map((i) => i.codigo)).toEqual(["CZ1010", "CZ1030", "CZ1031", "CZ1033"]);
    expect(buscarImoveis({ quartos: "5", pagina: 1 }).total).toBe(4);
  });

  test("sem resultados", () => {
    expect(buscarImoveis({ finalidade: "alugar", tipo: "Terreno", pagina: 1 }).total).toBe(0);
  });

  test("Lançamentos filtra pela marcação, em qualquer finalidade", () => {
    expect(contarImoveis({ finalidade: "lancamentos", pagina: 1 })).toBe(9);
    banco().imoveis.get("cz1030")!.lancamento = true;
    const r = buscarImoveis({ finalidade: "lancamentos", pagina: 1 });
    expect(r.total).toBe(10);
    expect(r.itens.find((i) => i.codigo === "CZ1030")?.finalidade).toBe("locacao");
  });

  test("rascunho não aparece no site", () => {
    banco().imoveis.get("cz1005")!.situacao = "rascunho";
    expect(buscarImoveis({ pagina: 1 }).total).toBe(33);
    expect(obterImovel("cz1005")).toEqual({ situacao: "inexistente" });
    expect(listarIdsImoveis()).not.toContain("cz1005");
  });
});

describe("obterImovel", () => {
  test("imóvel completo do handoff", () => {
    const r = obterImovel("cz1009");
    expect(r.situacao).toBe("disponivel");
    if (r.situacao !== "disponivel") return;
    expect(r.imovel.fotos).toHaveLength(6);
    expect(r.imovel.descricao).toHaveLength(2);
    expect(r.imovel.uf).toBe("MG");
    expect(r.imovel.lancamento).toBe(false);
  });

  test("lançamento é venda marcada", () => {
    const r = obterImovel("cz1015");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.finalidade).toBe("venda");
    expect(r.imovel.lancamento).toBe(true);
  });

  test("sem quartos e vagas", () => {
    const r = obterImovel("cz1026");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.quartos).toBeNull();
    expect(r.imovel.vagas).toBeNull();
    expect(r.imovel.fotos).toHaveLength(1);
  });

  test("imóvel do grid sem ficha completa usa a foto do card", () => {
    const r = obterImovel("cz1005");
    if (r.situacao !== "disponivel") throw new Error("esperava disponível");
    expect(r.imovel.fotos).toHaveLength(1);
    expect(r.imovel.descricao).toEqual([]);
  });

  test("indisponível e inexistente", () => {
    expect(obterImovel("cz1021")).toEqual({ situacao: "indisponivel", codigo: "CZ1021" });
    expect(obterImovel("cz9999")).toEqual({ situacao: "inexistente" });
    expect(obterImovel("CZ1009")).toEqual({ situacao: "inexistente" });
  });

  test("ids para pré-renderizar: publicados e indisponíveis", () => {
    expect(listarIdsImoveis()).toHaveLength(35);
  });
});
