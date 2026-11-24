// Mais de um ADMIN (decisão do usuário, 24/11/2026): convite como ADMIN e troca de papel.
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { usuarios } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { alterarPapel, convidar, definirSenhaProvisoria, desativar } from "./contas";
import type { UsuarioLogado } from "./regras";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const papelDe = async (id: string) => (await amb.db.select({ p: usuarios.papel }).from(usuarios).where(eq(usuarios.id, id)))[0].p;
const comoAdmin = (u: UsuarioLogado): UsuarioLogado => ({ ...u, papel: "admin" });

describe("papéis", () => {
  test("o convite pode criar um ADMIN; sem papel, é Corretor", async () => {
    const a = await convidar(amb.admin, "Sócia Nova", "socia@exemplo.test", Date.now(), amb.db, "admin");
    const c = await convidar(amb.admin, "Corretor Novo", "corretor@exemplo.test", Date.now(), amb.db);
    expect(a.ok && a.usuario.papel).toBe("admin");
    expect(c.ok && c.usuario.papel).toBe("corretor");
  });

  test("o ADMIN torna um Corretor ADMIN e o volta a Corretor", async () => {
    expect(await alterarPapel(amb.admin, amb.mariana.id, "admin", amb.db)).toEqual({ ok: true });
    expect(await papelDe(amb.mariana.id)).toBe("admin");
    expect(await alterarPapel(amb.admin, amb.mariana.id, "corretor", amb.db)).toEqual({ ok: true });
    expect(await papelDe(amb.mariana.id)).toBe("corretor");
  });

  test("ninguém muda o próprio papel; Corretor não muda papel de ninguém", async () => {
    expect(await alterarPapel(amb.admin, amb.admin.id, "corretor", amb.db)).toEqual({ ok: false, erro: "proibido" });
    expect(await alterarPapel(amb.mariana, amb.ricardo.id, "admin", amb.db)).toEqual({ ok: false, erro: "proibido" });
    expect(await papelDe(amb.ricardo.id)).toBe("corretor");
  });

  test("o último ADMIN ativo não vira Corretor; com outro ADMIN ativo, vira", async () => {
    await alterarPapel(amb.admin, amb.mariana.id, "admin", amb.db);
    const mariana = comoAdmin(amb.mariana);
    // A Mariana (ADMIN) rebaixa a Ana: ainda sobra ela.
    expect(await alterarPapel(mariana, amb.admin.id, "corretor", amb.db)).toEqual({ ok: true });
    // Agora a Mariana é a única ADMIN ativa: um ADMIN desativado não conta.
    await amb.db.update(usuarios).set({ papel: "admin" }).where(eq(usuarios.id, amb.paulo.id));
    await amb.db.update(usuarios).set({ papel: "admin" }).where(eq(usuarios.id, amb.admin.id));
    await desativar(mariana, amb.admin.id, amb.db);
    expect(await alterarPapel(comoAdmin(amb.paulo), amb.mariana.id, "corretor", amb.db)).toEqual({ ok: false, erro: "ultimo-admin" });
    expect(await papelDe(amb.mariana.id)).toBe("admin");
  });

  test("usuário inexistente", async () => {
    expect(await alterarPapel(amb.admin, "00000000-0000-4000-8000-000000000000", "admin", amb.db)).toEqual({ ok: false, erro: "inexistente" });
  });

  test("senha provisória de outro ADMIN continua proibida", async () => {
    await alterarPapel(amb.admin, amb.mariana.id, "admin", amb.db);
    expect(await definirSenhaProvisoria(amb.admin, amb.mariana.id, Date.now(), amb.db)).toEqual({ ok: false, erro: "proibido" });
  });
});
