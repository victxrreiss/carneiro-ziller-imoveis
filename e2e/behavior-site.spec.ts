import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Locator, type Page } from "./base";

/**
 * O grid já carregado. Enquanto a página chega (streaming), o esqueleto e o conteúdo real
 * coexistem por um instante no DOM, e a tela anterior continua lá, escondida, depois de navegar:
 * os testes olham só o grid visível e pronto.
 */
const grade = (page: Page) => page.locator("main:visible").filter({ hasNot: page.locator('[aria-busy="true"]') });

/** A tela do imóvel já carregada (mesma razão do `grade`). */
const pronta = grade;

/**
 * Clica em `botao` até `alvo` aparecer. Antes da hidratação o clique ainda não tem efeito; por
 * isso a tentativa se repete, em vez de contar com o tempo.
 */
async function abrir(botao: Locator, alvo: Locator) {
  await expect(async () => {
    if (!(await alvo.isVisible())) await botao.click();
    await expect(alvo).toBeVisible({ timeout: 2_000 });
  }).toPass();
}

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
    // Antes ou depois da hidratação, a cidade escolhida vai na URL.
    await page.waitForURL(/\/imoveis\?.*local=Nova\+Lima/);
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
    // A região junta dois bairros: grava `regiao` e tira o `local`.
    await escolher(page, "Bairro", "Vale do Sereno e Vila da Serra", "**/imoveis?regiao=vale-do-sereno-vila-da-serra&tipo=Cobertura");
    await expect(grade(page).getByLabel("Cidade")).toHaveValue("");
    await expect(grade(page).locator(".res-total")).toHaveText("2 imóveis encontrados");
    await escolher(page, "Quartos", "4+", "**/imoveis?regiao=vale-do-sereno-vila-da-serra&tipo=Cobertura&quartos=4");
    await page.getByRole("button", { name: "Remover filtro Vale do Sereno e Vila da Serra" }).click();
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

test.describe("páginas institucionais e 404", () => {
  for (const [url, titulo] of [
    ["/contato", "Fale com a Carneiro & Ziller"],
    ["/sobre", "Sobre a Carneiro & Ziller"],
    ["/politica-de-privacidade", "Política de privacidade"],
  ]) {
    test(`${url} tem a faixa de título da busca e o cabeçalho sólido`, async ({ page }) => {
      await page.goto(url);
      await expect(page.locator(".pg-cab").getByRole("heading", { level: 1 })).toHaveText(titulo);
      expect(await page.locator("header").evaluate((el) => getComputedStyle(el).backgroundColor)).toBe("rgb(15, 29, 36)");
    });
  }

  for (const width of [390, 1440]) {
    test(`404 em ${width}px: título, saídas e nada cortado`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 });
      const resposta = await page.goto("/pagina-que-nao-existe");
      expect(resposta!.status()).toBe(404);
      await expect(page.getByRole("heading", { level: 1 })).toHaveText("Página não encontrada");
      await expect(page.getByRole("main").getByRole("link", { name: "VOLTAR PARA A HOME" })).toHaveAttribute("href", "/");
      await expect(page.getByRole("main").getByRole("link", { name: /Ver todos os imóveis/ })).toHaveAttribute("href", "/imoveis");
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      const r = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
      expect(r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
    });
  }
});

test("Buscar antes da hidratação mantém a região que já estava na URL", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/imoveis?regiao=vale-do-sereno-vila-da-serra");
  const form = grade(page).getByRole("search", { name: "Filtrar imóveis" });
  await expect(form).toBeVisible();
  // O envio nativo do formulário (GET), sem passar pelo React: é o que o Buscar faz antes da hidratação.
  await form.evaluate((f: HTMLFormElement) => HTMLFormElement.prototype.submit.call(f));
  await page.waitForURL(/[?&]regiao=vale-do-sereno-vila-da-serra/);
  await expect(grade(page).locator(".res-chips")).toContainText("Vale do Sereno e Vila da Serra");
  await expect(grade(page).getByLabel("Bairro")).toHaveValue("regiao:vale-do-sereno-vila-da-serra");
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
    await escolher(page, "Bairro", "Vale do Sereno e Vila da Serra", "**/imoveis?finalidade=lancamentos&regiao=vale-do-sereno-vila-da-serra");
    await expect(page.getByRole("button", { name: "Remover filtro Vale do Sereno e Vila da Serra" })).toBeVisible();
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

  test("barra fixa do celular: preço e WhatsApp", async ({ page }) => {
    await page.goto("/imovel/cz1009");
    const barra = pronta(page).locator(".im-bar");
    await expect(barra).toBeVisible();
    await expect(barra.locator("strong")).toHaveText(/^R\$ [\d.]+$/);
    await expect(barra.getByRole("link", { name: "WHATSAPP" })).toHaveAttribute("href", /wa\.me\/5531995395988\?text=.*CZ1009/);
  });

  test("AGENDAR VISITA abre o formulário em tela cheia; Esc devolve o foco ao botão", async ({ page }) => {
    await page.goto("/imovel/cz1009");
    const botao = pronta(page).locator("#im-cta");
    const painel = page.getByRole("dialog", { name: "Agendar visita" });
    await abrir(botao, painel);
    expect((await painel.boundingBox())!.width).toBe(390);
    await page.keyboard.press("Escape");
    await expect(painel).toHaveCount(0);
    await expect(botao).toBeFocused();
  });

  test("galeria no celular: uma foto com o botão; deslizar troca a foto na tela cheia", async ({ page }) => {
    await page.goto("/imovel/cz1015");
    const mosaico = pronta(page).getByRole("region", { name: "Fotos do imóvel" });
    await expect(mosaico.locator(".im-mos-item:visible")).toHaveCount(1);
    const luz = page.getByRole("dialog", { name: "Fotos do imóvel" });
    await abrir(mosaico.getByRole("button", { name: "Ver as 8 fotos" }), luz);
    const contador = luz.locator(".im-luz-cont");
    await expect(contador).toHaveText("1 / 8");
    const palco = luz.locator(".im-luz-palco");
    const arrastar = (de: number, ate: number) =>
      palco.evaluate(
        (el, [x0, x1]) => {
          const evento = (tipo: string, x: number) =>
            new PointerEvent(tipo, { bubbles: true, pointerType: "touch", clientX: x, clientY: 400 });
          el.dispatchEvent(evento("pointerdown", x0));
          el.dispatchEvent(evento("pointerup", x1));
        },
        [de, ate],
      );
    await arrastar(300, 80);
    await expect(contador).toHaveText("2 / 8");
    await arrastar(80, 300);
    await expect(contador).toHaveText("1 / 8");
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

  test("mosaico, tela cheia pelo teclado e foco de volta ao botão", async ({ page }) => {
    await page.goto("/imovel/cz1015");
    const mosaico = pronta(page).getByRole("region", { name: "Fotos do imóvel" });
    await expect(mosaico.locator(".im-mos-item:visible")).toHaveCount(3);
    const todas = mosaico.getByRole("button", { name: "Ver as 8 fotos" });
    const luz = page.getByRole("dialog", { name: "Fotos do imóvel" });
    const contador = luz.locator(".im-luz-cont");

    await abrir(todas, luz);
    await expect(contador).toHaveText("1 / 8");
    await expect(luz.getByRole("button", { name: "Fechar fotos" })).toBeFocused();
    // Cada tecla espera o estado anterior aparecer: nada aqui depende de tempo.
    await page.keyboard.press("ArrowRight");
    await expect(contador).toHaveText("2 / 8");
    await page.keyboard.press("ArrowLeft");
    await expect(contador).toHaveText("1 / 8");
    await page.keyboard.press("ArrowLeft");
    await expect(contador).toHaveText("8 / 8");
    await luz.getByRole("button", { name: "Próxima foto" }).click();
    await expect(contador).toHaveText("1 / 8");
    await expect(luz.locator(".im-luz-foto .cz-marca-dagua")).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(luz).toHaveCount(0);
    await expect(todas).toBeFocused();

    await mosaico.getByRole("button", { name: /^Abrir foto 3 de 8/ }).click();
    await expect(contador).toHaveText("3 / 8");
    const r = await new AxeBuilder({ page }).include(".im-luz").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });

  test("uma foto: ocupa o mosaico todo, sem botão de ver todas nem setas", async ({ page }) => {
    await page.goto("/imovel/cz1026");
    const mosaico = pronta(page).getByRole("region", { name: "Fotos do imóvel" });
    await expect(mosaico.locator(".im-mos-item")).toHaveCount(1);
    await expect(mosaico.getByRole("button", { name: /Ver as/ })).toHaveCount(0);
    const largura = await mosaico.locator(".im-mos-item").evaluate((el) => el.getBoundingClientRect().width);
    expect(largura).toBeGreaterThan(1400);
    const luz = page.getByRole("dialog", { name: "Fotos do imóvel" });
    await abrir(mosaico.getByRole("button", { name: /^Ampliar a foto/ }), luz);
    await expect(luz.getByRole("button", { name: "Próxima foto" })).toHaveCount(0);
  });
});

test.describe("compartilhar e semelhantes", () => {
  test.use({ viewport: { width: 1440, height: 900 }, permissions: ["clipboard-read", "clipboard-write"] });

  test("sem compartilhamento nativo: WhatsApp e Copiar link com a URL canônica", async ({ page }) => {
    // O Chromium de mesa não tem navigator.share; garante o mesmo em qualquer máquina.
    await page.addInitScript(() => Object.defineProperty(navigator, "share", { value: undefined, configurable: true }));
    await page.goto("/imovel/cz1009?de=finalidade%3Dcomprar");
    const botao = pronta(page).getByRole("button", { name: "Compartilhar", exact: true });
    const copiar = page.getByRole("button", { name: "Copiar link" });
    await abrir(botao, copiar);
    await expect(page.getByRole("group", { name: "Compartilhar este imóvel" }).getByRole("link", { name: /^WhatsApp/ })).toHaveAttribute("href", /^https:\/\/wa\.me\/\?text=.*%2Fimovel%2Fcz1009$/);
    await copiar.click();
    await expect(page.getByRole("status").filter({ hasText: "Link copiado" })).toBeVisible();
    expect(await page.evaluate(() => navigator.clipboard.readText())).toMatch(/\/imovel\/cz1009$/);
  });

  test("imóveis semelhantes: até 3, sem o próprio imóvel; também no indisponível", async ({ page }) => {
    for (const id of ["cz1009", "cz1021"]) {
      await page.goto(`/imovel/${id}`);
      const secao = pronta(page).getByRole("region", { name: "Imóveis semelhantes" });
      const links = secao.locator(".cz-card-titulo a");
      await expect(links.first()).toBeVisible();
      expect(await links.count()).toBeLessThanOrEqual(3);
      for (const href of await links.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
        expect(href).toMatch(/^\/imovel\/cz\d+$/);
        expect(href).not.toBe(`/imovel/${id}`);
      }
    }
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
    await abrir(page.locator("#im-cta"), page.getByRole("dialog", { name: "Agendar visita" }));
    await page.getByRole("button", { name: "ENVIAR" }).click();
    const r = await new AxeBuilder({ page }).include(".im-panel").withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(r.violations.map((v) => v.id)).toEqual([]);
  });
});
