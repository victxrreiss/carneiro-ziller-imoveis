// Hash de senha com scrypt (node:crypto). Formato: scrypt$<salt hex>$<hash hex>.
import { randomBytes, scryptSync, timingSafeEqual, createHash } from "node:crypto";

const TAMANHO = 64;

export { SENHA_MINIMO } from "./politica";

export function gerarHashSenha(senha: string): string {
  const salt = randomBytes(16);
  const hash = scryptSync(senha, salt, TAMANHO);
  return `scrypt$${salt.toString("hex")}$${hash.toString("hex")}`;
}

export function conferirSenha(senha: string, armazenado: string | null): boolean {
  if (!armazenado) return false;
  const [algoritmo, saltHex, hashHex] = armazenado.split("$");
  if (algoritmo !== "scrypt" || !saltHex || !hashHex) return false;
  const esperado = Buffer.from(hashHex, "hex");
  const obtido = scryptSync(senha, Buffer.from(saltHex, "hex"), esperado.length);
  return esperado.length === obtido.length && timingSafeEqual(esperado, obtido);
}

/** Token opaco para cookie de sessão e links de e-mail. */
export function gerarToken(): string {
  return randomBytes(32).toString("base64url");
}

/** O que fica guardado: só o hash do token, nunca o token. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
