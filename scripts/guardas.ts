// Proteções dos comandos destrutivos: só rodam contra banco e armazenamento locais.

const LOCAIS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

export function hostLocal(url: string): boolean {
  try {
    return LOCAIS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

export function nomeDoBanco(url: string): string {
  return new URL(url).pathname.replace(/^\//, "");
}

/** Recusa se o ambiente for de produção ou o banco não for local. */
export function exigirBancoLocal(comando: string, databaseUrl: string): void {
  if (process.env.NODE_ENV === "production") throw new Error(`${comando} não roda com NODE_ENV=production.`);
  if (!hostLocal(databaseUrl)) throw new Error(`${comando} só roda contra um banco local (localhost). DATABASE_URL aponta para outro host; nada foi alterado.`);
}
