// Acesso e usuários do painel sobre o banco (lib/dados). Sem cookies nem
// redirecionamentos: as Server Actions em app/painel chamam estas funções.
// Todas recebem o banco como último parâmetro opcional (padrão: conexão do app),
// para os testes passarem um PGlite limpo.
import { and, asc, count, eq, gt, lt, sql } from "drizzle-orm";
import { conexao, type Db } from "@/lib/dados/conexao";
import { imoveis, sessoes, tentativasLogin, tokensSenha, usuarios } from "@/lib/dados/esquema";
import type { RegistroUsuario, TipoToken } from "@/lib/dados/tipos";
import { conferirSenha, gerarHashSenha, gerarSenhaProvisoria, gerarToken, hashToken } from "@/lib/seguranca/senha";
import { emailConvite, emailRedefinicao, enviar, VALIDADE_CONVITE_H, VALIDADE_REDEFINICAO_H } from "./emails";
import { LIMITES, emailValido, erroConfirmacao, erroNovaSenha, type UsuarioLogado } from "./regras";

const MIN = 60_000;
/** A senha provisória gerada pelo ADMIN vale por 72 horas. */
export const VALIDADE_PROVISORIA_H = 72;
export const TENTATIVAS_MAX = 5;
export const BLOQUEIO_MIN = 15;
/** Sessão sem uso por mais que isto expira. */
export const SESSAO_OCIOSA_MIN = 120;
/** `usada_em` é atualizado no máximo uma vez por minuto (evita uma escrita por requisição). */
const ATUALIZAR_USO_MIN = 1;
/** Intervalo mínimo entre e-mails de redefinição para a mesma conta. */
export const INTERVALO_REDEFINICAO_MIN = 2;

const normalizarEmail = (e: string) => e.trim().toLowerCase();
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
/** Ids vêm do cliente: só uuid chega ao banco (outro texto estoura no tipo uuid). */
export const ehUuid = (v: string) => UUID.test(v);
const iso = (d: Date | null) => (d ? d.toISOString() : null);

type LinhaUsuarioBanco = typeof usuarios.$inferSelect;

function paraRegistro(r: LinhaUsuarioBanco): RegistroUsuario {
  return {
    id: r.id,
    nome: r.nome,
    email: r.email,
    papel: r.papel,
    situacao: r.situacao,
    senhaHash: r.senhaHash,
    ultimoAcesso: iso(r.ultimoAcesso),
    conviteEnviadoEm: iso(r.conviteEnviadoEm),
    trocarSenha: r.trocarSenha,
    senhaProvisoriaExpiraEm: iso(r.senhaProvisoriaExpiraEm),
  };
}

export function paraLogado(u: RegistroUsuario): UsuarioLogado {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel, trocarSenha: u.trocarSenha };
}

async function porEmail(db: Db, email: string): Promise<LinhaUsuarioBanco | undefined> {
  const [u] = await db.select().from(usuarios).where(eq(usuarios.email, normalizarEmail(email))).limit(1);
  return u;
}

async function porId(db: Db, id: string): Promise<LinhaUsuarioBanco | undefined> {
  if (!ehUuid(id)) return undefined;
  const [u] = await db.select().from(usuarios).where(eq(usuarios.id, id)).limit(1);
  return u;
}

// ---------- Entrar ----------

export type ResultadoEntrar =
  | { ok: true; usuario: RegistroUsuario }
  | { ok: false; erro: "credenciais" | "bloqueado" };

// Comparar com um hash qualquer quando o e-mail não existe: o tempo de resposta
// não revela se a conta existe. Gerado em execução, nunca guardado no código.
let hashFicticio: Promise<string> | null = null;

/** Mensagem única para e-mail ou senha errados; 5 erros seguidos bloqueiam por 15 minutos. */
export async function entrar(email: string, senha: string, agora = Date.now(), db: Db = conexao()): Promise<ResultadoEntrar> {
  const chave = normalizarEmail(email);
  const [t] = await db.select().from(tentativasLogin).where(eq(tentativasLogin.email, chave)).limit(1);
  if (t?.bloqueadoAte && t.bloqueadoAte.getTime() > agora) return { ok: false, erro: "bloqueado" };

  const u = await porEmail(db, chave);
  hashFicticio ??= gerarHashSenha(gerarToken());
  const confere = await conferirSenha(senha, u?.senhaHash ?? (await hashFicticio));
  // Provisória vencida conta como senha errada (e como tentativa), sem revelar o motivo.
  const provisoriaVencida = !!u?.trocarSenha && !!u.senhaProvisoriaExpiraEm && u.senhaProvisoriaExpiraEm.getTime() < agora;
  if (u && confere && u.situacao === "ativo" && !provisoriaVencida) {
    await db.delete(tentativasLogin).where(eq(tentativasLogin.email, chave));
    const [atualizado] = await db.update(usuarios).set({ ultimoAcesso: new Date(agora) }).where(eq(usuarios.id, u.id)).returning();
    return { ok: true, usuario: paraRegistro(atualizado) };
  }

  // Contagem atômica (sem ler e gravar): requisições simultâneas não escapam do limite.
  const bloqueioAte = new Date(agora + BLOQUEIO_MIN * MIN).toISOString();
  const proxima = sql`${tentativasLogin.falhas} + 1`;
  const [linha] = await db
    .insert(tentativasLogin)
    .values({ email: chave, falhas: 1, bloqueadoAte: null })
    .onConflictDoUpdate({
      target: tentativasLogin.email,
      set: {
        falhas: sql`case when ${proxima} >= ${TENTATIVAS_MAX} then 0 else ${proxima} end`,
        bloqueadoAte: sql`case when ${proxima} >= ${TENTATIVAS_MAX} then ${bloqueioAte}::timestamptz else null end`,
      },
    })
    .returning();
  const bloqueou = !!linha.bloqueadoAte && linha.bloqueadoAte.getTime() > agora;
  return { ok: false, erro: bloqueou ? "bloqueado" : "credenciais" };
}

// ---------- Sessões ----------

export async function abrirSessao(usuarioId: string, agora = Date.now(), db: Db = conexao()): Promise<string> {
  const token = gerarToken();
  await db.insert(sessoes).values({ tokenHash: hashToken(token), usuarioId, criadaEm: new Date(agora), usadaEm: new Date(agora) });
  return token;
}

export type LeituraSessao = { usuario: UsuarioLogado } | { usuario: null; motivo: "sem-sessao" | "expirada" };

export async function lerSessao(token: string | undefined, agora = Date.now(), db: Db = conexao()): Promise<LeituraSessao> {
  if (!token) return { usuario: null, motivo: "sem-sessao" };
  const chave = hashToken(token);
  const [linha] = await db
    .select({ usadaEm: sessoes.usadaEm, usuario: usuarios })
    .from(sessoes)
    .innerJoin(usuarios, eq(usuarios.id, sessoes.usuarioId))
    .where(eq(sessoes.tokenHash, chave))
    .limit(1);
  if (!linha) return { usuario: null, motivo: "expirada" };
  if (linha.usuario.situacao !== "ativo") {
    await db.delete(sessoes).where(eq(sessoes.tokenHash, chave));
    return { usuario: null, motivo: "sem-sessao" };
  }
  const ocioso = agora - linha.usadaEm.getTime();
  if (ocioso > SESSAO_OCIOSA_MIN * MIN) {
    await db.delete(sessoes).where(eq(sessoes.tokenHash, chave));
    return { usuario: null, motivo: "expirada" };
  }
  if (ocioso > ATUALIZAR_USO_MIN * MIN) await db.update(sessoes).set({ usadaEm: new Date(agora) }).where(eq(sessoes.tokenHash, chave));
  return { usuario: paraLogado(paraRegistro(linha.usuario)) };
}

export async function encerrarSessao(token: string | undefined, db: Db = conexao()): Promise<void> {
  if (token) await db.delete(sessoes).where(eq(sessoes.tokenHash, hashToken(token)));
}

// ---------- Links de senha (convite e redefinição) ----------

/** Gerar um token novo apaga os anteriores da mesma pessoa. */
export async function criarToken(db: Db, usuarioId: string, tipo: TipoToken, agora: number): Promise<string> {
  const token = gerarToken();
  const horas = tipo === "convite" ? VALIDADE_CONVITE_H : VALIDADE_REDEFINICAO_H;
  await db.transaction(async (tx) => {
    await tx.delete(tokensSenha).where(eq(tokensSenha.usuarioId, usuarioId));
    await tx.insert(tokensSenha).values({
      tokenHash: hashToken(token),
      usuarioId,
      tipo,
      criadoEm: new Date(agora),
      expiraEm: new Date(agora + horas * 3600_000),
    });
  });
  return token;
}

export type LeituraToken =
  | { valido: true; tipo: TipoToken; email: string }
  | { valido: false; tipo: TipoToken | null };

export async function lerToken(token: string | undefined, agora = Date.now(), db: Db = conexao()): Promise<LeituraToken> {
  if (!token) return { valido: false, tipo: null };
  const [linha] = await db
    .select({ t: tokensSenha, u: usuarios })
    .from(tokensSenha)
    .innerJoin(usuarios, eq(usuarios.id, tokensSenha.usuarioId))
    .where(eq(tokensSenha.tokenHash, hashToken(token)))
    .limit(1);
  if (!linha) return { valido: false, tipo: null };
  if (linha.t.usado || linha.t.expiraEm.getTime() < agora || linha.u.situacao === "desativado") return { valido: false, tipo: linha.t.tipo };
  return { valido: true, tipo: linha.t.tipo, email: linha.u.email };
}

export type ErrosSenha = { nova?: string; confirmacao?: string };

export async function definirSenha(
  token: string,
  nova: string,
  confirmacao: string,
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; email: string } | { ok: false; erros: ErrosSenha } | { ok: false; expirado: true; tipo: TipoToken | null }> {
  const leitura = await lerToken(token, agora, db);
  if (!leitura.valido) return { ok: false, expirado: true, tipo: leitura.tipo };
  const erroNova = erroNovaSenha(nova);
  const erroConf = erroNova ? null : erroConfirmacao(nova, confirmacao);
  if (erroNova || erroConf) return { ok: false, erros: { nova: erroNova ?? undefined, confirmacao: erroConf ?? undefined } };

  const senhaHash = await gerarHashSenha(nova);
  return db.transaction(async (tx) => {
    // Reivindica o token de forma atômica: dois envios simultâneos não usam o link duas vezes.
    const [t] = await tx
      .update(tokensSenha)
      .set({ usado: true })
      .where(and(eq(tokensSenha.tokenHash, hashToken(token)), eq(tokensSenha.usado, false), sql`${tokensSenha.expiraEm} >= ${new Date(agora).toISOString()}::timestamptz`))
      .returning();
    if (!t) return { ok: false as const, expirado: true as const, tipo: leitura.tipo };
    const [u] = await tx
      .update(usuarios)
      .set({ senhaHash, situacao: sql`case when ${usuarios.situacao} = 'pendente' then 'ativo'::situacao_usuario else ${usuarios.situacao} end` })
      .where(eq(usuarios.id, t.usuarioId))
      .returning();
    await tx.delete(tentativasLogin).where(eq(tentativasLogin.email, u.email));
    // Quem redefine a senha espera que as sessões abertas caiam.
    await tx.delete(sessoes).where(eq(sessoes.usuarioId, u.id));
    return { ok: true as const, email: u.email };
  });
}

/**
 * Sempre responde igual na tela; só envia se a conta estiver ativa e sem pedido
 * recente. Falha de envio vai para o log sem o link.
 */
export async function pedirRedefinicao(email: string, agora = Date.now(), db: Db = conexao()): Promise<void> {
  const u = await porEmail(db, email);
  if (!u || u.situacao !== "ativo") return;
  const [recente] = await db
    .select({ n: count() })
    .from(tokensSenha)
    .where(and(eq(tokensSenha.usuarioId, u.id), eq(tokensSenha.tipo, "redefinicao"), gt(tokensSenha.criadoEm, new Date(agora - INTERVALO_REDEFINICAO_MIN * MIN))));
  if (recente.n > 0) return;
  try {
    await enviar(emailRedefinicao({ nome: u.nome, email: u.email, token: await criarToken(db, u.id, "redefinicao", agora), agora }));
  } catch (e) {
    console.error("[e-mail] falha ao enviar a redefinição de senha", { usuarioId: u.id, erro: e instanceof Error ? e.message : String(e) });
  }
}

// ---------- Usuários (só ADMIN) ----------

export type LinhaUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: RegistroUsuario["papel"];
  situacao: RegistroUsuario["situacao"];
  ultimoAcesso: string | null;
  conviteEnviadoEm: string | null;
  imoveis: number;
};

export async function listarUsuarios(db: Db = conexao()): Promise<LinhaUsuario[]> {
  const contagens = await db.select({ id: imoveis.responsavelId, n: count() }).from(imoveis).groupBy(imoveis.responsavelId);
  const contagem = new Map(contagens.map((c) => [c.id, c.n]));
  const ordem = { ativo: 0, pendente: 1, desativado: 2 } as const;
  const todos = await db.select().from(usuarios).orderBy(asc(usuarios.nome));
  return todos
    .map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      situacao: u.situacao,
      ultimoAcesso: iso(u.ultimoAcesso),
      conviteEnviadoEm: iso(u.conviteEnviadoEm),
      imoveis: contagem.get(u.id) ?? 0,
    }))
    .sort((a, b) => (a.papel === "admin" ? -1 : b.papel === "admin" ? 1 : ordem[a.situacao] - ordem[b.situacao] || a.nome.localeCompare(b.nome)));
}

export type ErrosUsuario = { nome?: string; email?: string };

const situacaoTexto = { ativo: "ativo", pendente: "convite pendente", desativado: "desativado" } as const;

/** Quem é convidado entra sempre como Corretor: o ADMIN é único. */
export async function convidar(
  admin: UsuarioLogado,
  nome: string,
  email: string,
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; usuario: LinhaUsuario } | { ok: false; erros: ErrosUsuario }> {
  const n = nome.replace(/\s+/g, " ").trim();
  const e = normalizarEmail(email);
  const erros: ErrosUsuario = {};
  if (n.length < 2) erros.nome = "Informe o nome.";
  else if (n.length > LIMITES.nome) erros.nome = `Use até ${LIMITES.nome} caracteres.`;
  if (!e) erros.email = "Informe o e-mail.";
  else if (!emailValido(e)) erros.email = "E-mail inválido. Use o formato nome@email.com.";
  else {
    const existente = await porEmail(db, e);
    if (existente) {
      const dica =
        existente.situacao === "desativado" ? " Para devolver o acesso, use “Reativar acesso” na lista." : existente.situacao === "pendente" ? " Use “Reenviar convite” na lista." : "";
      erros.email = `Já existe um usuário com este e-mail: ${existente.nome} (${situacaoTexto[existente.situacao]}).${dica}`;
    }
  }
  if (erros.nome || erros.email) return { ok: false, erros };

  let criado: LinhaUsuarioBanco;
  try {
    [criado] = await db.insert(usuarios).values({ nome: n, email: e, papel: "corretor", situacao: "pendente", conviteEnviadoEm: new Date(agora) }).returning();
  } catch {
    // Duas pessoas convidando o mesmo e-mail ao mesmo tempo.
    return { ok: false, erros: { email: "Já existe um usuário com este e-mail." } };
  }
  try {
    await enviar(emailConvite({ nome: n, email: e, convidadoPor: admin.nome, token: await criarToken(db, criado.id, "convite", agora), agora }));
  } catch (erro) {
    console.error("[e-mail] falha ao enviar o convite", { usuarioId: criado.id, erro: erro instanceof Error ? erro.message : String(erro) });
    return { ok: false, erros: { email: "O usuário foi criado, mas o e-mail não saiu. Use “Reenviar convite” na lista." } };
  }
  return { ok: true, usuario: (await listarUsuarios(db)).find((l) => l.id === criado.id)! };
}

export async function editarNome(usuarioId: string, nome: string, db: Db = conexao()): Promise<{ ok: true } | { ok: false; erro: string }> {
  const n = nome.replace(/\s+/g, " ").trim();
  if (!(await porId(db, usuarioId))) return { ok: false, erro: "Usuário não encontrado." };
  if (n.length < 2) return { ok: false, erro: "Informe o nome." };
  if (n.length > LIMITES.nome) return { ok: false, erro: `Use até ${LIMITES.nome} caracteres.` };
  await db.update(usuarios).set({ nome: n }).where(eq(usuarios.id, usuarioId));
  return { ok: true };
}

export async function reenviarConvite(admin: UsuarioLogado, usuarioId: string, agora = Date.now(), db: Db = conexao()): Promise<boolean> {
  const u = await porId(db, usuarioId);
  if (!u || u.situacao !== "pendente") return false;
  try {
    await enviar(emailConvite({ nome: u.nome, email: u.email, convidadoPor: admin.nome, token: await criarToken(db, u.id, "convite", agora), agora }));
  } catch (erro) {
    console.error("[e-mail] falha ao reenviar o convite", { usuarioId: u.id, erro: erro instanceof Error ? erro.message : String(erro) });
    return false;
  }
  await db.update(usuarios).set({ conviteEnviadoEm: new Date(agora) }).where(eq(usuarios.id, u.id));
  return true;
}

/** O ADMIN não desativa a si mesmo. Os imóveis da pessoa continuam no site. */
export async function desativar(admin: UsuarioLogado, usuarioId: string, db: Db = conexao()): Promise<boolean> {
  const u = await porId(db, usuarioId);
  if (!u || u.id === admin.id || u.situacao === "desativado") return false;
  await db.transaction(async (tx) => {
    await tx.update(usuarios).set({ situacao: "desativado" }).where(eq(usuarios.id, u.id));
    await tx.delete(sessoes).where(eq(sessoes.usuarioId, u.id));
    await tx.delete(tokensSenha).where(eq(tokensSenha.usuarioId, u.id));
  });
  return true;
}

/** Volta como ativo se já tinha senha; senão, como convite pendente (reenviar o convite). */
export async function reativar(usuarioId: string, db: Db = conexao()): Promise<boolean> {
  const u = await porId(db, usuarioId);
  if (!u || u.situacao !== "desativado") return false;
  await db.update(usuarios).set({ situacao: u.senhaHash ? "ativo" : "pendente" }).where(eq(usuarios.id, u.id));
  return true;
}

// ---------- Minha conta ----------

export type ErrosTrocaSenha = { atual?: string; nova?: string; confirmacao?: string };

export async function trocarSenha(
  usuarioId: string,
  atual: string,
  nova: string,
  confirmacao: string,
  db: Db = conexao(),
): Promise<{ ok: true } | { ok: false; erros: ErrosTrocaSenha }> {
  const u = await porId(db, usuarioId);
  if (!u) return { ok: false, erros: { atual: "Sessão inválida." } };
  const erros: ErrosTrocaSenha = {};
  if (!atual) erros.atual = "Informe a senha atual.";
  const erroNova = erroNovaSenha(nova);
  if (erroNova) erros.nova = erroNova;
  else if (nova === atual) erros.nova = "Use uma senha diferente da atual.";
  else {
    const erroConf = erroConfirmacao(nova, confirmacao);
    if (erroConf) erros.confirmacao = erroConf;
  }
  if (erros.atual || erros.nova || erros.confirmacao) return { ok: false, erros };
  if (!(await conferirSenha(atual, u.senhaHash))) return { ok: false, erros: { atual: "A senha atual está incorreta." } };
  await db.update(usuarios).set({ senhaHash: await gerarHashSenha(nova) }).where(eq(usuarios.id, u.id));
  return { ok: true };
}

// ---------- Senha provisória (acesso sem e-mail) ----------

/**
 * Só o ADMIN, e nunca para a própria conta nem para outro ADMIN. Devolve a senha
 * em texto uma única vez; no banco fica só o hash. Derruba sessões, links e bloqueios.
 */
export async function definirSenhaProvisoria(
  admin: UsuarioLogado,
  usuarioId: string,
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; senha: string } | { ok: false; erro: "proibido" | "inexistente" | "desativado" }> {
  if (admin.papel !== "admin" || admin.id === usuarioId) return { ok: false, erro: "proibido" };
  const u = await porId(db, usuarioId);
  if (!u) return { ok: false, erro: "inexistente" };
  if (u.papel === "admin") return { ok: false, erro: "proibido" };
  if (u.situacao === "desativado") return { ok: false, erro: "desativado" };

  const senha = gerarSenhaProvisoria();
  const senhaHash = await gerarHashSenha(senha);
  const expira = new Date(agora + VALIDADE_PROVISORIA_H * 3600_000);
  const ok = await db.transaction(async (tx) => {
    // Atômico: se a conta foi desativada no meio do caminho, não reativa.
    const [atualizado] = await tx
      .update(usuarios)
      .set({ senhaHash, situacao: "ativo", trocarSenha: true, senhaProvisoriaExpiraEm: expira })
      .where(and(eq(usuarios.id, u.id), sql`${usuarios.situacao} <> 'desativado'`, sql`${usuarios.papel} <> 'admin'`))
      .returning({ id: usuarios.id });
    if (!atualizado) return false;
    await tx.delete(sessoes).where(eq(sessoes.usuarioId, u.id));
    await tx.delete(tokensSenha).where(eq(tokensSenha.usuarioId, u.id));
    await tx.delete(tentativasLogin).where(eq(tentativasLogin.email, u.email));
    return true;
  });
  return ok ? { ok: true, senha } : { ok: false, erro: "desativado" };
}

/** Primeira troca de quem entrou com a provisória. Mantém a sessão atual aberta. */
export async function trocarSenhaObrigatoria(
  usuarioId: string,
  nova: string,
  confirmacao: string,
  db: Db = conexao(),
): Promise<{ ok: true } | { ok: false; erros: ErrosSenha }> {
  const u = await porId(db, usuarioId);
  if (!u || !u.trocarSenha || u.situacao !== "ativo") return { ok: false, erros: { nova: "Sessão inválida." } };
  const erroNova = erroNovaSenha(nova);
  if (erroNova) return { ok: false, erros: { nova: erroNova } };
  if (await conferirSenha(nova, u.senhaHash)) return { ok: false, erros: { nova: "Use uma senha diferente da provisória." } };
  const erroConf = erroConfirmacao(nova, confirmacao);
  if (erroConf) return { ok: false, erros: { confirmacao: erroConf } };

  // Atômico: só vale enquanto a provisória que conferimos ainda é a senha da conta.
  const [atualizado] = await db
    .update(usuarios)
    .set({ senhaHash: await gerarHashSenha(nova), trocarSenha: false, senhaProvisoriaExpiraEm: null })
    .where(and(eq(usuarios.id, u.id), eq(usuarios.trocarSenha, true), eq(usuarios.senhaHash, u.senhaHash ?? "")))
    .returning({ id: usuarios.id });
  if (!atualizado) return { ok: false, erros: { nova: "Sessão inválida." } };
  return { ok: true };
}

// ---------- Manutenção ----------

/** Apaga sessões ociosas, links vencidos e bloqueios antigos. Roda junto de `fotos:limpar`. */
export async function limparExpirados(agora = Date.now(), db: Db = conexao()): Promise<{ sessoes: number; tokens: number; tentativas: number }> {
  const s = await db.delete(sessoes).where(lt(sessoes.usadaEm, new Date(agora - SESSAO_OCIOSA_MIN * MIN))).returning({ k: sessoes.tokenHash });
  const t = await db.delete(tokensSenha).where(lt(tokensSenha.expiraEm, new Date(agora - 7 * 24 * 60 * MIN))).returning({ k: tokensSenha.tokenHash });
  const a = await db.delete(tentativasLogin).where(lt(tentativasLogin.bloqueadoAte, new Date(agora))).returning({ k: tentativasLogin.email });
  return { sessoes: s.length, tokens: t.length, tentativas: a.length };
}

