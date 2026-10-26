"use server";

// Server Actions das telas de acesso (Entrar, Esqueci minha senha, Definir senha) e Sair.
import { redirect } from "next/navigation";
import { after } from "next/server";
import { definirSenha, entrar, pedirRedefinicao, type ErrosSenha } from "@/lib/painel/contas";
import { emailValido } from "@/lib/painel/regras";
import { iniciarSessao, terminarSessao } from "@/lib/painel/sessao";
import type { TipoToken } from "@/lib/dados/tipos";
import { destinoSeguro, painel } from "@/lib/routes";

const texto = (fd: FormData, k: string) => {
  const v = fd.get(k);
  return typeof v === "string" ? v : "";
};

export type EstadoEntrar = {
  email: string;
  erroEmail?: string;
  erroSenha?: string;
  /** Mensagem única: "E-mail ou senha incorretos." */
  credenciais?: boolean;
  bloqueado?: boolean;
  tentativa: number;
};

export async function entrarAction(anterior: EstadoEntrar, fd: FormData): Promise<EstadoEntrar> {
  const email = texto(fd, "email").trim();
  const senha = texto(fd, "senha");
  const tentativa = anterior.tentativa + 1;
  const erroEmail = !email ? "Informe seu e-mail." : !emailValido(email) ? "E-mail inválido. Use o formato nome@email.com." : undefined;
  const erroSenha = !senha ? "Informe sua senha." : undefined;
  if (erroEmail || erroSenha) return { email, erroEmail, erroSenha, tentativa };

  const r = await entrar(email, senha);
  if (!r.ok) return { email, credenciais: r.erro === "credenciais", bloqueado: r.erro === "bloqueado", tentativa };
  await iniciarSessao(r.usuario.id);
  redirect(destinoSeguro(texto(fd, "voltar") || undefined));
}

export async function sairAction(): Promise<void> {
  await terminarSessao();
  redirect(painel.entrar);
}

export type EstadoEsqueci = { email: string; erro?: string; enviado: boolean };

/** A confirmação é sempre a mesma, exista o e-mail ou não. */
export async function esqueciAction(_: EstadoEsqueci, fd: FormData): Promise<EstadoEsqueci> {
  const email = texto(fd, "email").trim();
  if (!email) return { email, erro: "Informe seu e-mail.", enviado: false };
  if (!emailValido(email)) return { email, erro: "E-mail inválido. Use o formato nome@email.com.", enviado: false };
  // Depois da resposta: o tempo de resposta não revela se o e-mail tem conta.
  after(() => pedirRedefinicao(email));
  return { email, enviado: true };
}

export type EstadoDefinirSenha =
  | { situacao: "form"; erros: ErrosSenha; tentativa: number }
  | { situacao: "sucesso"; email: string }
  | { situacao: "expirado"; tipo: TipoToken | null };

export async function definirSenhaAction(anterior: EstadoDefinirSenha, fd: FormData): Promise<EstadoDefinirSenha> {
  const r = await definirSenha(texto(fd, "token"), texto(fd, "nova"), texto(fd, "confirmacao"));
  if (r.ok) return { situacao: "sucesso", email: r.email };
  if ("expirado" in r) return { situacao: "expirado", tipo: r.tipo };
  return { situacao: "form", erros: r.erros, tentativa: (anterior.situacao === "form" ? anterior.tentativa : 0) + 1 };
}
