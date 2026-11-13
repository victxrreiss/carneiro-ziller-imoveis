import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

/**
 * O grid já carregado. Enquanto a página chega (streaming), o esqueleto e o conteúdo real
 * coexistem por um instante no DOM, e a tela anterior continua lá, escondida, depois de navegar:
 * os testes olham só o grid visível e pronto.
 */
const grade = (page: Page) => page.locator("main:visible").filter({ hasNot: page.locator('[aria-busy="true"]') });

/**
 * Escolhe a opção de um select do grid e espera a URL. Antes da hidratação a escolha ainda não
 * aplica o filtro (só o Buscar envia); por isso a tentativa se repete até a URL mudar.
 */
async function escolher(page: Page, rotulo: string, opcao: string, url: string | RegExp) {
  await expect(async () => {
    await grade(page).getByLabel(rotulo, { exact: true }).selectOption({ label: opcao });
    await page.waitForURL(url, { timeout: 2_000 });
  }).toPass();
}

/** Abre "Filtros avançados" (um <details>) se ainda estiver fechado. */
async function abrirAvancados(page: Page) {
  const painel = grade(page).locator("details.avancados");
  if ((await painel.getAttribute("open")) === null) await painel.locator("summary").click();
  await expect(grade(page).getByLabel("Ordenar por")).toBeVisible();
}

test.describe("navegação entre as telas", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("Home → busca por Lançamentos → card → imóvel", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("tab", { name: "Lançamentos" }).click();
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL("**/imoveis?finalidade=lancamentos");
    await page.getByRole("link", { name: "Edifício One View" }).click();
    await page.waitForURL(/\/imovel\/cz1001\?de=/);
    await expect(page.getByRole("heading", { level: 1, name: "Edifício One View" })).toBeVisible();
    await expect(page.locator(".nav").getByRole("link", { name: "Lançamentos" })).toHaveAttribute("aria-current", "page");
    await expect(page.locator("a.im-back-link")).toHaveText("VOLTAR AOS LANÇAMENTOS");
  });

  test("o card do imóvel em destaque da Home abre o anúncio", async ({ page }) => {
    await page.goto("/");
    await page.locator('section[aria-labelledby="destaques-titulo"]').getByRole("link", { name: "Apartamento no Belvedere" }).click();
    await page.waitForURL("**/imovel/cz1009");
    await expect(page.getByRole("heading", { level: 1, name: "Apartamento no Belvedere" })).toBeVisible();
  });

  test("busca da Home chega ao grid filtrado", async ({ page }) => {
    await page.goto("/");
    await page.getByLabel("Cidade").selectOption("Nova Lima");
    await page.getByRole("button", { name: "Buscar" }).click();
    await page.waitForURL(/\/imoveis\?/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Imóveis");
    await expect(page.getByRole("navigation", { name: "Finalidade" }).getByRole("link", { name: "Comprar" })).toHaveAttribute("aria-current", "true");
    await expect(grade(page).getByLabel("Cidade")).toHaveValue("Nova Lima");
    await expect(grade(page).locator(".res-total")).toHaveText("9 imóveis encontrados");
  });

  test("grid → imóvel → voltar mantém filtros, página e rolagem", async ({ page }) => {
    await page.goto("/imoveis?q=a&pagina=2");
    const card = page.locator(".cz-card").nth(4);
    await card.scrollIntoViewIfNeeded();
    const rolagem = await page.evaluate(() => window.scrollY);
    const titulo = (await card.locator(".cz-card-titulo").textContent())!;
    await card.locator(".cz-card-titulo a").click();
    await page.waitForURL(/\/imovel\/cz\d+\?de=/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(titulo);
    await expect(page.locator(".im-filters")).toHaveText("Filtros: “a”");
    await page.locator("a.im-back-link").click();
    await page.waitForURL("**/imoveis?q=a&pagina=2");
    await expect(page.getByRole("button", { name: "Página 2" })).toHaveAttribute("aria-current", "page");
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

  test("finalidade, preço e chips vivem na URL", async ({ page }) => {
    await page.goto("/imoveis");
    await expect(grade(page).locator("details.avancados")).not.toHaveAttribute("open");
    await abrirAvancados(page);
    await expect(grade(page).getByLabel("Preço")).toBeDisabled();
    await page.getByRole("navigation", { name: "Finalidade" }).getByRole("link", { name: "Alugar" }).click();
    await page.waitForURL("**/imoveis?finalidade=alugar");
    await abrirAvancados(page);
    await escolher(page, "Preço", "R$ 10 a 30 mil/mês", "**/imoveis?finalidade=alugar&preco=10k-30k");
    await expect(grade(page).locator(".res-total")).toHaveText("4 imóveis encontrados");
    await page.getByRole("button", { name: "Remover filtro Alugar" }).click();
    await page.waitForURL("**/imoveis");
    await expect(grade(page).locator(".res-chips button")).toHaveCount(0);
  });

  test("tipo, cidade, bairro e quartos ficam à vista; o bairro tem as regiões", async ({ page }) => {
    await page.goto("/imoveis");
    // O tipo virou filtro principal: os atalhos por tipo acima do grid saíram.
    await expect(page.getByRole("navigation", { name: "Categorias" })).toHaveCount(0);
    await escolher(page, "Tipo de imóvel", "Cobertura", "**/imoveis?tipo=Cobertura");
    await escolher(page, "Cidade", "Nova Lima", "**/imoveis?local=Nova+Lima&tipo=Cobertura");
    await escolher(page, "Bairro", "Vila da Serra", "**/imoveis?local=Vila+da+Serra%2C+Nova+Lima&tipo=Cobertura");
    // A região junta bairros de cidades diferentes: grava `regiao` e tira o `local`.
    await escolher(page, "Bairro", "Belvedere e Vila da Serra", "**/imoveis?regiao=belvedere-vila-da-serra&tipo=Cobertura");
    await expect(grade(page).getByLabel("Cidade")).toHaveValue("");
    await expect(grade(page).locator(".res-total")).toHaveText("3 imóveis encontrados");
    await escolher(page, "Quartos", "4+", "**/imoveis?regiao=belvedere-vila-da-serra&tipo=Cobertura&quartos=4");
    await page.getByRole("button", { name: "Remover filtro Belvedere e Vila da Serra" }).click();
    await page.waitForURL("**/imoveis?tipo=Cobertura&quartos=4");
    await expect(grade(page).getByLabel("Bairro")).toHaveValue("");
    // Filtro principal não abre os avançados.
    await expect(grade(page).locator("details.avancados")).not.toHaveAttribute("open");
  });

  test("Filtros avançados abre sozinho com avancados=1 ou com filtro avançado na URL", async ({ page }) => {
    await page.goto("/imoveis?avancados=1");
    await expect(grade(page).locator("details.avancados")).toHaveAttribute("open");
    await expect(grade(page).getByLabel("Ordenar por")).toBeVisible();
    // `avancados` é só da interface: não vira chip nem fica na URL depois de filtrar.
    await expect(grade(page).locator(".res-chips button")).toHaveCount(0);
    await escolher(page, "Vagas", "2+", "**/imoveis?vagas=2");
    await expect(grade(page).locator("details.avancados")).toHaveAttribute("open");
    await page.goto("/imoveis?carac=piscina");
    await expect(page.getByRole("button", { name: "Piscina", exact: true })).toHaveAttribute("aria-pressed", "true");
    await expect(page.getByRole("button", { name: "Piscina", exact: true })).toBeVisible();
    await page.goto("/imoveis?finalidade=comprar&quartos=3");
    await expect(grade(page).locator("details.avancados")).not.toHaveAttribute("open");
  });

  test("texto ou código: vale ao enviar", async ({ page }) => {
    await page.goto("/imoveis?avancados=1");
    await expect(async () => {
      await grade(page).getByLabel("Código ou texto").fill("CZ1009");
      await page.getByRole("button", { name: "Buscar" }).click();
      await page.waitForURL("**/imoveis?q=CZ1009", { timeout: 2_000 });
    }).toPass();
    await expect(grade(page).locator(".res-total")).toHaveText("1 imóvel encontrado");
    await expect(page.getByRole("button", { name: "Remover filtro “CZ1009”" })).toBeVisible();
  });

  test("ordenar por Menor preço: URL e primeiro card (aluguel: Casa comercial, R$ 7.900)", async ({ page }) => {
    await page.goto("/imoveis?finalidade=alugar");
    await abrirAvancados(page);
    await escolher(page, "Ordenar por", "Menor preço", "**/imoveis?finalidade=alugar&ordem=menor-preco");
    await expect(page.locator(".cz-card").first().locator(".cz-card-titulo")).toHaveText("Casa comercial");
  });

  test("localização e ordem sobrevivem a abrir o imóvel e Voltar aos resultados", async ({ page }) => {
    await page.goto("/imoveis");
    await escolher(page, "Cidade", "Nova Lima", "**/imoveis?local=Nova+Lima");
    await abrirAvancados(page);
    await escolher(page, "Ordenar por", "Maior preço", "**/imoveis?local=Nova+Lima&ordem=maior-preco");
    await page.locator(".cz-card-titulo a").first().click();
    await page.waitForURL(/\/imovel\/cz\d+\?de=/);
    await page.locator("a.im-back-link").click();
    await page.waitForURL("**/imoveis?local=Nova+Lima&ordem=maior-preco");
    await expect(page.getByRole("button", { name: "Remover filtro Nova Lima" })).toBeVisible();
    await expect(grade(page).getByLabel("Ordenar por")).toHaveValue("maior-preco");
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
    await expect(grade(page).locator(".res-total")).toHaveText("34 imóveis encontrados");
  });
});

test.describe("páginas institucionais", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("contato geral chega", async ({ page }) => {
    await page.goto("/contato");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Fale com a Carneiro & Ziller");
    await expect(page.locator(".nav").getByRole("link", { name: "Contato" })).toHaveAttribute("aria-current", "page");
    await page.getByLabel(/^NOME/).fill("Teste E2E Contato");
    await page.getByLabel(/^TELEFONE/).fill("31998765432");
    await page.getByLabel(/^E-MAIL/).fill("e2e.contato@example.com");
    await page.getByLabel(/^MENSAGEM/).fill("Mensagem de teste do e2e.");
    await page.getByRole("button", { name: "ENVIAR MENSAGEM" }).click();
    await expect(page.getByText("Mensagem enviada. Nossa equipe vai falar com você em breve.")).toBeVisible();
  });

  test("política de privacidade não marca item do menu", async ({ page }) => {
    await page.goto("/politica-de-privacidade");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Política de privacidade");
    await expect(page.locator('.nav [aria-current="page"]')).toHaveCount(0);
  });
});

test.describe("mobile 390px", () => {
  test.use({ viewport: { width: 390, height: 844 } });

  const semSobra = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);

  test("filtros no celular: finalidade, cidade e bairro na própria página", async ({ page }) => {
    await page.goto("/imoveis");
    await page.getByRole("navigation", { name: "Finalidade" }).getByRole("link", { name: "Lançamentos" }).click();
    await page.waitForURL("**/imoveis?finalidade=lancamentos");
    await expect(grade(page).locator(".res-total")).toHaveText("9 imóveis encontrados");
    await escolher(page, "Cidade", "Nova Lima", "**/imoveis?finalidade=lancamentos&local=Nova+Lima");
    await expect(page.getByRole("button", { name: "Remover filtro Nova Lima" })).toBeVisible();
    await escolher(page, "Bairro", "Belvedere e Vila da Serra", "**/imoveis?finalidade=lancamentos&regiao=belvedere-vila-da-serra");
    await expect(page.getByRole("button", { name: "Remover filtro Belvedere e Vila da Serra" })).toBeVisible();
    expect(await semSobra(page)).toBeLessThanOrEqual(0);
  });

  test("filtros avançados no celular abrem na própria página, sem rolagem horizontal", async ({ page }) => {
    await page.goto("/imoveis?finalidade=comprar");
    await abrirAvancados(page);
    expect(await semSobra(page)).toBeLessThanOrEqual(0);
    await escolher(page, "Vagas", "2+", "**/imoveis?finalidade=comprar&vagas=2");
    await page.getByRole("button", { name: "Piscina", exact: true }).click();
    await page.waitForURL("**/imoveis?finalidade=comprar&vagas=2&carac=piscina");
    await expect(grade(page).locator(".res-chips button")).toHaveCount(3);
    expect(await semSobra(page)).toBeLessThanOrEqual(0);
    await page.getByRole("button", { name: "Limpar filtros", exact: true }).click();
    await page.waitForURL(/\/imoveis$/);
  });

  test("imóvel tem link WHATSAPP com o código na mensagem", async ({ page }) => {
    await page.goto("/imovel/cz1009");
    const link = page.getByRole("link", { name: "WHATSAPP" }).first();
    await expect(link).toHaveAttribute("href", /^https:\/\/wa\.me\/5531995395988\?text=.*CZ1009/);
    await expect(link).toHaveAttribute("target", "_blank");
    await expect(link).toHaveAccessibleName("WHATSAPP (abre em nova aba)");
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
  const paginas = [
    "/imoveis",
    "/imoveis?finalidade=comprar&regiao=lourdes-savassi&vagas=2&carac=piscina",
    "/imoveis?finalidade=alugar&tipo=Terreno",
    "/imovel/cz1009",
    "/imovel/cz1021",
    "/imovel/cz9999",
    "/contato",
    "/sobre",
    "/politica-de-privacidade",
  ];
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
