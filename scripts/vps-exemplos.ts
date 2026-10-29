// deploy/deploy.sh exemplos — uma vez, na produção da VPS: importa 3 imóveis de
// exemplo (um lançamento, uma venda que é a Oportunidade e uma locação) para o
// site não estrear vazio. A equipe edita ou exclui pelo painel. Recusa se o banco
// já tiver imóveis. Exige o ADMIN criado.
import "./ambiente";
import { eq } from "drizzle-orm";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { armazenamentoS3 } from "../src/lib/armazenamento";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { usuarios } from "../src/lib/dados/esquema";
import { importarImoveis } from "./importar-imoveis";

export const EXEMPLOS = ["cz1001", "cz1009", "cz1010"];

async function main() {
  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    const [admin] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.papel, "admin")).limit(1);
    if (!admin) throw new Error("Crie o ADMIN antes: deploy/deploy.sh admin \"Nome\" email");
    const r = await importarImoveis(db, {
      responsavelId: admin.id,
      armazenamento: armazenamentoS3(),
      ids: EXEMPLOS,
      lerArquivo: async (arquivo) => new Uint8Array(await readFile(path.join("public", "images", "imoveis", `${arquivo}.jpg`))),
    });
    console.log(`[vps] exemplos importados: ${r.imoveis} imóveis, ${r.fotos} fotos.`);
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(`[vps] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
