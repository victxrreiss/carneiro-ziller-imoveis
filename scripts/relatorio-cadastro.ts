// npm run cadastro:relatorio
// Gera relatorio-cadastro-AAAA-MM-DD.csv na pasta atual: avisos do cadastro (publicados e
// rascunhos) e prováveis duplicados, sem endereço. Só lê o banco. Em produção, rode por
// `deploy/deploy.sh relatorio-cadastro`.
import "./ambiente";
import { writeFile } from "node:fs/promises";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { montarRelatorio, paraCsv } from "./cadastro/relatorio";

async function main() {
  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    const r = await montarRelatorio(db);
    const arquivo = `relatorio-cadastro-${new Date().toISOString().slice(0, 10)}.csv`;
    await writeFile(arquivo, paraCsv(r), "utf8");
    console.log(`[cadastro] ${r.problemas.length} imóveis com avisos, ${r.duplicados.length} grupos de prováveis duplicados.`);
    console.log(`[cadastro] gravado em ${arquivo}`);
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(`[cadastro] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
