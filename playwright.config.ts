import { defineConfig, devices } from "@playwright/test";
import { aplicarAmbienteE2E, PORTA_E2E } from "./scripts/e2e-env";

// Banco e bucket próprios (cz_e2e / cz-e2e) e credenciais geradas por execução:
// definidas aqui no processo principal, os workers e o servidor as herdam.
aplicarAmbienteE2E();

const APP_PORT = PORTA_E2E;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  timeout: 60_000,
  forbidOnly: !!process.env.CI,
  reporter: [["list"]],
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: "retain-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, testIgnore: /painel\.spec\.ts/ },
    // O painel altera o banco que o site lê: roda depois dos testes do site.
    { name: "painel", use: { ...devices["Desktop Chrome"] }, testMatch: /painel\.spec\.ts/, dependencies: ["chromium"] },
  ],
  webServer: {
    // O preparo vem antes do build: o build lê o banco (e precisa de imóveis para
    // pré-renderizar). Exige `npm run db:subir` (Postgres, S3 e Mailpit no Docker).
    command: `npm run e2e:preparar && npm run build && npm run start -- -p ${APP_PORT}`,
    url: `http://localhost:${APP_PORT}`,
    reuseExistingServer: !process.env.CI,
    timeout: 240_000,
  },
});
