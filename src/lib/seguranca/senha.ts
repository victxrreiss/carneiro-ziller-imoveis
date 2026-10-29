// Hash de senha com argon2id (@node-rs/argon2, padrões OWASP: 19 MiB, 2 passes).
// O formato `$argon2id$...` carrega os parâmetros, então dá para endurecê-los
// depois sem invalidar senhas guardadas.
import { createHash, randomBytes } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

export { SENHA_MINIMO } from "./politica";

export async function gerarHashSenha(senha: string): Promise<string> {
  return hash(senha);
}

export async function conferirSenha(senha: string, armazenado: string | null): Promise<boolean> {
  if (!armazenado || !armazenado.startsWith("$argon2id$")) return false;
  try {
    return await verify(armazenado, senha);
  } catch {
    return false;
  }
}

/** Token opaco para cookie de sessão e links de e-mail. */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O que fica guardado: só o hash do token, nunca o token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

// Sem 0/O/1/l/I: a senha provisória é ditada ou digitada a partir de uma mensagem.
const ALFABETO_PROVISORIA = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
const TAMANHO_PROVISORIA = 12;

/** Senha provisória de 12 caracteres sem ambíguos, sorteada sem viés de módulo. */
export function gerarSenhaProvisoria(): string {
  const n = ALFABETO_PROVISORIA.length;
  const limite = 256 - (256 % n);
  let senha = "";
  while (senha.length < TAMANHO_PROVISORIA) {
    for (const b of crypto.getRandomValues(new Uint8Array(TAMANHO_PROVISORIA * 2))) {
      if (b < limite && senha.length < TAMANHO_PROVISORIA) senha += ALFABETO_PROVISORIA[b % n];
    }
  }
  return senha;
}
