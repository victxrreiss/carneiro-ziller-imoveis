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
let ate0002: string;

beforeAll(async () => {
  // Cópia de drizzle/ com o journal cortado na 0001: o estado da produção antes desta versão.
  ate0001 = await mkdtemp(path.join(tmpdir(), "cz-migracoes-"));
  await cp(PASTA, ate0001, { recursive: true });
  const journal = JSON.parse(await readFile(path.join(PASTA, "meta", "_journal.json"), "utf8"));
  journal.entries = journal.entries.filter((e: { idx: number }) => e.idx <= 1);
  await writeFile(path.join(ate0001, "meta", "_journal.json"), JSON.stringify(journal));
  ate0002 = await mkdtemp(path.join(tmpdir(), "cz-migracoes-"));
  await cp(PASTA, ate0002, { recursive: true });
  const ate2 = JSON.parse(await readFile(path.join(PASTA, "meta", "_journal.json"), "utf8"));
  ate2.entries = ate2.entries.filter((e: { idx: number }) => e.idx <= 2);
  await writeFile(path.join(ate0002, "meta", "_journal.json"), JSON.stringify(ate2));
});

afterAll(async () => {
  await rm(ate0001, { recursive: true, force: true });
  await rm(ate0002, { recursive: true, force: true });
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

describe("migration 0003 (dados internos e características em dois grupos)", () => {
  test("cria imovel_interno e converte as chaves antigas no imóvel e no snapshot da Loft, na ordem nova", async () => {
    const db = drizzle(new PGlite());
    await migrate(db, { migrationsFolder: ate0002 });
    await db.execute(sql`insert into usuarios (id, nome, email, papel) values ('00000000-0000-4000-8000-000000000001', 'Admin', 'a@b.test', 'admin')`);
    const u = "00000000-0000-4000-8000-000000000001";
    await db.execute(sql`insert into imoveis (id, codigo, tipo, caracteristicas, responsavel_id, alterado_por_id) values
      ('cz1', 'CZ1', 'Apartamento', ARRAY['piscina','recepcao','academia','lavanderia','sauna','varanda'], ${u}, ${u}),
      ('cz2', 'CZ2', 'Casa', ARRAY['sauna','piscina','jardim'], ${u}, ${u}),
      ('cz3', 'CZ3', 'Apartamento', '{}', ${u}, ${u})`);
    await db.execute(sql`insert into importacao_loft (referencia, imovel_id, valores, importado_em) values
      ('1', 'cz1', ${JSON.stringify({ tipo: "Apartamento", caracteristicas: ["piscina", "recepcao", "academia", "lavanderia", "sauna", "varanda"] })}::jsonb, now()),
      ('2', 'cz2', ${JSON.stringify({ tipo: "Casa", titulo: "x" })}::jsonb, now())`);

    await migrate(db, { migrationsFolder: PASTA });

    expect(await colunas(db, "imovel_interno")).toEqual([
      "alterado_em", "alterado_por_id", "captador_id", "captador_nome", "imovel_id",
      "proprietario_email", "proprietario_nome", "proprietario_obs", "proprietario_telefone",
    ]);
    const { rows } = await db.execute<{ id: string; caracteristicas: string[] }>(sql`select id, caracteristicas from imoveis order by id`);
    expect(rows).toEqual([
      { id: "cz1", caracteristicas: ["area-de-servico", "varanda", "academia", "piscina-coletiva", "portaria", "sauna-coletiva"] },
      { id: "cz2", caracteristicas: ["piscina", "sauna", "jardim"] },
      { id: "cz3", caracteristicas: [] },
    ]);
    const snap = await db.execute<{ referencia: string; valores: Record<string, unknown> }>(sql`select referencia, valores from importacao_loft order by referencia`);
    expect(snap.rows).toEqual([
      { referencia: "1", valores: { tipo: "Apartamento", caracteristicas: ["area-de-servico", "varanda", "academia", "piscina-coletiva", "portaria", "sauna-coletiva"] } },
      { referencia: "2", valores: { tipo: "Casa", titulo: "x" } },
    ]);
    // A função auxiliar não fica no banco.
    const f = await db.execute(sql`select 1 from pg_proc where proname = 'cz_caracteristicas_0003'`);
    expect(f.rows).toEqual([]);
  });
});
