import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { destaquesHome as tabDestaques, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { destaquesHome as destaques, lancamentosHome as lancamentos } from "./catalogo";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const lancamentosHome = () => lancamentos(amb.db);
const destaquesHome = () => destaques(amb.db);
const mudar = (id: string, valores: Partial<typeof imoveis.$inferInsert>) => amb.db.update(imoveis).set(valores).where(eq(imoveis.id, id));

describe("Home: destaques (escolha do ADMIN)", () => {
  test("a semente traz o CZ1009, no formato do card", async () => {
    const d = await destaquesHome();
    expect(d.map((i) => i.id)).toEqual(["cz1009"]);
    expect(d[0].price).toBe("R$ 7.890.000");
  });

  test("a ordem é a da lista, não a da publicação", async () => {
    await amb.db.delete(tabDestaques);
    await amb.db.insert(tabDestaques).values([{ imovelId: "cz1020", ordem: 1 }, { imovelId: "cz1005", ordem: 2 }]);
    expect((await destaquesHome()).map((i) => i.id)).toEqual(["cz1020", "cz1005"]);
  });

  test("só imóvel publicado aparece", async () => {
    await mudar("cz1009", { situacao: "indisponivel" });
    expect(await destaquesHome()).toEqual([]);
  });

  test("sem destaques (ou banco recém-criado): vazio", async () => {
    await amb.db.delete(tabDestaques);
    expect(await destaquesHome()).toEqual([]);
    await amb.reiniciar();
    expect(await destaquesHome()).toEqual([]);
  });
});

describe("Home: seções automáticas", () => {
  test("lançamentos: os 4 publicados mais recentes com a marcação", async () => {
    const items = await lancamentosHome();
    expect(items.map((i) => i.id)).toEqual(["cz1001", "cz1002", "cz1003", "cz1004"]);
    expect(items.every((i) => i.badge === "LANÇAMENTO")).toBe(true);
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
  });

  test("imagens dos imóveis vêm do armazenamento de fotos", async () => {
    const all = [...(await lancamentosHome()), ...(await destaquesHome())];
    expect(all.every((i) => i.img.startsWith("https://fotos.teste/fotos/"))).toBe(true);
  });
});
