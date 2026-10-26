// npm run fotos:limpar — apaga fotos órfãs (não confirmadas ou sem imóvel, com mais
// de 24 h) do armazenamento e do banco, e sessões/links vencidos. Seguro para
// rodar a qualquer hora. Na Vercel a mesma rotina roda sozinha todo dia
// (vercel.json → /api/cron/limpeza).
import "./ambiente";
import { armazenamento } from "../src/lib/armazenamento";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { executarLimpeza } from "../src/lib/painel/limpeza";

async function main() {
  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    const r = await executarLimpeza(db, armazenamento());
    console.log(`Fotos órfãs removidas: ${r.fotos}. Sessões vencidas: ${r.sessoes}. Links vencidos: ${r.tokens}. Bloqueios antigos: ${r.tentativas}. Limites vencidos: ${r.limites}.`);
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
