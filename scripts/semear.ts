// npm run db:semente — só desenvolvimento local. Importa os 35 imóveis de exemplo
// (fotos de public/images/imoveis vão para o armazenamento local) e define a
// Oportunidade de hoje. Exige um ADMIN já criado (`npm run admin:criar`).
import "./ambiente";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { armazenamentoS3 } from "../src/lib/armazenamento";
import { configBanco, configS3 } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { usuarios } from "../src/lib/dados/esquema";
import { exigirBancoLocal, hostLocal } from "./guardas";
import { importarImoveis } from "./importar-imoveis";

async function main() {
  const url = configBanco().urlDireta;
  exigirBancoLocal("db:semente", url);
  if (!hostLocal(configS3().endpoint)) throw new Error("db:semente só envia fotos para um armazenamento local (S3_ENDPOINT em localhost).");

  const { db, fechar } = criarConexao(url, { max: 1 });
  try {
    const [admin] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.papel, "admin")).limit(1);
    if (!admin) throw new Error("Crie o ADMIN antes: npm run admin:criar -- --nome \"...\" --email \"...\"");
    const r = await importarImoveis(db, {
      responsavelId: admin.id,
      armazenamento: armazenamentoS3(),
      lerArquivo: async (arquivo) => new Uint8Array(await readFile(path.join("public", "images", "imoveis", `${arquivo}.jpg`))),
    });
    console.log(`Semente importada: ${r.imoveis} imóveis, ${r.fotos} fotos.`);
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
