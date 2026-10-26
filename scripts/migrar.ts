// npm run db:migrar — aplica as migrations de drizzle/ (também em produção).
// Usa DATABASE_URL_DIRETA quando existir (sem pooler), senão DATABASE_URL.
import "./ambiente";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { aplicarMigrations } from "../src/lib/dados/migrar";

async function main() {
  const { urlDireta } = configBanco();
  const { db, fechar } = criarConexao(urlDireta, { max: 1 });
  try {
    await aplicarMigrations(db);
    console.log("Migrations aplicadas.");
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
