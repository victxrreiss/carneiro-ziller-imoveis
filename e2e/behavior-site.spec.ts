import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

test.describe("navegação entre as telas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Home → card de lançamento → imóvel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "Ver imóvel: Edifício One View" }).click();
    await page.waitForURL("**/imovel/cz1001");
    await expect(page.getByRole("heading", { level: 1, name: "Edifício One View" })).toBeVisible();
    await expect(page.locator(".nav").getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("a.im-back-link")).toHaveText("VOLTAR AOS LANÇAMENTOS");
  });

  test("AGENDAR VISITA da Home abre o formulário do imóvel em destaque", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("link", { name: "AGENDAR VISITA" }).click();
    await page.waitForURL("**/imovel/cz1009");
    await expect(page.getByRole("dialog", { name: "Agendar visita" })).toBeVisible();
    await expect(page.getByLabel(/^NOME/)).toBeFocused();
    expect(new URL(page.url()).hash).toBe("");
  });

  test("busca da Home chega ao grid filtrado", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Buscar imóvel").fill("nova lima");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL(/\/imoveis\?/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Imóveis à venda");
    await expect(page.locator(".r-count")).toHaveText("6 imóveis encontrados");
  });

  test("grid → imóvel → voltar mantém filtros, página e rolagem", async ({ page }) => {
    await page.goto("/imoveis?q=belo&pagina=2");
    const card = page.locator(".card").nth(4);
    await card.scrollIntoViewIfNeeded();
    const rolagem = await page.evaluate(() => window.scrollY);
    const titulo = (await card.locator(".card-title").textContent())!;
    await card.locator(".card-title a").click();
    await page.waitForURL(/\/imovel\/cz\d+\?de=/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
    await expect(page.locator(".im-filters")).toHaveText("Filtros: “belo”");
    await page.locator("a.im-back-link").click();
    await page.waitForURL("**/imoveis?q=belo&pagina=2");
    await expect(page.locator(".r-page")).toHaveText("PÁGINA 2 DE 2");
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(rolagem - 50);
  });

  test("acesso direto ao imóvel: VER TODOS OS IMÓVEIS, canonical sem querystring", async ({ page }) => {
    await page.goto("/imovel/cz1009?de=finalidade%3Dcomprar");
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute("href", /\/imovel\/cz1009$/);
    await page.goto("/imovel/cz1009");
    await expect(page.locator("a.im-back-link")).toHaveText("VER TODOS OS IMÓVEIS");
    await expect(page.locator("a.im-back-link")).toHaveAttribute("href", "/imoveis");
  });

  test("imóvel indisponível não é indexado", async ({ page }) => {
    await page.goto("/imovel/cz1021");
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute("content", /noindex/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Este imóvel não está mais disponível");
  });

  test("imóvel inexistente mostra o estado Não encontrado", async ({ page }) => {
    await page.goto("/imovel/cz9999");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Imóvel não encontrado");
  });
});

test.describe("filtros do grid", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("finalidade, dropdown e chips vivem na URL", async ({ page }) => {
    await page.goto("/imoveis");
    await expect(page.getByRole("button", { name: /FAIXA DE PREÇO/ })).toBeDisabled();
    await page.getByRole("radio", { name: "ALUGAR" }).click();
    await page.waitForURL("**/imoveis?finalidade=alugar");
    await page.getByRole("button", { name: /FAIXA DE PREÇO/ }).click();
    await page.getByRole("option", { name: "R$ 10 a 30 mil/mês" }).click();
    await page.waitForURL("**/imoveis?finalidade=alugar&preco=10k-30k");
    await expect(page.locator(".r-count")).toHaveText("4 imóveis encontrados");
    await page.getByRole("button", { name: "Remover filtro Alugar" }).click();
    await page.waitForURL("**/imoveis");
    await expect(page.locator(".chip")).toHaveCount(0);
  });

  test("dropdown pelo teclado: abre, navega com setas, Esc devolve o foco", async ({ page }) => {
    await page.goto("/imoveis");
    const gatilho = page.getByRole("button", { name: /QUARTOS/ });
    await gatilho.focus();
    await page.keyboard.press("Enter");
    await expect(page.getByRole("listbox")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("listbox")).toBeHidden();
    await expect(gatilho).toBeFocused();
    await page.keyboard.press("ArrowDown");
    await page.keyboard.press("End");
    await page.keyboard.press("Enter");
    await page.waitForURL("**/imoveis?quartos=5");
    await expect(gatilho).toContainText("5 ou mais");
  });

  test("paginação", async ({ page }) => {
    await page.goto("/imoveis");
    await page.getByRole("button", { name: "Próxima página" }).click();
    await page.waitForURL("**/imoveis?pagina=2");
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
  });

  test("sem resultados → LIMPAR FILTROS", async ({ page }) => {
    await page.goto("/imoveis?finalidade=alugar&tipo=Terreno");
    await page.locator(".notice").getByRole("button", { name: "LIMPAR FILTROS" }).click();
    await page.waitForURL(/\/imoveis$/);
    await expect(page.locator(".r-count")).toHaveText("35 imóveis encontrados");
  });
});

test.describe("mobile 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  test("painel de filtros: rascunho, contagem e aplicar", async ({ page }) => {
    await page.goto("/imoveis");
    await page.getByRole("button", { name: "FILTROS" }).click();
    const painel = page.getByRole("dialog", { name: "Filtros" });
    await painel.getByRole("radio", { name: "LANÇAMENTOS" }).click();
    await expect(painel.getByRole("button", { name: "VER 9 IMÓVEIS" })).toBeVisible();
    expect(new URL(page.url()).search).toBe("");
    await painel.getByRole("button", { name: "VER 9 IMÓVEIS" }).click();
    await page.waitForURL("**/imoveis?finalidade=lancamentos");
    await expect(page.getByRole("button", { name: /FILTROS/ })).toContainText("1");
  });

  test("barra fixa abre o formulário em tela cheia; Esc devolve o foco à barra", async ({ page }) => {
    await page.goto("/imovel/cz1009");
    const botao = page.locator("#im-cta-bar");
    await expect(botao).toBeVisible();
    await botao.click();
    const painel = page.getByRole("dialog", { name: "Agendar visita" });
    expect((await painel.boundingBox())!.width).toBe(390);
    await page.keyboard.press("Escape");
    await expect(botao).toBeFocused();
  });

  for (const url of ["/imoveis", "/imovel/cz1015"]) {
    test(`sem rolagem horizontal em ${url}`, async ({ page }) => {
      await page.goto(url);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(overflow).toBeLessThanOrEqual(0);
    });
  }
});

test.describe("galeria", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("setas do teclado, Home/End e miniaturas", async ({ page }) => {
    await page.goto("/imovel/cz1015");
    const palco = page.locator(".im-stage");
    await palco.focus();
    await page.keyboard.press("ArrowRight");
    await expect(palco).toHaveAttribute("aria-label", /foto 2 de 8/);
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(palco).toHaveAttribute("aria-label", /foto 8 de 8/);
    await page.keyboard.press("Home");
    await expect(palco).toHaveAttribute("aria-label", /foto 1 de 8/);
    await page.getByRole("button", { name: "Ver foto 5 de 8" }).click();
    await expect(page.getByRole("button", { name: "Ver foto 5 de 8" })).toHaveAttribute("aria-current", "true");
    await expect(page.locator(".im-stage .im-count")).toHaveText("5 / 8");
  });

  test("uma foto: sem setas nem miniaturas", async ({ page }) => {
    await page.goto("/imovel/cz1026");
    await expect(page.locator(".im-arrow")).toHaveCount(0);
    await expect(page.locator(".im-thumbs")).toHaveCount(0);
  });
});

test.describe("acessibilidade (axe, WCAG A/AA)", () => {
  const paginas = ["/imoveis", "/imoveis?finalidade=alugar&tipo=Terreno", "/imovel/cz1009", "/imovel/cz1021", "/imovel/cz9999"];
  for (const width of [390, 1440]) {
    for (const url of paginas) {
      test(`${url} em ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 });
        await page.goto(url);
        const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
        expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
      });
    }
  }

  test("formulário aberto", async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/imovel/cz1009");
    await page.locator("#im-cta").click();
    await page.getByRole("button", { name: "ENVIAR" }).click();
    const r = await new AxeBuilder({ page }).include(".im-panel").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});
