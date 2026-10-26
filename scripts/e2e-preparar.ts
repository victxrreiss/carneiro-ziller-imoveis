// npm run e2e:preparar — deixa banco e bucket de e2e prontos: zera tudo, migra, cria o
// ADMIN, um Corretor e um usuário desativado direto no banco (já ativos, senha gerada
// na execução e passada aos testes por variável de ambiente) e importa os imóveis de
// exemplo. Roda ANTES do build porque o build lê o banco. Recusa qualquer banco ou
// bucket que não seja local e de e2e.
import { sql } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { armazenamentoS3 } from "../src/lib/armazenamento";
import { configBanco, configS3 } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { usuarios } from "../src/lib/dados/esquema";
import { gerarHashSenha } from "../src/lib/seguranca/senha";
import { aplicarAmbienteE2E } from "./e2e-env";
import { exigirBancoLocal, nomeDoBanco } from "./guardas";
import { importarImoveis } from "./importar-imoveis";
import { esvaziarBucket, garantirBucketPublico } from "./s3-local";

async function main() {
  aplicarAmbienteE2E();
  const { urlDireta } = configBanco();
  exigirBancoLocal("e2e:preparar", urlDireta);
  if (!nomeDoBanco(urlDireta).endsWith("_e2e")) throw new Error("e2e:preparar só roda em banco cujo nome termina em _e2e.");
  if (!configS3().bucket.endsWith("e2e")) throw new Error("e2e:preparar só roda em bucket de e2e.");

  const { db, fechar } = criarConexao(urlDireta, { max: 1 });
  try {
    await db.execute(sql`drop schema if exists public cascade`);
    await db.execute(sql`drop schema if exists drizzle cascade`);
    await db.execute(sql`create schema public`);
    await migrate(db as never, { migrationsFolder: "drizzle" });

    await garantirBucketPublico(configS3().bucket);
    await esvaziarBucket();

    const hash = await gerarHashSenha(process.env.E2E_SENHA!);
    const [admin] = await db.insert(usuarios).values({ nome: "Ana Admin", email: process.env.E2E_ADMIN_EMAIL!, papel: "admin", situacao: "ativo", senhaHash: hash }).returning();
    await db.insert(usuarios).values([
      { nome: "Mariana Costa", email: process.env.E2E_CORRETOR_EMAIL!, papel: "corretor", situacao: "ativo", senhaHash: hash },
      { nome: "Paulo Menezes", email: process.env.E2E_DESATIVADO_EMAIL!, papel: "corretor", situacao: "desativado", senhaHash: hash },
    ]);

    const r = await importarImoveis(db, {
      responsavelId: admin.id,
      armazenamento: armazenamentoS3(),
      lerArquivo: async (arquivo) => new Uint8Array(await readFile(path.join("public", "images", "imoveis", `${arquivo}.jpg`))),
    });
    console.log(`e2e pronto: ${r.imoveis} imóveis, ${r.fotos} fotos.`);
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
