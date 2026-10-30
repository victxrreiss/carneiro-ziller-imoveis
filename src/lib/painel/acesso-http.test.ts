import { describe, expect, it } from "vitest";
import type { LeituraSessao } from "./contas";
import { exigirSessaoHttp } from "./acesso-http";

const usuario = { id: "u1", nome: "A", email: "a@b.com", papel: "corretor" as const, trocarSenha: false };

describe("exigirSessaoHttp", () => {
  it("sem sessão: 401", () => {
    const r = exigirSessaoHttp({ usuario: null, motivo: "ausente" } as unknown as LeituraSessao);
    expect("resposta" in r && r.resposta.status).toBe(401);
  });
  it("sessão com senha provisória: 403", async () => {
    const r = exigirSessaoHttp({ usuario: { ...usuario, trocarSenha: true } } as unknown as LeituraSessao);
    expect("resposta" in r && r.resposta.status).toBe(403);
    expect("resposta" in r && (await r.resposta.json())).toMatchObject({ ok: false });
  });
  it("sessão normal passa", () => {
    const r = exigirSessaoHttp({ usuario } as unknown as LeituraSessao);
    expect("usuario" in r && r.usuario.id).toBe("u1");
  });
});
