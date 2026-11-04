import { eq } from "drizzle-orm";
import { afterEach, beforeAll, beforeEach, describe, expect, test } from "vitest";
import { imoveis, interesses, usuarios } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { LIMITE_POR_IP, limparLimitesVencidos, registrarInteresse } from "./servidor";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
});
afterEach(() => {
  delete process.env.LEADS_EMAIL;
});

const valido = { imovelId: "cz1009", codigo: "CZ1009", nome: " Carla  Souza ", telefone: "+5531999998888", email: "Carla@Exemplo.test", observacoes: "Posso visitar sábado?", origem: "site", url: "https://site.test/imovel/cz1009" };

describe("interesse (lead)", () => {
  test("grava o lead e avisa o corretor responsável, o ADMIN e LEADS_EMAIL", async () => {
    await amb.db.update(imoveis).set({ responsavelId: amb.mariana.id, situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    process.env.LEADS_EMAIL = "leads@imobiliaria.test, admin@exemplo.test";
    const r = await registrarInteresse(valido, "203.0.113.5", Date.now(), amb.db);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [salvo] = await amb.db.select().from(interesses).where(eq(interesses.id, r.id));
    expect(salvo).toMatchObject({ imovelId: "cz1009", nome: "Carla Souza", email: "carla@exemplo.test", telefone: "+5531999998888" });
    expect(r.avisos.map((a) => a.para).sort()).toEqual(["admin@exemplo.test", "leads@imobiliaria.test", "mariana@exemplo.test"]);
    expect(r.avisos[0].texto).toContain("+5531999998888");
  });

  test("contato geral: sem imóvel, grava caminho+query e avisa só ADMIN e LEADS_EMAIL", async () => {
    process.env.LEADS_EMAIL = "leads@imobiliaria.test";
    const geral = { nome: "Beto", telefone: "+5531999999999", email: "beto@x.test", observacoes: "Quero vender", origem: "contato", url: "https://carneiroziller.com.br/contato?x=1" };
    const r = await registrarInteresse(geral, "1.1.1.1", Date.now(), amb.db);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const [salvo] = await amb.db.select().from(interesses).where(eq(interesses.id, r.id));
    expect(salvo).toMatchObject({ imovelId: null, codigo: "", origem: "contato", url: "/contato?x=1" });
    expect(r.avisos.map((a) => a.para).sort()).toEqual(["admin@exemplo.test", "leads@imobiliaria.test"]);
    const aviso = r.avisos[0];
    expect(aviso.assunto).toBe("Nova mensagem pelo site: Beto");
    expect(aviso.html).toContain("Nova mensagem pelo site");
    expect(aviso.html).toContain("Beto enviou uma mensagem pelo site.");
    expect(aviso.html).toContain("Um visitante enviou uma mensagem pela página de contato em");
    expect(aviso.html).not.toContain("sobre .");
    expect(aviso.html).not.toContain("sobre <strong");
    expect(aviso.link).toMatch(/\/painel\/contatos$/);
  });

  test("sem imovelId só vale para origem contato", async () => {
    const base = { nome: "Beto", telefone: "+5531999999999", email: "beto@x.test" };
    expect(await registrarInteresse({ ...base, origem: "site" }, "ip", Date.now(), amb.db)).toEqual({ ok: false, erro: "dados" });
    expect(await registrarInteresse({ ...base }, "ip", Date.now(), amb.db)).toEqual({ ok: false, erro: "dados" });
    expect(await amb.db.select().from(interesses)).toHaveLength(0);
  });

  test("url do formulário do imóvel também vira caminho; caminho puro é aceito; o resto vira vazio", async () => {
    await amb.db.update(imoveis).set({ situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    const urlGravada = async (url: string) => {
      const r = await registrarInteresse({ ...valido, url }, "ip", Date.now(), amb.db);
      if (!r.ok) throw new Error("falhou");
      return (await amb.db.select().from(interesses).where(eq(interesses.id, r.id)))[0].url;
    };
    expect(await urlGravada("https://site.test/imovel/cz1009?de=x#topo")).toBe("/imovel/cz1009?de=x");
    expect(await urlGravada("/imovel/cz1009?a=1")).toBe("/imovel/cz1009?a=1");
    expect(await urlGravada("lixo")).toBe("");
  });

  test("corretor desativado não recebe aviso", async () => {
    await amb.db.update(imoveis).set({ responsavelId: amb.paulo.id, situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    const r = await registrarInteresse(valido, "203.0.113.5", Date.now(), amb.db);
    expect(r.ok && r.avisos.map((a) => a.para)).toEqual(["admin@exemplo.test"]);
  });

  test("recusa dados inválidos e imóvel que não está publicado", async () => {
    await amb.db.update(imoveis).set({ situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    for (const ruim of [{ ...valido, nome: "A" }, { ...valido, telefone: "31999998888" }, { ...valido, email: "x@" }, { ...valido, observacoes: "x".repeat(1001) }, { ...valido, imovelId: "../x" }]) {
      expect(await registrarInteresse(ruim, "ip", Date.now(), amb.db)).toEqual({ ok: false, erro: "dados" });
    }
    await amb.db.update(imoveis).set({ situacao: "rascunho" }).where(eq(imoveis.id, "cz1009"));
    expect(await registrarInteresse(valido, "ip", Date.now(), amb.db)).toEqual({ ok: false, erro: "imovel" });
    expect(await registrarInteresse({ ...valido, imovelId: "cz9999" }, "ip", Date.now(), amb.db)).toEqual({ ok: false, erro: "imovel" });
    expect(await amb.db.select().from(interesses)).toHaveLength(0);
  });

  test("limita envios por IP na janela e libera quando ela vence", async () => {
    await amb.db.update(imoveis).set({ situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    const agora = Date.now();
    for (let i = 0; i < LIMITE_POR_IP.envios; i++) expect((await registrarInteresse(valido, "198.51.100.7", agora, amb.db)).ok).toBe(true);
    expect(await registrarInteresse(valido, "198.51.100.7", agora, amb.db)).toEqual({ ok: false, erro: "limite" });
    expect((await registrarInteresse(valido, "198.51.100.8", agora, amb.db)).ok).toBe(true);
    const depois = agora + LIMITE_POR_IP.janelaMin * 60_000 + 1;
    expect((await registrarInteresse(valido, "198.51.100.7", depois, amb.db)).ok).toBe(true);
    expect(await limparLimitesVencidos(depois + LIMITE_POR_IP.janelaMin * 60_000 + 1, amb.db)).toBe(2);
  });

  test("lead continua salvo se o imóvel for excluído", async () => {
    await amb.db.update(imoveis).set({ situacao: "publicado" }).where(eq(imoveis.id, "cz1009"));
    const r = await registrarInteresse(valido, "ip", Date.now(), amb.db);
    await amb.db.delete(imoveis).where(eq(imoveis.id, "cz1009"));
    const [salvo] = await amb.db.select().from(interesses).where(eq(interesses.id, r.ok ? r.id : ""));
    expect(salvo).toMatchObject({ imovelId: null, codigo: expect.stringMatching(/1009/) });
    void usuarios;
  });
});
