// Painel interno. O banco é compartilhado com o site: estes testes rodam depois dos
// do site (projeto "painel" em playwright.config.ts), em série, e desfazem o que mudam
// (o imóvel criado é excluído; a Oportunidade de hoje volta para o CZ1009).
// Contas e senha são geradas a cada execução por scripts/e2e-preparar.ts e chegam por
// variável de ambiente; nada fixo no repositório.
import { expect, test, type Page } from "@playwright/test";

const SENHA = process.env.E2E_SENHA!;
const ADMIN = process.env.E2E_ADMIN_EMAIL!;
const CORRETOR = process.env.E2E_CORRETOR_EMAIL!;
const DESATIVADO = process.env.E2E_DESATIVADO_EMAIL!;
const MAILPIT = process.env.MAILPIT_URL ?? "http://localhost:8025";
// E-mail de quem será convidado neste teste (único por execução).
const CONVIDADO = `convidado-${Date.now().toString(36)}@e2e.test`;

/** Lê o link de "definir senha" do e-mail mais recente para `destino`, pela API do Mailpit. */
async function linkDoEmail(destino: string): Promise<string> {
  let link = "";
  await expect
    .poll(
      async () => {
        const busca = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${destino}`)}`);
        const { messages } = (await busca.json()) as { messages?: { ID: string }[] };
        if (!messages?.length) return "";
        const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { Text?: string };
        link = /https?:\/\/\S+\/painel\/definir-senha\?token=[\w-]+/.exec(msg.Text ?? "")?.[0] ?? "";
        return link;
      },
      { timeout: 15_000, message: `e-mail para ${destino} não chegou ao Mailpit` },
    )
    .not.toBe("");
  return link;
}
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

test("o site só leva ao painel pelo botão SOU CORRETOR (login)", async ({ page }) => {
  await page.goto("/");
  const links = page.locator('a[href^="/painel"]');
  await expect(links).not.toHaveCount(0);
  for (const href of await links.evaluateAll((els) => els.map((e) => e.getAttribute("href")))) expect(href).toMatch(/^\/painel\/entrar/);
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
  await gaveta.getByLabel(/E-MAIL/).fill(DESATIVADO);
  await gaveta.getByRole("button", { name: "ENVIAR CONVITE" }).click();
  await expect(gaveta.getByText(/Já existe um usuário com este e-mail/)).toBeVisible();
  await gaveta.getByLabel(/E-MAIL/).fill(CONVIDADO);
  await gaveta.getByRole("button", { name: "ENVIAR CONVITE" }).click();
  await expect(gaveta.getByText("Convite enviado")).toBeVisible();
  await gaveta.getByRole("button", { name: "CONCLUIR" }).click();
  await expect(page.getByRole("cell", { name: CONVIDADO })).toBeVisible();

  await page.goto("/painel/conta");
  await page.locator("#pn-c-atual").fill("errada-errada");
  await page.locator("#pn-c-nova").fill("nova-senha-2027");
  await page.locator("#pn-c-conf").fill("nova-senha-2027");
  await page.getByRole("button", { name: "ALTERAR SENHA" }).click();
  await expect(page.getByText("A senha atual está incorreta.")).toBeVisible();
});

test("o convite chega por e-mail e o link define a senha e dá acesso", async ({ page }) => {
  const link = await linkDoEmail(CONVIDADO);
  await page.goto(link);
  await page.locator("#pn-nova").fill("senha-do-convidado-2027");
  await page.locator("#pn-conf").fill("senha-do-convidado-2027");
  await page.getByRole("button", { name: "SALVAR SENHA" }).click();
  await expect(page.getByText("Senha definida")).toBeVisible();
  // O link vale uma vez só.
  await page.goto(link);
  await expect(page.locator("#pn-nova")).toHaveCount(0);

  await page.goto("/painel/entrar");
  await page.getByLabel("E-MAIL").fill(CONVIDADO);
  await page.locator("#pn-senha").fill("senha-do-convidado-2027");
  await page.getByRole("button", { name: "ENTRAR" }).click();
  await page.waitForURL(/\/painel\/imoveis$/);
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

test("interesse enviado pelo site é gravado e avisa o ADMIN por e-mail", async ({ page }) => {
  const visitante = `visitante-${Date.now().toString(36)}@e2e.test`;
  await page.goto("/imovel/cz1009");
  await page.locator("#im-cta").click();
  await page.locator("#im-nome").fill("Visitante de Teste");
  await page.locator("#im-tel").fill("31999998888");
  await page.locator("#im-email").fill(visitante);
  await page.getByRole("button", { name: "ENVIAR" }).click();
  await expect(page.getByText(/Recebemos seu interesse/)).toBeVisible();

  await expect
    .poll(
      async () => {
        const busca = await fetch(`${MAILPIT}/api/v1/search?query=${encodeURIComponent(`to:${ADMIN} subject:CZ1009`)}`);
        const { messages } = (await busca.json()) as { messages?: { ID: string }[] };
        if (!messages?.length) return "";
        const msg = (await (await fetch(`${MAILPIT}/api/v1/message/${messages[0].ID}`)).json()) as { Text?: string };
        return msg.Text ?? "";
      },
      { timeout: 15_000, message: "aviso de interesse não chegou ao ADMIN" },
    )
    .toContain(visitante);
});
