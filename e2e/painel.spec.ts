// Painel interno. A base é em memória e compartilhada com o site: estes testes
// rodam depois dos do site (projeto "painel" em playwright.config.ts), em série,
// e desfazem o que mudam (o imóvel criado é excluído; a Oportunidade de hoje volta para o CZ1009).
import { expect, test, type Page } from "@playwright/test";

const SENHA = "carneiro-ziller-2026";
const ADMIN = "andre@zillerimoveis.com.br";
const CORRETOR = "mariana.costa@carneiroziller.com.br";
// PNG 1×1.
const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

test.describe.configure({ mode: "serial" });
test.use({ viewport: { width: 1440, height: 900 } });

async function entrar(page: Page, email: string) {
  await page.goto("/painel/entrar");
  await page.getByLabel("E-MAIL").fill(email);
  await page.locator("#pn-senha").fill(SENHA);
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await page.waitForURL(/\/painel\/imoveis$/);
  await expect(page.getByRole("heading", { level: 1, name: "Imóveis" })).toBeVisible();
}

async function sair(page: Page) {
  if (!new URL(page.url()).pathname.startsWith("/painel")) await page.goto("/painel/imoveis");
  const sair = page.getByRole("button", { name: "Sair" });
  if (!(await sair.first().isVisible())) await page.getByRole("button", { name: "Abrir menu" }).click();
  await sair.first().click();
  await page.waitForURL(/\/painel\/entrar$/);
}

let codigo = "";

test("sem sessão vai para Entrar e volta para a página pedida", async ({ page }) => {
  await page.goto("/painel/usuarios");
  await page.waitForURL(/\/painel\/entrar\?/);
  await page.getByLabel("E-MAIL").fill(ADMIN);
  await page.locator("#pn-senha").fill("errada");
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await expect(page.getByText("E-mail ou senha incorretos.")).toBeVisible();
  await expect(page.locator("#pn-senha")).toHaveValue("");
  await page.locator("#pn-senha").fill(SENHA);
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await page.waitForURL(/\/painel\/usuarios$/);
  await expect(page.getByRole("heading", { level: 1, name: "Usuários" })).toBeVisible();
});

test("o site não tem link para o painel", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator('a[href^="/painel"]')).toHaveCount(0);
});

test("Corretor: sem Usuários no menu, sem permissão pelo endereço, imóvel de outro em leitura", async ({ page }) => {
  await entrar(page, CORRETOR);
  await expect(page.getByRole("link", { name: "Usuários" })).toHaveCount(0);
  await page.goto("/painel/usuarios");
  await expect(page.getByText("Você não tem acesso a esta página")).toBeVisible();
  await page.goto("/painel/imoveis/cz1015");
  await expect(page.getByText("Somente leitura")).toBeVisible();
  await expect(page.getByRole("button", { name: "SALVAR ALTERAÇÕES" })).toHaveCount(0);
  await sair(page);
});

test("ADMIN cadastra: rascunho incompleto, publicar exige os obrigatórios, publica com foto", async ({ page }) => {
  await entrar(page, ADMIN);
  await page.getByRole("link", { name: "CADASTRAR IMÓVEL" }).click();
  await page.getByLabel(/TÍTULO/).fill("Casa de teste do painel");
  await page.getByRole("button", { name: "SALVAR RASCUNHO" }).click();
  await page.waitForURL(/\/painel\/imoveis\/cz\d+$/);
  codigo = (await page.locator(".pn-ro.is-code").first().textContent())!.trim();
  await expect(page.getByText("Rascunho salvo.", { exact: true })).toBeVisible();

  await page.getByRole("button", { name: "PUBLICAR" }).click();
  const resumo = page.locator("#pn-summary");
  await expect(resumo).toBeFocused();
  await expect(resumo).toContainText("Para publicar");
  await expect(resumo.getByRole("link", { name: "Finalidade" })).toBeVisible();

  await page.getByRole("radio", { name: "VENDA" }).click();
  await page.getByRole("button", { name: /TIPO/ }).click();
  await page.getByRole("option", { name: "Casa", exact: true }).click();
  await page.getByLabel(/BAIRRO/).fill("Sion");
  await page.getByLabel(/CIDADE/).fill("Nova Lima");
  await page.getByLabel(/^VALOR/).fill("2500000");
  await expect(page.getByLabel(/^VALOR/)).toHaveValue("2.500.000");
  await page.getByLabel(/ÁREA/).fill("320");
  await page.getByLabel(/DESCRIÇÃO/).fill("Casa ampla.\n\nPerto de tudo.");
  await page.locator("#pn-file:visible").setInputFiles({ name: "fachada.png", mimeType: "image/png", buffer: PNG });
  await expect(page.locator(".pn-photo-cover")).toHaveText("CAPA");
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await page.getByLabel("TEXTO ALTERNATIVO").fill("Fachada da casa");
  await page.getByRole("button", { name: "PUBLICAR" }).click();
  await expect(page.getByText("Imóvel publicado.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "SALVAR ALTERAÇÕES" })).toBeVisible();

  await page.goto(`/imovel/${codigo.toLowerCase()}`);
  await expect(page.getByRole("heading", { name: "Casa de teste do painel" })).toBeVisible();
  await expect(page.locator(`img[alt="Fachada da casa"]`).first()).toBeVisible();
});

test("Oportunidade de hoje: ADMIN escolhe; Corretor tira do ar e o ADMIN é avisado", async ({ page }) => {
  await entrar(page, ADMIN);
  await page.goto(`/painel/imoveis/${codigo.toLowerCase()}`);
  await page.getByText("Usar na Oportunidade de hoje").click();
  await expect(page.getByText("Hoje a Oportunidade de hoje é")).toContainText("CZ1009");
  await page.getByRole("button", { name: "RESPONSÁVEL" }).click();
  await page.getByRole("option", { name: "Mariana Costa" }).click();
  await page.getByRole("button", { name: "SALVAR ALTERAÇÕES" }).click();
  await expect(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#destaque-titulo")).toHaveText("Casa de teste do painel");
  await sair(page);

  await entrar(page, CORRETOR);
  await page.goto(`/painel/imoveis/${codigo.toLowerCase()}`);
  await page.getByText("Indisponível", { exact: true }).click();
  await expect(page.getByText("O ADMIN recebe um aviso no painel.")).toBeVisible();
  await page.getByRole("button", { name: "SALVAR ALTERAÇÕES" }).click();
  await expect(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
  await page.goto("/");
  await expect(page.locator("#destaque-titulo")).toHaveCount(0);
  await page.goto("/painel/imoveis");
  await expect(page.getByText("A Oportunidade de hoje está vazia")).toHaveCount(0);
  await sair(page);

  await entrar(page, ADMIN);
  await expect(page.getByText("A Oportunidade de hoje está vazia")).toBeVisible();
  await expect(page.getByText(`Mariana Costa marcou ${codigo}`)).toBeVisible();
  // Volta a semente: CZ1009 na Oportunidade de hoje.
  await page.goto("/painel/imoveis/cz1009");
  await page.getByText("Usar na Oportunidade de hoje").click();
  await page.getByRole("button", { name: "SALVAR ALTERAÇÕES" }).click();
  await expect(page.getByText("Alterações salvas.", { exact: true })).toBeVisible();
  await page.goto("/painel/imoveis");
  await expect(page.getByText("A Oportunidade de hoje está vazia")).toHaveCount(0);
});

test("ADMIN exclui o imóvel de teste", async ({ page }) => {
  await entrar(page, ADMIN);
  await page.getByLabel("Buscar por código ou título").fill(codigo);
  await page.getByRole("button", { name: `Mais ações para ${codigo}` }).click();
  await page.getByRole("menuitem", { name: "Excluir imóvel" }).click();
  await expect(page.getByRole("alertdialog")).toContainText("Excluir este imóvel?");
  await page.getByRole("button", { name: "EXCLUIR IMÓVEL" }).click();
  await expect(page.getByText("Imóvel excluído.", { exact: true })).toBeVisible();
  await page.goto(`/imovel/${codigo.toLowerCase()}`);
  await expect(page.getByRole("heading", { name: /não encontrado/i })).toBeVisible();
});

test("convidar usuário e trocar senha com a atual errada", async ({ page }) => {
  await entrar(page, ADMIN);
  await page.goto("/painel/usuarios");
  await page.getByRole("button", { name: "CONVIDAR USUÁRIO" }).first().click();
  const gaveta = page.getByRole("dialog", { name: "Convidar usuário" });
  await gaveta.getByLabel(/NOME/).fill("Paulo");
  await gaveta.getByLabel(/E-MAIL/).fill("paulo.menezes@carneiroziller.com.br");
  await gaveta.getByRole("button", { name: "ENVIAR CONVITE" }).click();
  await expect(gaveta.getByText(/Já existe um usuário com este e-mail/)).toBeVisible();
  await gaveta.getByLabel(/E-MAIL/).fill("teste.painel@carneiroziller.com.br");
  await gaveta.getByRole("button", { name: "ENVIAR CONVITE" }).click();
  await expect(gaveta.getByText("Convite enviado")).toBeVisible();
  await gaveta.getByRole("button", { name: "CONCLUIR" }).click();
  await expect(page.getByRole("cell", { name: "teste.painel@carneiroziller.com.br" })).toBeVisible();

  await page.goto("/painel/conta");
  await page.locator("#pn-c-atual").fill("errada-errada");
  await page.locator("#pn-c-nova").fill("nova-senha-2027");
  await page.locator("#pn-c-conf").fill("nova-senha-2027");
  await page.getByRole("button", { name: "ALTERAR SENHA" }).click();
  await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();
});

for (const width of [390, 1024, 1440]) {
  test(`sem rolagem horizontal no painel em ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await entrar(page, ADMIN);
    for (const url of ["/painel/imoveis", "/painel/imoveis/cz1009", "/painel/imoveis/novo", "/painel/usuarios", "/painel/conta"]) {
      await page.goto(url);
      await page.locator("#pn-main h1").first().waitFor();
      const largura = await page.evaluate(() => document.documentElement.scrollWidth);
      expect(largura, url).toBeLessThanOrEqual(width);
    }
  });
}
