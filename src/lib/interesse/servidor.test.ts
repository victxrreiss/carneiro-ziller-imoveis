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
