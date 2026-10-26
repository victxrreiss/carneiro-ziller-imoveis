import { eq, sql } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { tokensSenha, usuarios } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { descartarConvites, garantirAdminInicial } from "./admin-inicial";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.db.execute(sql`truncate usuarios, tokens_senha cascade`);
});

const dados = { nome: "Bia Ziller", email: "Bia@Imobiliaria.test" };
const HORA = 3600_000;

describe("ADMIN inicial no deploy", () => {
  test("cria o ADMIN pendente e devolve o convite de Administrador; repetir não faz nada", async () => {
    const r = await garantirAdminInicial(dados, Date.now(), amb.db);
    expect(r).toMatchObject({ ok: true, acao: "criado" });
    if (!r.ok || r.acao === "nada") return;
    expect(r.mensagem.para).toBe("bia@imobiliaria.test");
    expect(r.mensagem.texto).toContain("Administrador");
    expect(r.mensagem.link).toMatch(/\/painel\/definir-senha\?token=/);
    const [u] = await amb.db.select().from(usuarios);
    expect(u).toMatchObject({ papel: "admin", situacao: "pendente", senhaHash: null });
    expect(await garantirAdminInicial(dados, Date.now(), amb.db)).toEqual({ ok: true, acao: "nada" });
  });

  test("convite vencido ou descartado é reenviado no próximo deploy", async () => {
    const t0 = Date.now();
    await garantirAdminInicial(dados, t0, amb.db);
    expect(await garantirAdminInicial(dados, t0 + 73 * HORA, amb.db)).toMatchObject({ ok: true, acao: "reenviado" });
    await descartarConvites(dados.email, amb.db);
    expect(await amb.db.select().from(tokensSenha)).toHaveLength(0);
    expect(await garantirAdminInicial(dados, t0 + 74 * HORA, amb.db)).toMatchObject({ ok: true, acao: "reenviado" });
  });

  test("não mexe em ADMIN já ativo nem em ADMIN com outro e-mail", async () => {
    await garantirAdminInicial(dados, Date.now(), amb.db);
    expect(await garantirAdminInicial({ nome: "Outra", email: "outra@x.test" }, Date.now() + 100 * HORA, amb.db)).toEqual({ ok: true, acao: "nada" });
    await amb.db.update(usuarios).set({ situacao: "ativo" }).where(eq(usuarios.papel, "admin"));
    expect(await garantirAdminInicial(dados, Date.now() + 100 * HORA, amb.db)).toEqual({ ok: true, acao: "nada" });
  });
});
