// Variáveis de ambiente, lidas e validadas aqui. Nenhuma credencial fica no
// código: tudo vem do ambiente (Vercel em produção, `.env.local` em dev).
// Cada grupo falha com mensagem que diz qual variável falta; em produção,
// `validarConfigProducao` (instrumentation.ts) confere todos na inicialização.

export class ConfigAusente extends Error {
  constructor(
    public readonly grupo: string,
    public readonly faltando: string[],
  ) {
    super(`Configuração de ${grupo} incompleta. Defina: ${faltando.join(", ")}.`);
    this.name = "ConfigAusente";
  }
}

type Env = Record<string, string | undefined>;

function exigir(env: Env, grupo: string, nomes: string[]): Record<string, string> {
  const faltando = nomes.filter((n) => !env[n]?.trim());
  if (faltando.length) throw new ConfigAusente(grupo, faltando);
  return Object.fromEntries(nomes.map((n) => [n, env[n]!.trim()]));
}

const verdadeiro = (v: string | undefined) => v?.trim().toLowerCase() === "true";

export function configBanco(env: Env = process.env) {
  const c = exigir(env, "banco de dados", ["DATABASE_URL"]);
  const poolMax = Number(env.DATABASE_POOL_MAX);
  return {
    url: c.DATABASE_URL,
    // DATABASE_URL_UNPOOLED é a URL sem pooler que a integração Neon da Vercel injeta.
    urlDireta: env.DATABASE_URL_DIRETA?.trim() || env.DATABASE_URL_UNPOOLED?.trim() || c.DATABASE_URL,
    /** Conexões por instância; opcional. Em serverless, poucas (cada função tem a sua). */
    poolMax: Number.isInteger(poolMax) && poolMax > 0 ? poolMax : undefined,
  };
}

export function configS3(env: Env = process.env) {
  const c = exigir(env, "armazenamento de fotos (S3)", [
    "S3_ENDPOINT",
    "S3_REGIAO",
    "S3_BUCKET",
    "S3_ACCESS_KEY_ID",
    "S3_SECRET_ACCESS_KEY",
    "FOTOS_URL_PUBLICA",
  ]);
  return {
    endpoint: c.S3_ENDPOINT,
    regiao: c.S3_REGIAO,
    bucket: c.S3_BUCKET,
    accessKeyId: c.S3_ACCESS_KEY_ID,
    secretAccessKey: c.S3_SECRET_ACCESS_KEY,
    forcePathStyle: verdadeiro(env.S3_FORCE_PATH_STYLE),
    urlPublica: c.FOTOS_URL_PUBLICA.replace(/\/$/, ""),
  };
}

/**
 * Vercel Blob: basta conectar um Blob store (público) ao projeto, que a Vercel
 * injeta BLOB_READ_WRITE_TOKEN. A URL pública sai do id da loja, contido no token
 * (`vercel_blob_rw_<loja>_<segredo>`); FOTOS_URL_PUBLICA é opcional.
 */
export function configBlob(env: Env = process.env) {
  const c = exigir(env, "armazenamento de fotos (Vercel Blob)", ["BLOB_READ_WRITE_TOKEN"]);
  const loja = c.BLOB_READ_WRITE_TOKEN.split("_")[3]?.toLowerCase();
  if (!loja) throw new ConfigAusente("armazenamento de fotos (Vercel Blob)", ["BLOB_READ_WRITE_TOKEN (formato inválido)"]);
  const urlPublica = env.FOTOS_URL_PUBLICA?.trim().replace(/\/$/, "") || `https://${loja}.public.blob.vercel-storage.com`;
  return { token: c.BLOB_READ_WRITE_TOKEN, urlPublica };
}

/** Qual armazenamento usar: Vercel Blob se o token existir; senão, S3. */
export function provedorFotos(env: Env = process.env): "blob" | "s3" {
  return env.BLOB_READ_WRITE_TOKEN?.trim() ? "blob" : "s3";
}

export function configFotos(env: Env = process.env) {
  return provedorFotos(env) === "blob" ? configBlob(env) : configS3(env);
}

export function configSmtp(env: Env = process.env) {
  const c = exigir(env, "e-mail (SMTP)", ["SMTP_HOST", "SMTP_PORTA", "EMAIL_DE"]);
  const porta = Number(c.SMTP_PORTA);
  if (!Number.isInteger(porta) || porta <= 0) throw new ConfigAusente("e-mail (SMTP)", ["SMTP_PORTA (número)"]);
  // Usuário e senha são opcionais (Mailpit local não pede), mas vêm em par.
  const usuario = env.SMTP_USUARIO?.trim() || undefined;
  const senha = env.SMTP_SENHA || undefined;
  if (!usuario !== !senha) throw new ConfigAusente("e-mail (SMTP)", [usuario ? "SMTP_SENHA" : "SMTP_USUARIO"]);
  return { host: c.SMTP_HOST, porta, usuario, senha, seguro: verdadeiro(env.SMTP_SEGURO), de: c.EMAIL_DE };
}

/**
 * Endereço público do site, usado nos links dos e-mails. SITE_URL tem
 * prioridade; na Vercel, sem ela, usa o domínio de produção do projeto (o
 * domínio próprio, quando houver) ou, em preview, o endereço da branch.
 */
export function urlDoSite(env: Env = process.env): string {
  const v = env.SITE_URL?.trim();
  if (v) return v.replace(/\/$/, "");
  const vercel =
    env.VERCEL_ENV === "production"
      ? env.VERCEL_PROJECT_PRODUCTION_URL
      : env.VERCEL_BRANCH_URL || env.VERCEL_URL;
  if (vercel?.trim()) return `https://${vercel.trim().replace(/\/$/, "")}`;
  if (env.NODE_ENV === "production") throw new ConfigAusente("site", ["SITE_URL"]);
  return "http://localhost:3000";
}

/** Para onde vão os avisos de interesse, além do corretor responsável e do ADMIN. Opcional. */
export function emailsDeLeads(env: Env = process.env): string[] {
  return (env.LEADS_EMAIL ?? "")
    .split(/[,;]/)
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Chamada na inicialização do servidor em produção. Banco, fotos e endereço do
 * site são indispensáveis: faltando, derruba o boot com a lista completa. Sem
 * e-mail o site público funciona; só convites, redefinição de senha e avisos de
 * interesse falham. Por isso o e-mail vira alerta (devolvido para o log).
 */
export function validarConfigProducao(env: Env = process.env): { alertas: string[] } {
  const faltam = (conferir: (e: Env) => unknown): string[] => {
    try {
      conferir(env);
      return [];
    } catch (e) {
      if (!(e instanceof ConfigAusente)) throw e;
      return e.faltando;
    }
  };
  const faltando = [configBanco, configFotos, urlDoSite].flatMap(faltam);
  if (faltando.length) throw new Error(`Configuração incompleta. Defina no ambiente: ${faltando.join(", ")}.`);
  const email = faltam(configSmtp);
  return {
    alertas: email.length ? [`E-mail não configurado (${email.join(", ")}): convites, redefinição de senha e avisos de interesse não serão enviados.`] : [],
  };
}
