"use server";

// Server Actions de usuários (só ADMIN) e de Minha conta (qualquer usuário, só a própria conta).
import { revalidatePath } from "next/cache";
import { convidar, desativar, editarNome, reativar, reenviarConvite, trocarSenha, type ErrosTrocaSenha, type ErrosUsuario } from "@/lib/painel/contas";
import { ehAdmin, type UsuarioLogado } from "@/lib/painel/regras";
import { usuarioDaAcao } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

async function admin(): Promise<UsuarioLogado | null> {
  const u = await usuarioDaAcao();
  return ehAdmin(u) ? u : null;
}

const txt = (v: unknown, max = 500) => (typeof v === "string" ? v.slice(0, max) : "");

export async function convidarAction(nome: unknown, email: unknown): Promise<{ ok: true } | { ok: false; erros: ErrosUsuario }> {
  const u = await admin();
  if (!u) return { ok: false, erros: { nome: "Só o ADMIN convida usuários." } };
  const r = convidar(u, txt(nome), txt(email));
  if (!r.ok) return r;
  revalidatePath(painel.usuarios);
  return { ok: true };
}

export async function editarUsuarioAction(id: unknown, nome: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  const u = await admin();
  if (!u) return { ok: false, erro: "Só o ADMIN edita usuários." };
  const r = editarNome(txt(id, 100), txt(nome));
  if (r.ok) revalidatePath(painel.usuarios);
  return r;
}

export async function reenviarConviteAction(id: unknown): Promise<boolean> {
  const u = await admin();
  if (!u) return false;
  const ok = reenviarConvite(u, txt(id, 100));
  if (ok) revalidatePath(painel.usuarios);
  return ok;
}

export async function desativarAction(id: unknown): Promise<boolean> {
  const u = await admin();
  if (!u) return false;
  const ok = desativar(u, txt(id, 100));
  if (ok) revalidatePath(painel.usuarios);
  return ok;
}

export async function reativarAction(id: unknown): Promise<boolean> {
  const u = await admin();
  if (!u) return false;
  const ok = reativar(txt(id, 100));
  if (ok) revalidatePath(painel.usuarios);
  return ok;
}

// ---------- Minha conta ----------

export async function salvarMeuNomeAction(nome: unknown): Promise<{ ok: true } | { ok: false; erro: string }> {
  const u = await usuarioDaAcao();
  const r = editarNome(u.id, txt(nome));
  if (r.ok) revalidatePath("/painel", "layout");
  return r;
}

export async function trocarSenhaAction(atual: unknown, nova: unknown, confirmacao: unknown): Promise<{ ok: true } | { ok: false; erros: ErrosTrocaSenha }> {
  const u = await usuarioDaAcao();
  return trocarSenha(u.id, txt(atual, 1000), txt(nova, 1000), txt(confirmacao, 1000));
}
