// Roda antes do `next build` na Vercel (script `vercel-build`):
// 1) aplica as migrations (o build lê o banco para pré-renderizar o catálogo);
// 2) em produção, com ADMIN_INICIAL_EMAIL e ADMIN_INICIAL_NOME, garante o único
//    ADMIN e envia o convite por e-mail. O link nunca vai para o log do build.
// Em preview, só migra com MIGRAR_NO_PREVIEW=true (banco de preview separado,
// ex.: branch da Neon por preview); sem isso, preview usa o banco como está.
import "./ambiente";
import { configBanco, configSmtp } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { aplicarMigrations } from "../src/lib/dados/migrar";
import { descartarConvites, garantirAdminInicial } from "../src/lib/painel/admin-inicial";
import { enviar } from "../src/lib/painel/emails";

const log = (m: string) => console.log(`[implantar] ${m}`);

async function main() {
  const ambiente = process.env.VERCEL_ENV ?? "local";
  const migrar = ambiente === "production" || ambiente === "local" || process.env.MIGRAR_NO_PREVIEW === "true";

  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    if (migrar) {
      await aplicarMigrations(db);
      log("migrations aplicadas.");
    } else {
      log("preview: migrations não aplicadas (defina MIGRAR_NO_PREVIEW=true se o preview tem banco próprio).");
    }

    if (ambiente !== "production") return;
    const email = process.env.ADMIN_INICIAL_EMAIL?.trim();
    const nome = process.env.ADMIN_INICIAL_NOME?.trim();
    if (!email || !nome) {
      log("ADMIN_INICIAL_EMAIL/ADMIN_INICIAL_NOME não definidos: nenhum ADMIN criado neste deploy.");
      return;
    }
    try {
      configSmtp();
    } catch (e) {
      log(`e-mail não configurado (${e instanceof Error ? e.message : e}); o convite do ADMIN fica para o próximo deploy.`);
      return;
    }
    const r = await garantirAdminInicial({ nome, email }, Date.now(), db);
    if (!r.ok) {
      log(`ADMIN não criado: ${r.erro}`);
      return;
    }
    if (r.acao === "nada") {
      log("ADMIN já existe; nada a fazer.");
      return;
    }
    try {
      await enviar(r.mensagem);
      log(`ADMIN ${r.acao}: convite enviado para ${email}.`);
    } catch (e) {
      await descartarConvites(email, db);
      log(`ADMIN ${r.acao}, mas o e-mail do convite falhou (${e instanceof Error ? e.message : e}). O próximo deploy tenta de novo.`);
    }
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(`[implantar] ${e instanceof Error ? e.message : e}`);
  process.exit(1);
});
