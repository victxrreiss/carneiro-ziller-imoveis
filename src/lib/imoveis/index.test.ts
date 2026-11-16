import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { destaquesHome as tabDestaques, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { destaquesHome as destaques } from "./catalogo";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const destaquesHome = () => destaques(amb.db);
const mudar = (id: string, valores: Partial<typeof imoveis.$inferInsert>) => amb.db.update(imoveis).set(valores).where(eq(imoveis.id, id));

describe("Home: destaques (escolha do ADMIN)", () => {
  test("a semente traz o CZ1009, com os dados do card", async () => {
    const d = await destaquesHome();
    expect(d.map((i) => i.id)).toEqual(["cz1009"]);
    expect(d[0]).toMatchObject({ titulo: "Apartamento no Belvedere", bairro: "Belvedere", cidade: "Belo Horizonte", valor: 7_890_000, finalidade: "venda" });
    expect(d[0].vagas).toEqual(expect.any(Number));
    expect(d[0].foto.src).toMatch(/^https:\/\/fotos\.teste\/fotos\//);
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
