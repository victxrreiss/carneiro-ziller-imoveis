import "@testing-library/jest-dom/vitest";
import { cleanup } from "@testing-library/react";
import { afterEach, beforeEach } from "vitest";
import { armazenamentoMemoria, definirArmazenamento } from "@/lib/armazenamento";
import { definirRemetente, remetenteMemoria } from "@/lib/email";

// Nenhum teste fala com S3 nem com SMTP: tudo em memória.
beforeEach(() => {
  definirArmazenamento(armazenamentoMemoria());
  definirRemetente(remetenteMemoria());
});

afterEach(() => {
  cleanup();
});
