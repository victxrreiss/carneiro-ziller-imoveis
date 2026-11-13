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

  test("abaixo de 900px o menu vira botão e abre em tela cheia", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Abrir menu" })).toBeVisible();
    await expect(header.getByRole("link", { name: "Sobre nós" })).toBeHidden();

    await header.getByRole("button", { name: "Abrir menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("link", { name: "Sobre nós" })).toBeVisible();
    await expect(menu.getByRole("link", { name: "Falar no WhatsApp" })).toBeVisible();
    await expect(menu).toContainText("CRECI 7904");
  });

  test("em 900px ou mais o menu é horizontal", async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 900 });
    await page.goto("/");
    const header = page.locator("header");
    await expect(header.getByRole("button", { name: "Abrir menu" })).toBeHidden();
    await expect(header.getByRole("link", { name: "Sobre nós" })).toBeVisible();
  });

  test("a abertura ocupa a tela, com o cabeçalho transparente por cima", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const abertura = page.getByRole("region", { name: "Apresentação" });
    const caixa = (await abertura.boundingBox())!;
    expect(caixa.y).toBe(0);
    expect(caixa.height).toBeGreaterThanOrEqual(900);
    await expect(abertura.getByRole("heading", { level: 1 })).toContainText("Morar bem começa");
    const header = page.locator("header");
    expect((await header.boundingBox())!.y).toBe(0);
    expect(await header.evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgba(0, 0, 0, 0)");
  });

  test("hover no card de destaque dá zoom na foto", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const card = page.locator('section[aria-labelledby="destaques-titulo"] article').first();
    await card.scrollIntoViewIfNeeded();
    await card.hover();
    await page.waitForTimeout(1400);
    const transform = await card.locator(".cz-card-foto img").evaluate((img) => getComputedStyle(img).transform);
    expect(transform).toBe("matrix(1.05, 0, 0, 1.05, 0, 0)");
  });

  test("hover no card de região dá zoom na imagem", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    const tile = page.locator('section[aria-labelledby="regioes-titulo"] a').first();
    await tile.scrollIntoViewIfNeeded();
    await tile.hover();
    await page.waitForTimeout(1400);
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

  test("busca leva para /imoveis com finalidade, tipo, local e quartos", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.getByRole("tab", { name: "Alugar" }).click();
    await page.getByLabel("Tipo de imóvel").selectOption("Apartamento");
    await page.getByLabel("Cidade").selectOption("Belo Horizonte");
    await page.getByLabel("Bairro").selectOption({ label: "Belvedere" });
    await page.getByLabel("Quartos").selectOption("3");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL(/\/imoveis\?/);
    const url = new URL(page.url());
    expect(url.pathname).toBe("/imoveis");
    expect(Object.fromEntries(url.searchParams)).toEqual({
      finalidade: "alugar",
      tipo: "Apartamento",
      local: "Belvedere, Belo Horizonte",
      quartos: "3",
    });
  });

  test("Filtros avançados leva a /imoveis com o painel aberto", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Filtros avançados" }).click();
    await page.waitForURL("**/imoveis?avancados=1");
    // O conteúdo real, e não o esqueleto que aparece enquanto a página chega.
    const grade = page.locator("main:visible").filter({ hasNot: page.locator('[aria-busy="true"]') });
    await expect(grade.locator("details.avancados")).toHaveAttribute("open");
    await expect(grade.getByLabel("Ordenar por")).toBeVisible();
  });

  test("cards de tipo e de região abrem a busca filtrada", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/");
    await page.locator('section[aria-labelledby="tipos-titulo"]').getByRole("link", { name: /Coberturas/ }).click();
    await page.waitForURL("**/imoveis?tipo=Cobertura");
    await page.goto("/");
    await page.locator('section[aria-labelledby="regioes-titulo"]').getByRole("link", { name: /Belvedere e Vila da Serra/ }).click();
    await page.waitForURL("**/imoveis?regiao=belvedere-vila-da-serra");
  });

  test("Imóveis em destaque mostra só os que o ADMIN escolheu", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: "Imóveis em destaque" })).toBeVisible();
    await expect(page.getByText("Apartamento no Belvedere").first()).toBeVisible();
    await expect(page.getByText("Laje corporativa")).toBeHidden();
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
      .locator('section[aria-labelledby="destaques-titulo"] .cz-card-foto img')
      .first()
      .evaluate((el) => getComputedStyle(el).transitionDuration);
    expect(duration).toBe("0s");
    // A abertura fica na primeira imagem e na primeira frase.
    await page.waitForTimeout(7000);
    await expect(page.locator('[data-abertura-frase][data-ativa="true"]')).toContainText("Morar bem começa");
    await expect(page.locator('[data-abertura-imagem][data-ativa="true"]')).toHaveCount(1);
    expect(await page.locator("[data-abertura-imagem]").first().getAttribute("data-ativa")).toBe("true");
  });
});

test.describe("Home sem JavaScript", () => {
  test.use({ javaScriptEnabled: false, viewport: { width: 1440, height: 900 } });

  test("a busca da abertura envia finalidade, tipo, local e quartos", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Tipo de imóvel").selectOption("Apartamento");
    await page.getByLabel("Cidade").selectOption("Belo Horizonte");
    await page.getByLabel("Bairro").selectOption("Belvedere, Belo Horizonte");
    await page.getByLabel("Quartos").selectOption("3");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL(/\/imoveis\?/);
    const url = new URL(page.url());
    expect(url.searchParams.get("finalidade")).toBe("comprar");
    expect(url.searchParams.get("tipo")).toBe("Apartamento");
    expect(url.searchParams.getAll("local")).toEqual(["Belo Horizonte", "Belvedere, Belo Horizonte"]);
    expect(url.searchParams.get("quartos")).toBe("3");
  });
});

