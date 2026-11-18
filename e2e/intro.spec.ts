import AxeBuilder from "@axe-core/playwright";
import { CHAVE_INTRO, expect, test, type Page } from "./base";

// Aqui a sessão começa sem a abertura rápida vista.
test.use({ introVista: false, viewport: { width: 1440, height: 900 } });

const camada = (page: Page) => page.locator(".cz-intro");

/** Registra, a cada quadro desde o início do documento, se a camada chegou a ser pintada. */
async function vigiarPintura(page: Page) {
  await page.addInitScript(() => {
    const w = window as Window & { introPintada?: boolean };
    w.introPintada = false;
    const olhar = () => {
      const el = document.querySelector(".cz-intro");
      if (el && window.getComputedStyle(el).display !== "none") w.introPintada = true;
      window.requestAnimationFrame(olhar);
    };
    olhar();
  });
}
const foiPintada = (page: Page) => page.evaluate(() => (window as Window & { introPintada?: boolean }).introPintada);

test.describe("abertura rápida da Home", () => {
  test("aparece na primeira visita, some sozinha e não volta na mesma sessão", async ({ page }) => {
    await vigiarPintura(page);
    await page.goto("/");
    await expect(camada(page)).toBeVisible();
    await expect(camada(page)).toHaveAttribute("aria-hidden", "true");
    expect(await foiPintada(page)).toBe(true);
    // Decorativa: nada focável dentro dela, e a página por baixo já está inteira.
    await expect(camada(page).locator("a, button, input, select, textarea, [tabindex]")).toHaveCount(0);
    await expect(page.getByRole("heading", { level: 1 })).toBeAttached();

    // Some sozinha (3 s) e sai do DOM; a página passa no axe e responde a cliques.
    await expect(camada(page)).toHaveCount(0, { timeout: 6000 });
    expect(await page.evaluate((chave) => window.sessionStorage.getItem(chave), CHAVE_INTRO)).toBe("1");
    const resultado = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(resultado.violations).toEqual([]);

    // Outra página e de volta à Home, por navegação interna: não toca.
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Imóveis" }).click();
    await page.waitForURL(/\/imoveis/);
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("region", { name: "Apresentação" })).toBeVisible();
    await expect(camada(page)).toHaveCount(0);

    // Nova carga da Home na mesma sessão: nem um quadro da camada.
    await page.goto("/");
    await expect(page.getByRole("region", { name: "Apresentação" })).toBeVisible();
    await expect(camada(page)).toHaveCount(0);
    expect(await foiPintada(page)).toBe(false);
  });

  test("clique pula a abertura sem acionar o que está por baixo", async ({ page }) => {
    await page.goto("/");
    await expect(camada(page)).toBeVisible();
    // No meio da tela, por baixo, está a abertura da Home com seus links e a busca.
    await page.mouse.click(720, 450);
    await expect(camada(page)).toHaveCount(0, { timeout: 1500 });
    expect(new URL(page.url()).pathname).toBe("/");
    expect(await page.evaluate((chave) => window.sessionStorage.getItem(chave), CHAVE_INTRO)).toBe("1");
  });

  test("tecla pula a abertura", async ({ page }) => {
    await page.goto("/");
    await expect(camada(page)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(camada(page)).toHaveCount(0, { timeout: 1500 });
  });

  test("quem entra por outra página não vê a abertura ao chegar à Home", async ({ page }) => {
    await page.goto("/contato");
    await page.getByRole("navigation", { name: "Principal" }).getByRole("link", { name: "Home" }).click();
    await page.waitForURL((url) => url.pathname === "/");
    await expect(page.getByRole("region", { name: "Apresentação" })).toBeVisible();
    await expect(camada(page)).toHaveCount(0);
    expect(await page.evaluate((chave) => window.sessionStorage.getItem(chave), CHAVE_INTRO)).toBe("1");
  });

  test.describe("com movimento reduzido", () => {
    test.use({ contextOptions: { reducedMotion: "reduce" } });

    test("não aparece", async ({ page }) => {
      await vigiarPintura(page);
      await page.goto("/");
      await expect(page.getByRole("region", { name: "Apresentação" })).toBeVisible();
      await expect(camada(page)).toHaveCount(0);
      expect(await foiPintada(page)).toBe(false);
    });
  });

  test.describe("sem JavaScript", () => {
    test.use({ javaScriptEnabled: false });

    test("some sozinha pelo CSS e libera a página", async ({ page }) => {
      await page.goto("/");
      await expect(camada(page)).toBeVisible();
      await expect(camada(page)).toBeHidden({ timeout: 6000 });
      await page.getByRole("button", { name: "Buscar" }).click();
      await page.waitForURL(/\/imoveis\?/);
    });
  });
});
