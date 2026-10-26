import "server-only";
import { configBanco } from "@/lib/config";
import { criarConexao, type Db } from "./criar-conexao";

export type { Db } from "./criar-conexao";

// No globalThis: sobrevive ao recarregamento de módulos do `next dev`.
const CHAVE = Symbol.for("carneiro-ziller.conexao");
type Global = typeof globalThis & { [CHAVE]?: Db };

/** Conexão única do app, aberta na primeira consulta (o build não conecta se nada ler o banco). */
export function conexao(): Db {
  const g = globalThis as Global;
  const c = configBanco();
  g[CHAVE] ??= criarConexao(c.url, { max: c.poolMax ?? (process.env.NODE_ENV === "production" ? 2 : 5) }).db;
  return g[CHAVE];
}
