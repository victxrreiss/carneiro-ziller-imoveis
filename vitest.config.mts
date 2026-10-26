import react from "@vitejs/plugin-react";
import path from "node:path";
import tsconfigPaths from "vite-tsconfig-paths";
import { defineConfig } from "vitest/config";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    // `server-only` lança fora do Next; nos testes vira um módulo vazio.
    alias: { "server-only": path.resolve(__dirname, "vitest.server-only.ts") },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./vitest.setup.ts"],
    include: ["src/**/*.test.{ts,tsx}", "scripts/**/*.test.ts"],
  },
});
