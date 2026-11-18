import { test as base } from "@playwright/test";

export { expect, type Locator, type Page } from "@playwright/test";

/** Mesma chave de `CHAVE_INTRO` em `src/components/home/Intro.tsx`. */
export const CHAVE_INTRO = "cz-intro";

/**
 * `test` dos E2E do site. A abertura rápida da Home (a logo animada, 3 s) cobre a página na
 * primeira visita de cada sessão; aqui a sessão já começa com ela vista, para os testes não
 * dependerem do relógio dela. `intro.spec.ts` desliga isso (`introVista: false`) e a testa.
 */
export const test = base.extend<{ introVista: boolean }>({
  introVista: [true, { option: true }],
  context: async ({ context, introVista }, usar) => {
    if (introVista) {
      await context.addInitScript((chave) => {
        try {
          window.sessionStorage.setItem(chave, "1");
        } catch {
          // Página sem armazenamento (about:blank): nada a marcar.
        }
      }, CHAVE_INTRO);
    }
    await usar(context);
  },
});
