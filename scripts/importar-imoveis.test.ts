import { sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { armazenamento } from "../src/lib/armazenamento";
import { configuracaoSite, imoveis } from "../src/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "../src/lib/dados/testes";
import { importarImoveis } from "./importar-imoveis";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar();
});

const opcoes = () => ({
  responsavelId: amb.admin.id,
  armazenamento: armazenamento(),
  lerArquivo: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
});

describe("importarImoveis com ids", () => {
  test("importa só os imóveis pedidos e a sequence continua depois do maior código", async () => {
    const r = await importarImoveis(amb.db, { ...opcoes(), ids: ["cz1001", "cz1009", "cz1010"] });
    expect(r.imoveis).toBe(3);
    const ids = (await amb.db.select({ id: imoveis.id }).from(imoveis)).map((i) => i.id).sort();
    expect(ids).toEqual(["cz1001", "cz1009", "cz1010"]);
    // PGlite devolve { rows }; postgres-js, o array direto.
    const r2 = (await amb.db.execute(sql`select nextval('imovel_codigo_seq')::text as proximo`)) as unknown as { rows: { proximo: string }[] };
    expect(Number(r2.rows[0].proximo)).toBe(1011);
  });

  test("a Oportunidade só é definida se o imóvel dela foi importado", async () => {
    await importarImoveis(amb.db, { ...opcoes(), ids: ["cz1001"] });
    const [c] = await amb.db.select().from(configuracaoSite);
    expect(c?.oportunidadeId ?? null).toBeNull();
  });

  test("id desconhecido é erro, antes de gravar qualquer coisa", async () => {
    await expect(importarImoveis(amb.db, { ...opcoes(), ids: ["cz1001", "cz9999"] })).rejects.toThrow(/cz9999/);
    expect(await amb.db.select().from(imoveis)).toHaveLength(0);
  });
});
