import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { usuarios } from "../src/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "../src/lib/dados/testes";
import { criarAdminInicial } from "../src/lib/painel/admin-inicial";
import { definirSenha, entrar, lerToken } from "../src/lib/painel/contas";
import { exigirBancoLocal, hostLocal } from "./guardas";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar();
  await amb.db.delete(usuarios);
});

describe("admin:criar", () => {
  test("cria o ADMIN pendente e sem senha; o link de convite define a senha", async () => {
    const r = await criarAdminInicial({ nome: "  Ana   Souza ", email: "Ana@Exemplo.Test" }, Date.now(), amb.db);
    if (!r.ok) throw new Error(r.erro);
    const [u] = await amb.db.select().from(usuarios);
    expect(u).toMatchObject({ nome: "Ana Souza", email: "ana@exemplo.test", papel: "admin", situacao: "pendente", senhaHash: null });
    const token = new URL(r.link).searchParams.get("token")!;
    expect(new URL(r.link).pathname).toBe("/painel/definir-senha");
    expect(await lerToken(token, Date.now(), amb.db)).toMatchObject({ valido: true, tipo: "convite" });
    expect((await entrar("ana@exemplo.test", "qualquer", Date.now(), amb.db)).ok).toBe(false);
    const senha = `${crypto.randomUUID()}-Aa1`;
    expect((await definirSenha(token, senha, senha, Date.now(), amb.db)).ok).toBe(true);
    expect((await entrar("ana@exemplo.test", senha, Date.now(), amb.db)).ok).toBe(true);
  });

  test("o convite vale 72 horas", async () => {
    const r = await criarAdminInicial({ nome: "Ana", email: "ana@exemplo.test" }, 0, amb.db);
    if (!r.ok) throw new Error(r.erro);
    const token = new URL(r.link).searchParams.get("token")!;
    expect((await lerToken(token, 71 * 3600_000, amb.db)).valido).toBe(true);
    expect((await lerToken(token, 73 * 3600_000, amb.db)).valido).toBe(false);
  });

  test("recusa um segundo ADMIN, mesmo com outro e-mail", async () => {
    expect((await criarAdminInicial({ nome: "Ana", email: "ana@exemplo.test" }, Date.now(), amb.db)).ok).toBe(true);
    const r = await criarAdminInicial({ nome: "Beto", email: "beto@exemplo.test" }, Date.now(), amb.db);
    expect(r).toMatchObject({ ok: false, erro: expect.stringContaining("Já existe um ADMIN") });
    expect(await amb.db.select().from(usuarios).where(eq(usuarios.papel, "admin"))).toHaveLength(1);
  });

  test("valida nome e e-mail e não grava nada quando recusa", async () => {
    expect(await criarAdminInicial({ nome: "A", email: "ana@exemplo.test" }, Date.now(), amb.db)).toMatchObject({ ok: false });
    expect(await criarAdminInicial({ nome: "Ana", email: "sem-arroba" }, Date.now(), amb.db)).toMatchObject({ ok: false });
    expect(await amb.db.select().from(usuarios)).toHaveLength(0);
  });
});

describe("guardas dos comandos destrutivos", () => {
  test("só banco local", () => {
    expect(hostLocal("postgres://u:p@localhost:5432/cz_dev")).toBe(true);
    expect(hostLocal("postgres://u:p@127.0.0.1/cz_dev")).toBe(true);
    expect(hostLocal("postgres://u:p@db.projeto.supabase.co/postgres")).toBe(false);
    expect(hostLocal("não é url")).toBe(false);
    expect(() => exigirBancoLocal("db:semente", "postgres://u:p@db.exemplo.com/x")).toThrow(/banco local/);
    expect(() => exigirBancoLocal("db:semente", "postgres://u:p@localhost/x")).not.toThrow();
  });
});
