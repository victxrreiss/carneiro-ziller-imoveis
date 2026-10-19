import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("comportamento da Home", () => {
  for (const width of [390, 1024, 1440]) {
    test(`sem rolagem horizontal em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }

  test("abaixo de 900px o menu vira gaveta", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sobre nós" })).toBeHidden();

    await header.getByRole("button", { name: "Abrir menu" }).click();
    const gaveta = page.getByRole("dialog", { name: "Menu" });
    await expect(gaveta.getByRole("link", { name: "Sobre nós" })).toBeVisible();
  });

  test("em 900px ou mais o menu é horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Abrir menu" })).toBeHidden();
    await expect(header.getByRole("link", { name: "Sobre nós" })).toBeVisible();
  });

  test("hover no card sobe 3px", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const card = page.locator('section[aria-labelledby="lanc-titulo"] article').first();
    await card.scrollIntoViewIfNeeded();
    const before = (await card.boundingBox())!.y;
    await card.hover();
    await page.waitForTimeout(450);
    expect((await card.boundingBox())!.y).toBeCloseTo(before - 3, 0);
  });

  test("hover no tile de região dá zoom na imagem", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const tile = page.locator('section[aria-labelledby="regioes-titulo"] a').first();
    await tile.scrollIntoViewIfNeeded();
    await tile.hover();
    await page.waitForTimeout(800);
    const scale = await tile.locator("img").evaluate((img) => getComputedStyle(img).scale);
    expect(scale).toBe("1.06");
  });

  test("foco visível em links", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.keyboard.press("Tab");
    const outline = await page.evaluate(() => {
      const s = getComputedStyle(document.activeElement!);
      return `${s.outlineStyle} ${s.outlineWidth} ${s.outlineOffset}`;
    });
    expect(outline).toBe("solid 2px 3px");
  });

  test("busca leva para /imoveis com finalidade e texto codificados", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("tab", { name: "ALUGAR" }).click();
    await page.getByLabel("Buscar imóvel").fill("Vila & Serra #1");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL(/\/imoveis\?/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/imoveis");
    expect(url.searchParams.get("finalidade")).toBe("alugar");
    expect(url.searchParams.get("q")).toBe("Vila & Serra #1");
  });

  test("abas Venda/Locação trocam os cards", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Laje corporativa")).toBeHidden();
    await page.getByRole("tab", { name: "LOCAÇÃO" }).click();
    await expect(page.getByText("Laje corporativa")).toBeVisible();
    await expect(page.getByText("Residencial das Minas")).toBeHidden();
  });

  test("sem favoritos e sem anunciar imóvel", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("button", { name: /favoritar/i })).toHaveCount(0);
    await expect(page.getByText(/anunciar/i)).toHaveCount(0);
    await expect(page.getByText(/favoritos/i)).toHaveCount(0);
    await expect(page.getByText("Seu imóvel merece a vitrine certa.")).toHaveCount(0);
  });

  for (const width of [390, 1440]) {
    test(`sem violações de acessibilidade (axe, WCAG A/AA) em ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      await page.goto("/");
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(results.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }

  test("reduced motion desliga as transições", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    const duration = await page
      .locator('section[aria-labelledby="lanc-titulo"] article')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
  });
});
