import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { imoveis, interesses } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { CONTATOS_POR_PAGINA, listarContatos } from "./contatos";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

let n = 0;
async function lead(imovelId: string | null, extra: Partial<typeof interesses.$inferInsert> = {}) {
  n++;
  const [r] = await amb.db
    .insert(interesses)
    .values({ imovelId, codigo: imovelId ? imovelId.toUpperCase() : "", nome: `Lead ${n}`, telefone: "+5531999999999", email: `l${n}@x.test`, criadoEm: new Date(Date.UTC(2026, 0, 1, 0, n)), ...extra })
    .returning({ id: interesses.id });
  return r.id;
}
const dono = (id: string, responsavelId: string) => amb.db.update(imoveis).set({ responsavelId }).where(eq(imoveis.id, id));

describe("listarContatos", () => {
  test("todo usuário do painel vê todos os contatos, inclusive o geral e o de imóvel excluído", async () => {
    await dono("cz1001", amb.mariana.id);
    await dono("cz1002", amb.ricardo.id);
    const geral = await lead(null, { origem: "contato", url: "/contato" });
    const deMariana = await lead("cz1001");
    const deRicardo = await lead("cz1002");
    const excluido = await lead("cz1003");
    await amb.db.delete(imoveis).where(eq(imoveis.id, "cz1003"));

    const adm = await listarContatos(amb.admin, 1, amb.db);
    expect(adm.itens.map((i) => i.id)).toEqual([excluido, deRicardo, deMariana, geral]);
    expect(adm.itens.find((i) => i.id === geral)).toMatchObject({ imovel: null, origem: "contato", pagina: "/contato" });
    expect(adm.itens.find((i) => i.id === deMariana)?.imovel).toMatchObject({ id: "cz1001", codigo: expect.any(String), titulo: expect.any(String) });

    for (const corretor of [amb.mariana, amb.ricardo]) {
      const c = await listarContatos(corretor, 1, amb.db);
      expect(c.itens.map((i) => i.id)).toEqual([excluido, deRicardo, deMariana, geral]);
      expect(c.total).toBe(4);
    }
  });

  test("pagina de 30 em 30 e ajusta página fora do intervalo", async () => {
    for (let i = 0; i < CONTATOS_POR_PAGINA + 1; i++) await lead(null);
    const p1 = await listarContatos(amb.admin, 1, amb.db);
    expect(p1).toMatchObject({ total: 31, pagina: 1, paginas: 2 });
    expect(p1.itens).toHaveLength(30);
    const p2 = await listarContatos(amb.admin, 2, amb.db);
    expect(p2.itens).toHaveLength(1);
    expect((await listarContatos(amb.admin, 99, amb.db)).pagina).toBe(2);
    expect((await listarContatos(amb.admin, 0, amb.db)).pagina).toBe(1);
    expect((await listarContatos(amb.admin, Number.NaN, amb.db)).pagina).toBe(1);
  });

  test("sem contatos devolve uma página vazia", async () => {
    expect(await listarContatos(amb.admin, 1, amb.db)).toEqual({ itens: [], total: 0, pagina: 1, paginas: 1 });
  });
});
