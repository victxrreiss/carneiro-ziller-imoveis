// Porteiro dos handlers HTTP do painel (envio de fotos). Mesma regra de `usuarioDaAcao`:
// sem sessão, 401; com senha provisória ainda não trocada, 403.
import type { LeituraSessao } from "./contas";
import type { UsuarioLogado } from "./regras";

export function exigirSessaoHttp(sessao: LeituraSessao): { usuario: UsuarioLogado } | { resposta: Response } {
  if (!sessao.usuario) return { resposta: Response.json({ ok: false, erro: "Sua sessão expirou. Entre de novo." }, { status: 401 }) };
  if (sessao.usuario.trocarSenha) return { resposta: Response.json({ ok: false, erro: "Crie sua senha antes de continuar." }, { status: 403 }) };
  return { usuario: sessao.usuario };
}
