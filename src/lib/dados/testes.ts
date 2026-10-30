// Banco e dados para os testes (Vitest): um PGlite com as migrations aplicadas e
// usuários criados com senha gerada na hora. Não é importado pelo app.
import { PGlite } from "@electric-sql/pglite";
import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";
import { importarImoveis } from "../../../scripts/importar-imoveis";
import { armazenamento } from "@/lib/armazenamento";
import { gerarHashSenha, gerarToken } from "@/lib/seguranca/senha";
import type { UsuarioLogado } from "@/lib/painel/regras";
import type { Db } from "./criar-conexao";
import * as esquema from "./esquema";
import { usuarios } from "./esquema";

export async function criarBancoDeTeste(): Promise<Db> {
  const db = drizzle(new PGlite(), { schema: esquema });
  await migrate(db, { migrationsFolder: path.join(process.cwd(), "drizzle") });
  return db as unknown as Db;
}

export type Ambiente = {
  db: Db;
  /** Senha de todos os usuários ativos (gerada a cada execução dos testes). */
  senha: string;
  admin: UsuarioLogado;
  mariana: UsuarioLogado;
  ricardo: UsuarioLogado;
  juliana: UsuarioLogado & { pendente: true };
  paulo: UsuarioLogado & { desativado: true };
  /** Apaga tudo e recria os usuários; com `imoveis`, importa a semente de 35 imóveis (do ADMIN). */
  reiniciar(opcoes?: { imoveis?: boolean }): Promise<void>;
};

/** Um PGlite por arquivo de teste; `reiniciar()` volta ao estado inicial entre os testes. */
export async function criarAmbiente(): Promise<Ambiente> {
  const db = await criarBancoDeTeste();
  const senha = `${gerarToken()}Aa1`;
  const hash = await gerarHashSenha(senha);
  const amb = { db, senha } as Ambiente;

  amb.reiniciar = async (opcoes = {}) => {
    await db.execute(sql`truncate usuarios, imoveis, importacao_loft, fotos, imovel_fotos, sessoes, tokens_senha, tentativas_login, configuracao_site, interesses, limites_envio restart identity cascade`);
    await db.execute(sql`alter sequence imovel_codigo_seq restart with 1001`);
    const criar = async (nome: string, email: string, extra: Partial<typeof usuarios.$inferInsert>) => {
      const [u] = await db.insert(usuarios).values({ nome, email, papel: "corretor", situacao: "ativo", senhaHash: hash, ...extra }).returning();
      return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, trocarSenha: false } satisfies UsuarioLogado;
    };
    amb.admin = await criar("Ana Admin", "admin@exemplo.test", { papel: "admin" });
    amb.mariana = await criar("Mariana Costa", "mariana@exemplo.test", {});
    amb.ricardo = await criar("Ricardo Alves", "ricardo@exemplo.test", {});
    amb.juliana = { ...(await criar("Juliana Prado", "juliana@exemplo.test", { situacao: "pendente", senhaHash: null })), pendente: true };
    amb.paulo = { ...(await criar("Paulo Menezes", "paulo@exemplo.test", { situacao: "desativado" })), desativado: true };
    if (opcoes.imoveis) {
      await importarImoveis(db, { responsavelId: amb.admin.id, armazenamento: armazenamento(), lerArquivo: async () => new Uint8Array([0xff, 0xd8, 0xff, 0xe0]) });
    }
  };
  await amb.reiniciar();
  return amb;
}
