// npm run admin:criar -- --nome "Fulana" --email "fulana@dominio.com"
// Cria o único ADMIN (pendente, sem senha) e imprime o link de convite (72 h) NESTE
// terminal. A pessoa define a própria senha pela tela "Definir senha". Nada é
// gravado em arquivo e não depende de SMTP.
import "./ambiente";
import { parseArgs } from "node:util";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { criarAdminInicial } from "../src/lib/painel/admin-inicial";

async function main() {
  const { values } = parseArgs({ options: { nome: { type: "string" }, email: { type: "string" } } });
  if (!values.nome || !values.email) {
    console.error('Uso: npm run admin:criar -- --nome "Nome Completo" --email "email@dominio.com"');
    process.exit(1);
  }

  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    const r = await criarAdminInicial({ nome: values.nome, email: values.email }, Date.now(), db);
    if (!r.ok) {
      console.error(r.erro);
      process.exitCode = 1;
    } else {
      console.log(`ADMIN criado. Envie este link (vale 72 horas, uso único) para ${values.email.toLowerCase()} definir a senha:\n\n${r.link}\n`);
    }
  } finally {
    await fechar();
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
