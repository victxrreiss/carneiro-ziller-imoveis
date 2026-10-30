// Sessão do painel: cookie httpOnly com um token opaco; a base guarda só o hash.
// Ler a sessão é dado de requisição: quem chama fica atrás de <Suspense>.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { connection } from "next/server";
import { painel } from "@/lib/routes";
import { abrirSessao, encerrarSessao, lerSessao, SESSAO_OCIOSA_MIN, type LeituraSessao } from "./contas";
import type { UsuarioLogado } from "./regras";

export const COOKIE_SESSAO = "cz_painel";

async function tokenDoCookie(): Promise<string | undefined> {
  return (await cookies()).get(COOKIE_SESSAO)?.value;
}

export async function sessaoAtual(): Promise<LeituraSessao> {
  // Sessão é dado de requisição (a hora atual entra na conta): nunca entra no HTML pré-renderizado.
  await connection();
  return lerSessao(await tokenDoCookie());
}

/** Para páginas: sem sessão vai para Entrar; sessão expirada avisa. Nos dois casos, volta para `voltar` depois. */
export async function exigirUsuario(voltar: string): Promise<UsuarioLogado> {
  const s = await sessaoAtual();
  if (s.usuario) {
    // Entrou com senha provisória: nada do painel antes de criar a própria senha.
    if (s.usuario.trocarSenha) redirect(painel.trocarSenha);
    return s.usuario;
  }
  redirect(s.motivo === "expirada" ? painel.entrarExpirada(voltar) : painel.entrarVoltando(voltar));
}

/** Para Server Actions: a permissão é conferida de novo em cada chamada. */
export async function usuarioDaAcao(): Promise<UsuarioLogado> {
  const s = await sessaoAtual();
  if (s.usuario) {
    if (s.usuario.trocarSenha) redirect(painel.trocarSenha);
    return s.usuario;
  }
  redirect(s.motivo === "expirada" ? painel.entrarExpirada() : painel.entrar);
}

export async function iniciarSessao(usuarioId: string): Promise<void> {
  const token = await abrirSessao(usuarioId);
  (await cookies()).set(COOKIE_SESSAO, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 12 * 60 * 60,
  });
}

export async function terminarSessao(): Promise<void> {
  const jar = await cookies();
  await encerrarSessao(jar.get(COOKIE_SESSAO)?.value);
  jar.delete(COOKIE_SESSAO);
}

export { SESSAO_OCIOSA_MIN };
