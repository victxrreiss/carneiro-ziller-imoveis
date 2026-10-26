// Primeiro ADMIN, criado por `npm run admin:criar`: sem senha no código nem em
// arquivo. A pessoa define a própria senha pelo link de convite.
import { and, count, eq, gt } from "drizzle-orm";
import { conexao, type Db } from "@/lib/dados/conexao";
import { tokensSenha, usuarios } from "@/lib/dados/esquema";
import { criarToken } from "./contas";
import { emailConvite, linkDefinirSenha, type Mensagem } from "./emails";
import { LIMITES, emailValido } from "./regras";

export async function criarAdminInicial(
  dados: { nome: string; email: string },
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; link: string } | { ok: false; erro: string }> {
  const nome = dados.nome.replace(/\s+/g, " ").trim();
  const email = dados.email.trim().toLowerCase();
  if (nome.length < 2 || nome.length > LIMITES.nome) return { ok: false, erro: `Informe o nome (2 a ${LIMITES.nome} caracteres).` };
  if (!emailValido(email)) return { ok: false, erro: "E-mail inválido. Use o formato nome@email.com." };

  const [{ n }] = await db.select({ n: count() }).from(usuarios).where(eq(usuarios.papel, "admin"));
  if (n > 0) return { ok: false, erro: "Já existe um ADMIN. Só pode haver um; novos usuários entram por convite no painel." };

  let id: string;
  try {
    [{ id }] = await db.insert(usuarios).values({ nome, email, papel: "admin", situacao: "pendente", conviteEnviadoEm: new Date(agora) }).returning({ id: usuarios.id });
  } catch {
    return { ok: false, erro: "Não foi possível criar o ADMIN: o e-mail já está em uso ou já existe um ADMIN." };
  }
  return { ok: true, link: linkDefinirSenha(await criarToken(db, id, "convite", agora)) };
}

/**
 * Usado no deploy (`scripts/implantar.ts`), a partir de ADMIN_INICIAL_EMAIL e
 * ADMIN_INICIAL_NOME. Idempotente: cria o ADMIN se não houver nenhum; se o ADMIN
 * com esse e-mail ainda não definiu a senha e o convite venceu, gera um novo.
 * Devolve o e-mail a enviar (com o link), ou `null` quando não há nada a fazer.
 */
export async function garantirAdminInicial(
  dados: { nome: string; email: string },
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; acao: "criado" | "reenviado"; mensagem: Mensagem } | { ok: true; acao: "nada" } | { ok: false; erro: string }> {
  const email = dados.email.trim().toLowerCase();
  const [admin] = await db.select().from(usuarios).where(eq(usuarios.papel, "admin")).limit(1);

  if (!admin) {
    const r = await criarAdminInicial(dados, agora, db);
    if (!r.ok) return r;
    const token = new URL(r.link).searchParams.get("token")!;
    return { ok: true, acao: "criado", mensagem: emailConvite({ nome: dados.nome.trim(), email, convidadoPor: "A equipe técnica do site", token, agora, papel: "Administrador" }) };
  }
  if (admin.email !== email || admin.situacao !== "pendente") return { ok: true, acao: "nada" };

  const [vigente] = await db
    .select({ n: count() })
    .from(tokensSenha)
    .where(and(eq(tokensSenha.usuarioId, admin.id), eq(tokensSenha.tipo, "convite"), eq(tokensSenha.usado, false), gt(tokensSenha.expiraEm, new Date(agora))));
  if (vigente.n > 0) return { ok: true, acao: "nada" };

  const token = await criarToken(db, admin.id, "convite", agora);
  await db.update(usuarios).set({ conviteEnviadoEm: new Date(agora) }).where(eq(usuarios.id, admin.id));
  return { ok: true, acao: "reenviado", mensagem: emailConvite({ nome: admin.nome, email, convidadoPor: "A equipe técnica do site", token, agora, papel: "Administrador" }) };
}

/** Desfaz o convite cujo e-mail não saiu, para o próximo deploy tentar de novo. */
export async function descartarConvites(email: string, db: Db = conexao()): Promise<void> {
  const [u] = await db.select({ id: usuarios.id }).from(usuarios).where(eq(usuarios.email, email.trim().toLowerCase())).limit(1);
  if (u) await db.delete(tokensSenha).where(eq(tokensSenha.usuarioId, u.id));
}
