// Parte do deploy na VPS (deploy/deploy.sh), rodando na máquina do dev pelo túnel
// SSH: aplica as migrations e garante o bucket de fotos com leitura pública.
// Idempotente. O banco e o S3 aparecem em localhost por causa do túnel.
import "./ambiente";
import { configBanco, configS3 } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { aplicarMigrations } from "../src/lib/dados/migrar";
import { garantirBucketPublico } from "./s3-local";

async function main() {
  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    await aplicarMigrations(db);
    console.log("[vps] migrations aplicadas.");
  } finally {
    await fechar();
  }
  await garantirBucketPublico(configS3().bucket);
  console.log(`[vps] bucket pronto: ${configS3().bucket}`);
}

main().catch((e) => {
  console.error(`[vps] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
