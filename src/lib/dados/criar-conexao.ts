// Fábrica de conexão, sem `server-only`: usada pelo app (./conexao.ts) e pelos
// scripts (admin:criar, db:semente, fotos:limpar).
import { drizzle } from "drizzle-orm/postgres-js";
import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import postgres from "postgres";
import * as esquema from "./esquema";

/** Banco usado por toda a camada de dados; aceita postgres-js, PGlite e transações. */
export type Db = PgDatabase<PgQueryResultHKT, typeof esquema>;

export type Conexao = { db: Db; fechar: () => Promise<void> };

export function criarConexao(url: string, opcoes: { max?: number } = {}): Conexao {
  // `prepare: false` e poucas conexões: funciona atrás de pooler em modo transação
  // (Supabase, Neon, PgBouncer) e em funções serverless.
  const cliente = postgres(url, { max: opcoes.max ?? 3, prepare: false, onnotice: () => {} });
  return { db: drizzle(cliente, { schema: esquema }), fechar: () => cliente.end({ timeout: 5 }) };
}
