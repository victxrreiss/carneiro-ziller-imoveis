// Carrega `.env.local` e `.env` (como o Next faz) antes de qualquer outra coisa.
// Importe este módulo primeiro nos scripts. Variáveis já definidas no ambiente vencem.
import { existsSync } from "node:fs";

for (const arquivo of [".env.local", ".env"]) if (existsSync(arquivo)) process.loadEnvFile(arquivo);
