import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { armazenamento, armazenamentoMemoria } from "@/lib/armazenamento";
import { fotos, imovelFotos, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { limparFotosOrfas } from "./limpeza";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});

const HORA = 3600_000;
const objetos = () => (armazenamento() as ReturnType<typeof armazenamentoMemoria>).objetos;

async function novaFoto(opcoes: { confirmada: boolean; idadeH: number; chave: string }) {
  const [f] = await amb.db
    .insert(fotos)
    .values({ chave: opcoes.chave, tipo: "image/jpeg", tamanho: 4, largura: 10, altura: 10, enviadoPorId: amb.admin.id, confirmada: opcoes.confirmada, criadoEm: new Date(Date.now() - opcoes.idadeH * HORA) })
    .returning();
  await armazenamento().enviar(opcoes.chave, new Uint8Array(4), "image/jpeg");
  return f;
}

describe("fotos:limpar", () => {
  test("apaga não confirmadas e sem imóvel com mais de 24 h, e só essas", async () => {
    const naoConfirmada = await novaFoto({ confirmada: false, idadeH: 25, chave: "fotos/a.jpg" });
    const semImovel = await novaFoto({ confirmada: true, idadeH: 30, chave: "fotos/b.jpg" });
    const recente = await novaFoto({ confirmada: false, idadeH: 1, chave: "fotos/c.jpg" });
    const deImovel = (await amb.db.select().from(imovelFotos).where(eq(imovelFotos.imovelId, "cz1009")))[0];
    await amb.db.update(fotos).set({ criadoEm: new Date(Date.now() - 100 * HORA) }).where(eq(fotos.id, deImovel.fotoId));

    expect(await limparFotosOrfas(amb.db, armazenamento())).toBe(2);
    const restantes = new Set((await amb.db.select({ id: fotos.id }).from(fotos)).map((f) => f.id));
    expect(restantes.has(naoConfirmada.id)).toBe(false);
    expect(restantes.has(semImovel.id)).toBe(false);
    expect(restantes.has(recente.id)).toBe(true);
    expect(restantes.has(deImovel.fotoId)).toBe(true);
    expect(objetos().has("fotos/a.jpg")).toBe(false);
    expect(objetos().has("fotos/b.jpg")).toBe(false);
    expect(objetos().has("fotos/c.jpg")).toBe(true);
  });

  test("se o armazenamento falhar, as linhas ficam para a próxima execução", async () => {
    await novaFoto({ confirmada: false, idadeH: 48, chave: "fotos/d.jpg" });
    const quebrado = { ...armazenamentoMemoria(), remover: async () => { throw new Error("fora do ar"); } };
    await expect(limparFotosOrfas(amb.db, quebrado)).rejects.toThrow("fora do ar");
    expect(await amb.db.select().from(fotos).where(eq(fotos.chave, "fotos/d.jpg"))).toHaveLength(1);
    expect(await limparFotosOrfas(amb.db, armazenamento())).toBe(1);
  });

  test("imóvel excluído deixa suas fotos sem vínculo, e a limpeza as recolhe", async () => {
    await amb.db.delete(imoveis).where(eq(imoveis.id, "cz1005"));
    await amb.db.update(fotos).set({ criadoEm: new Date(Date.now() - 48 * HORA) });
    expect(await limparFotosOrfas(amb.db, armazenamento())).toBe(1);
  });
});
