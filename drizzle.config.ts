import { defineConfig } from "drizzle-kit";

// Só para `npm run db:gerar` (gera SQL a partir do esquema; não conecta ao banco).
export default defineConfig({
  dialect: "postgresql",
  schema: "./src/lib/dados/esquema.ts",
  out: "./drizzle",
});
