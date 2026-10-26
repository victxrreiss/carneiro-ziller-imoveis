import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { configuracaoSite, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { lancamentosHome as lancamentos, locacaoHome as locacao, oportunidadeDeHoje as oportunidade, regioesHome, vendaHome as venda } from "./catalogo";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const lancamentosHome = () => lancamentos(amb.db);
const locacaoHome = () => locacao(amb.db);
const vendaHome = () => venda(amb.db);
const oportunidadeDeHoje = () => oportunidade(amb.db);
const mudar = (id: string, valores: Partial<typeof imoveis.$inferInsert>) => amb.db.update(imoveis).set(valores).where(eq(imoveis.id, id));
const escolher = (id: string | null) => amb.db.update(configuracaoSite).set({ oportunidadeId: id });

describe("Home: Oportunidade de hoje (escolha do ADMIN)", () => {
  test("é o CZ1009 na semente", async () => {
    const d = await oportunidadeDeHoje();
    expect(d?.codigo).toBe("CZ1009");
    expect(d?.valor).toBe("R$ 7.890.000");
    expect(d?.quartos).toBe("4");
  });

  test("some quando não há imóvel escolhido ou ele não está publicado", async () => {
    await mudar("cz1009", { situacao: "indisponivel" });
    expect(await oportunidadeDeHoje()).toBeNull();
    await mudar("cz1009", { situacao: "publicado" });
    await escolher(null);
    expect(await oportunidadeDeHoje()).toBeNull();
  });

  test("banco recém-criado, sem configuração: seção vazia", async () => {
    await amb.reiniciar();
    expect(await oportunidadeDeHoje()).toBeNull();
  });

  test("terreno não mostra quartos nem vagas", async () => {
    await escolher("cz1026");
    const d = await oportunidadeDeHoje();
    expect(d?.quartos).toBeUndefined();
    expect(d?.vagas).toBeUndefined();
  });
});

describe("Home: seções automáticas", () => {
  test("lançamentos: os 4 publicados mais recentes com a marcação", async () => {
    const items = await lancamentosHome();
    expect(items.map((i) => i.id)).toEqual(["cz1001", "cz1002", "cz1003", "cz1004"]);
    expect(items.every((i) => i.badge === "LANÇAMENTO")).toBe(true);
  });

  test("venda: os 4 mais recentes, sem lançamentos e sem a Oportunidade de hoje", async () => {
    const items = await vendaHome();
    expect(items.map((i) => i.id)).toEqual(["cz1005", "cz1006", "cz1007", "cz1008"]);
    expect(items.every((i) => i.badge === "VENDA")).toBe(true);
    await escolher("cz1005");
    expect((await vendaHome()).map((i) => i.id)).toEqual(["cz1006", "cz1007", "cz1008", "cz1009"]);
  });

  test("locação: os 4 mais recentes", async () => {
    const items = await locacaoHome();
    expect(items.map((i) => i.id)).toEqual(["cz1010", "cz1011", "cz1012", "cz1013"]);
    expect(items.every((i) => i.badge === "LOCAÇÃO" && i.price.endsWith("/mês"))).toBe(true);
  });

  test("a data da primeira publicação ordena, não a última edição", async () => {
    await mudar("cz1018", { alteradoEm: new Date() });
    expect((await lancamentosHome()).map((i) => i.id)).not.toContain("cz1018");
    await mudar("cz1018", { publicadoEm: new Date() });
    expect((await lancamentosHome())[0].id).toBe("cz1018");
  });

  test("banco vazio: seções vazias", async () => {
    await amb.reiniciar();
    expect(await lancamentosHome()).toEqual([]);
    expect(await vendaHome()).toEqual([]);
    expect(await locacaoHome()).toEqual([]);
  });

  test("regiões trazem as 4 da Home", () => {
    expect(regioesHome().map((r) => r.nome)).toEqual(["Belvedere", "Vila da Serra", "Lagoa dos Ingleses", "Savassi e Lourdes"]);
  });

  test("imagens dos imóveis vêm do armazenamento de fotos", async () => {
    const all = [...(await lancamentosHome()), ...(await vendaHome()), ...(await locacaoHome()), (await oportunidadeDeHoje())!];
    expect(all.every((i) => i.img.startsWith("https://fotos.teste/fotos/"))).toBe(true);
    expect(regioesHome().every((r) => r.img.startsWith("/images/"))).toBe(true);
  });
});
