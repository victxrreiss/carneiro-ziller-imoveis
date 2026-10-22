// Acesso e usuários do painel sobre a base (lib/dados). Sem cookies nem
// redirecionamentos: as Server Actions em app/painel chamam estas funções.
import { banco } from "@/lib/dados/banco";
import type { RegistroUsuario, TipoToken } from "@/lib/dados/tipos";
import { conferirSenha, gerarHashSenha, gerarToken, hashToken } from "@/lib/seguranca/senha";
import { emailConvite, emailRedefinicao, enviar, VALIDADE_CONVITE_H, VALIDADE_REDEFINICAO_H } from "./emails";
import { LIMITES, emailValido, erroConfirmacao, erroNovaSenha, type UsuarioLogado } from "./regras";

const MIN = 60_000;
export const TENTATIVAS_MAX = 5;
export const BLOQUEIO_MIN = 15;
/** Sessão sem uso por mais que isto expira. */
export const SESSAO_OCIOSA_MIN = 120;

const normalizarEmail = (e: string) => e.trim().toLowerCase();

export function paraLogado(u: RegistroUsuario): UsuarioLogado {
  return { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
}

function porEmail(email: string): RegistroUsuario | undefined {
  const alvo = normalizarEmail(email);
  return [...banco().usuarios.values()].find((u) => u.email === alvo);
}

// ---------- Entrar ----------

export type ResultadoEntrar =
  | { ok: true; usuario: RegistroUsuario }
  | { ok: false; erro: "credenciais" | "bloqueado" };

// Comparar com um hash qualquer quando o e-mail não existe: o tempo de resposta
// não revela se a conta existe.
let hashFicticio: string | null = null;

/** Mensagem única para e-mail ou senha errados; 5 erros seguidos bloqueiam por 15 minutos. */
export function entrar(email: string, senha: string, agora = Date.now()): ResultadoEntrar {
  const chave = normalizarEmail(email);
  const t = banco().tentativas.get(chave) ?? { falhas: 0, bloqueadoAte: 0 };
  if (t.bloqueadoAte > agora) return { ok: false, erro: "bloqueado" };

  const u = porEmail(chave);
  hashFicticio ??= gerarHashSenha(gerarToken());
  const confere = conferirSenha(senha, u?.senhaHash ?? hashFicticio);
  if (u && confere && u.situacao === "ativo") {
    banco().tentativas.delete(chave);
    u.ultimoAcesso = new Date(agora).toISOString();
    return { ok: true, usuario: u };
  }
  const falhas = t.falhas + 1;
  if (falhas >= TENTATIVAS_MAX) {
    banco().tentativas.set(chave, { falhas: 0, bloqueadoAte: agora + BLOQUEIO_MIN * MIN });
    return { ok: false, erro: "bloqueado" };
  }
  banco().tentativas.set(chave, { falhas, bloqueadoAte: 0 });
  return { ok: false, erro: "credenciais" };
}

// ---------- Sessões ----------

export function abrirSessao(usuarioId: string, agora = Date.now()): string {
  const token = gerarToken();
  banco().sessoes.set(hashToken(token), { usuarioId, criadaEm: agora, usadaEm: agora });
  return token;
}

export type LeituraSessao = { usuario: UsuarioLogado } | { usuario: null; motivo: "sem-sessao" | "expirada" };

export function lerSessao(token: string | undefined, agora = Date.now()): LeituraSessao {
  if (!token) return { usuario: null, motivo: "sem-sessao" };
  const chave = hashToken(token);
  const s = banco().sessoes.get(chave);
  if (!s) return { usuario: null, motivo: "expirada" };
  const u = banco().usuarios.get(s.usuarioId);
  if (!u || u.situacao !== "ativo") {
    banco().sessoes.delete(chave);
    return { usuario: null, motivo: "sem-sessao" };
  }
  if (agora - s.usadaEm > SESSAO_OCIOSA_MIN * MIN) {
    banco().sessoes.delete(chave);
    return { usuario: null, motivo: "expirada" };
  }
  s.usadaEm = agora;
  return { usuario: paraLogado(u) };
}

export function encerrarSessao(token: string | undefined): void {
  if (token) banco().sessoes.delete(hashToken(token));
}

function encerrarSessoesDe(usuarioId: string): void {
  for (const [chave, s] of banco().sessoes) if (s.usuarioId === usuarioId) banco().sessoes.delete(chave);
}

// ---------- Links de senha (convite e redefinição) ----------

function criarToken(usuarioId: string, tipo: TipoToken, agora: number): string {
  for (const [chave, t] of banco().tokens) if (t.usuarioId === usuarioId) banco().tokens.delete(chave);
  const token = gerarToken();
  const horas = tipo === "convite" ? VALIDADE_CONVITE_H : VALIDADE_REDEFINICAO_H;
  banco().tokens.set(hashToken(token), { usuarioId, tipo, expiraEm: agora + horas * 3600_000, usado: false });
  return token;
}

export type LeituraToken =
  | { valido: true; tipo: TipoToken; email: string }
  | { valido: false; tipo: TipoToken | null };

export function lerToken(token: string | undefined, agora = Date.now()): LeituraToken {
  const t = token ? banco().tokens.get(hashToken(token)) : undefined;
  if (!t) return { valido: false, tipo: null };
  const u = banco().usuarios.get(t.usuarioId);
  if (t.usado || t.expiraEm < agora || !u || u.situacao === "desativado") return { valido: false, tipo: t.tipo };
  return { valido: true, tipo: t.tipo, email: u.email };
}

export type ErrosSenha = { nova?: string; confirmacao?: string };

export function definirSenha(
  token: string,
  nova: string,
  confirmacao: string,
  agora = Date.now(),
): { ok: true; email: string } | { ok: false; erros: ErrosSenha } | { ok: false; expirado: true; tipo: TipoToken | null } {
  const leitura = lerToken(token, agora);
  if (!leitura.valido) return { ok: false, expirado: true, tipo: leitura.tipo };
  const erroNova = erroNovaSenha(nova);
  const erroConf = erroNova ? null : erroConfirmacao(nova, confirmacao);
  if (erroNova || erroConf) return { ok: false, erros: { nova: erroNova ?? undefined, confirmacao: erroConf ?? undefined } };
  const t = banco().tokens.get(hashToken(token))!;
  const u = banco().usuarios.get(t.usuarioId)!;
  u.senhaHash = gerarHashSenha(nova);
  if (u.situacao === "pendente") u.situacao = "ativo";
  t.usado = true;
  banco().tentativas.delete(u.email);
  return { ok: true, email: u.email };
}

/** Sempre responde igual na tela; só envia se a conta estiver ativa. */
export function pedirRedefinicao(email: string, agora = Date.now()): void {
  const u = porEmail(email);
  if (!u || u.situacao !== "ativo") return;
  enviar(emailRedefinicao({ nome: u.nome, email: u.email, token: criarToken(u.id, "redefinicao", agora), agora }));
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

export function listarUsuarios(): LinhaUsuario[] {
  const contagem = new Map<string, number>();
  for (const i of banco().imoveis.values()) contagem.set(i.responsavelId, (contagem.get(i.responsavelId) ?? 0) + 1);
  const ordem = { ativo: 0, pendente: 1, desativado: 2 } as const;
  return [...banco().usuarios.values()]
    .map((u) => ({
      id: u.id,
      nome: u.nome,
      email: u.email,
      papel: u.papel,
      situacao: u.situacao,
      ultimoAcesso: u.ultimoAcesso,
      conviteEnviadoEm: u.conviteEnviadoEm,
      imoveis: contagem.get(u.id) ?? 0,
    }))
    .sort((a, b) => (a.papel === "admin" ? -1 : b.papel === "admin" ? 1 : ordem[a.situacao] - ordem[b.situacao] || a.nome.localeCompare(b.nome)));
}

export type ErrosUsuario = { nome?: string; email?: string };

const situacaoTexto = { ativo: "ativo", pendente: "convite pendente", desativado: "desativado" } as const;

/** Quem é convidado entra sempre como Corretor: o ADMIN é único. */
export function convidar(admin: UsuarioLogado, nome: string, email: string, agora = Date.now()): { ok: true; usuario: LinhaUsuario } | { ok: false; erros: ErrosUsuario } {
  const n = nome.replace(/\s+/g, " ").trim();
  const e = normalizarEmail(email);
  const erros: ErrosUsuario = {};
  if (n.length < 2) erros.nome = "Informe o nome.";
  else if (n.length > LIMITES.nome) erros.nome = `Use até ${LIMITES.nome} caracteres.`;
  if (!e) erros.email = "Informe o e-mail.";
  else if (!emailValido(e)) erros.email = "E-mail inválido. Use o formato nome@email.com.";
  else {
    const existente = porEmail(e);
    if (existente) {
      const dica =
        existente.situacao === "desativado" ? " Para devolver o acesso, use “Reativar acesso” na lista." : existente.situacao === "pendente" ? " Use “Reenviar convite” na lista." : "";
      erros.email = `Já existe um usuário com este e-mail: ${existente.nome} (${situacaoTexto[existente.situacao]}).${dica}`;
    }
  }
  if (erros.nome || erros.email) return { ok: false, erros };
  const id = `u${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  const u: RegistroUsuario = { id, nome: n, email: e, papel: "corretor", situacao: "pendente", senhaHash: null, ultimoAcesso: null, conviteEnviadoEm: new Date(agora).toISOString() };
  banco().usuarios.set(id, u);
  enviar(emailConvite({ nome: n, email: e, convidadoPor: admin.nome, token: criarToken(id, "convite", agora), agora }));
  return { ok: true, usuario: listarUsuarios().find((l) => l.id === id)! };
}

export function editarNome(usuarioId: string, nome: string): { ok: true } | { ok: false; erro: string } {
  const u = banco().usuarios.get(usuarioId);
  const n = nome.replace(/\s+/g, " ").trim();
  if (!u) return { ok: false, erro: "Usuário não encontrado." };
  if (n.length < 2) return { ok: false, erro: "Informe o nome." };
  if (n.length > LIMITES.nome) return { ok: false, erro: `Use até ${LIMITES.nome} caracteres.` };
  u.nome = n;
  return { ok: true };
}

export function reenviarConvite(admin: UsuarioLogado, usuarioId: string, agora = Date.now()): boolean {
  const u = banco().usuarios.get(usuarioId);
  if (!u || u.situacao !== "pendente") return false;
  u.conviteEnviadoEm = new Date(agora).toISOString();
  enviar(emailConvite({ nome: u.nome, email: u.email, convidadoPor: admin.nome, token: criarToken(u.id, "convite", agora), agora }));
  return true;
}

/** O ADMIN não desativa a si mesmo. Os imóveis da pessoa continuam no site. */
export function desativar(admin: UsuarioLogado, usuarioId: string): boolean {
  const u = banco().usuarios.get(usuarioId);
  if (!u || u.id === admin.id || u.situacao === "desativado") return false;
  u.situacao = "desativado";
  encerrarSessoesDe(u.id);
  for (const [chave, t] of banco().tokens) if (t.usuarioId === u.id) banco().tokens.delete(chave);
  return true;
}

/** Volta como ativo se já tinha senha; senão, como convite pendente (reenviar o convite). */
export function reativar(usuarioId: string): boolean {
  const u = banco().usuarios.get(usuarioId);
  if (!u || u.situacao !== "desativado") return false;
  u.situacao = u.senhaHash ? "ativo" : "pendente";
  return true;
}

// ---------- Minha conta ----------

export type ErrosTrocaSenha = { atual?: string; nova?: string; confirmacao?: string };

export function trocarSenha(usuarioId: string, atual: string, nova: string, confirmacao: string): { ok: true } | { ok: false; erros: ErrosTrocaSenha } {
  const u = banco().usuarios.get(usuarioId);
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
  if (!conferirSenha(atual, u.senhaHash)) return { ok: false, erros: { atual: "A senha atual está incorreta." } };
  u.senhaHash = gerarHashSenha(nova);
  return { ok: true };
}
