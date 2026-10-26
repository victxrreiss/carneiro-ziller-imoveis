// Aplica as migrations de drizzle/ sob uma trava do Postgres: dois builds
// simultâneos (ex.: produção e preview no mesmo banco) não migram ao mesmo tempo.
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import type { Db } from "./criar-conexao";

const TRAVA = 4_207_310_026; // número fixo, só identifica a trava deste projeto

/** `db` precisa ter uma única conexão (max: 1): a trava vale por sessão. */
export async function aplicarMigrations(db: Db, pasta = "drizzle"): Promise<void> {
  await db.execute(sql`select pg_advisory_lock(${TRAVA})`);
  try {
    await migrate(db as never, { migrationsFolder: pasta });
  } finally {
    await db.execute(sql`select pg_advisory_unlock(${TRAVA})`);
  }
}
