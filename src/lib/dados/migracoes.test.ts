// Migrations aplicadas sobre um banco que já existia (o de produção, que está na 0001).
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import { cp, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, test } from "vitest";

const PASTA = path.join(process.cwd(), "drizzle");
let ate0001: string;

beforeAll(async () => {
  // Cópia de drizzle/ com o journal cortado na 0001: o estado da produção antes desta versão.
  ate0001 = await mkdtemp(path.join(tmpdir(), "cz-migracoes-"));
  await cp(PASTA, ate0001, { recursive: true });
  const journal = JSON.parse(await readFile(path.join(PASTA, "meta", "_journal.json"), "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 1);
  await writeFile(path.join(ate0001, "meta", "_journal.json"), JSON.stringify(journal));
});

afterAll(async () => {
  await rm(ate0001, { recursive: true, force: true });
});

const colunas = async (db: ReturnType<typeof drizzle>, tabela: string) =>
  (await db.execute<{ column_name: string }>(sql`select column_name from information_schema.columns where table_name = ${tabela} order by column_name`)).rows.map(
    (r) => r.column_name,
  );

describe("migration 0002 (destaques da Home)", () => {
  test("cria destaques_home, mantém oportunidade_id para o container antigo e apaga o aviso antigo", async () => {
    const db = drizzle(new PGlite());
    await migrate(db, { migrationsFolder: ate0001 });
    // Aviso no formato antigo (o da Oportunidade): a tela nova não deve mostrá-lo.
    await db.execute(sql`insert into configuracao_site (id, aviso) values (1, '{"texto":"aviso antigo"}')`);

    await migrate(db, { migrationsFolder: PASTA });

    // Expand/contract: a coluna só sai numa versão futura, depois que o container antigo não roda mais.
    expect(await colunas(db, "configuracao_site")).toEqual(["aviso", "id", "oportunidade_id"]);
    expect(await colunas(db, "destaques_home")).toEqual(["imovel_id", "marcado_em", "ordem"]);
    const { rows } = await db.execute<{ aviso: unknown }>(sql`select aviso from configuracao_site where id = 1`);
    expect(rows).toEqual([{ aviso: null }]);
  });
});
