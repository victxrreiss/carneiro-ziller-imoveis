// Ambiente dos testes e2e: banco e bucket PRÓPRIOS (cz_e2e / cz-e2e), separados dos de
// desenvolvimento, e credenciais geradas a cada execução (nada fixo no repositório).
// Usado pelo playwright.config.ts e por scripts/e2e-preparar.ts.
import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";

export const PORTA_E2E = 3100;

export function aplicarAmbienteE2E(env: NodeJS.ProcessEnv = process.env): void {
  // Valores do ambiente local (docker-compose); .env.local vence .env.example.
  for (const arquivo of [".env.local", ".env.example"]) if (existsSync(arquivo)) process.loadEnvFile(arquivo);

  const base = new URL(env.DATABASE_URL ?? "postgres://cz:cz_local@localhost:5432/cz_dev");
  base.pathname = "/cz_e2e";
  env.DATABASE_URL = env.DATABASE_URL_DIRETA = base.toString();

  const endpoint = (env.S3_ENDPOINT ??= "http://localhost:9000").replace(/\/$/, "");
  env.S3_BUCKET = "cz-e2e";
  env.FOTOS_URL_PUBLICA = `${endpoint}/cz-e2e`;
  env.IMAGENS_HOST_LOCAL = "true";
  env.SITE_URL = `http://localhost:${PORTA_E2E}`;
  env.SMTP_HOST ??= "localhost";
  env.SMTP_PORTA ??= "1025";
  env.EMAIL_DE ??= "Carneiro & Ziller <painel@localhost>";
  env.S3_REGIAO ??= "us-east-1";
  env.S3_ACCESS_KEY_ID ??= "czlocal";
  env.S3_SECRET_ACCESS_KEY ??= "czlocal-secret";
  env.S3_FORCE_PATH_STYLE ??= "true";
  env.MAILPIT_URL ??= "http://localhost:8025";

  // Credenciais desta execução. Definidas no processo principal do Playwright, os
  // workers e o servidor as herdam.
  const sufixo = randomUUID().slice(0, 8);
  env.E2E_SENHA ??= `${randomUUID()}-Aa1`;
  env.E2E_ADMIN_EMAIL ??= `admin-${sufixo}@e2e.test`;
  env.E2E_CORRETOR_EMAIL ??= `corretor-${sufixo}@e2e.test`;
  env.E2E_DESATIVADO_EMAIL ??= `desativado-${sufixo}@e2e.test`;
}
