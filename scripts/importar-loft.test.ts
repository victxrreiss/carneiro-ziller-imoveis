import { describe, expect, it } from "vitest";
import { lerArgumentos, lerFeed, linhaProgresso } from "./importar-loft";

const base = ["--feed", "f.xml", "--ativos", "a.csv", "--pendentes", "p.csv", "--responsavel", "x@y.test"];

describe("lerArgumentos", () => {
  it("lê os quatro argumentos e simular começa desligado", () => {
    expect(lerArgumentos(base)).toEqual({ feed: "f.xml", ativos: "a.csv", pendentes: "p.csv", responsavel: "x@y.test", simular: false, forcar: false });
  });
  it("liga --simular", () => {
    expect(lerArgumentos([...base, "--simular"]).simular).toBe(true);
  });
  it("exige --responsavel", () => {
    expect(() => lerArgumentos(base.slice(0, 6))).toThrow("Informe --responsavel");
  });
  it("exige os demais", () => {
    expect(() => lerArgumentos(["--responsavel", "x@y.test"])).toThrow("Informe --feed");
  });
  it("liga --forcar", () => {
    expect(lerArgumentos([...base, "--forcar"]).forcar).toBe(true);
  });
});

describe("lerFeed", () => {
  it("valor que não é URL e não existe como arquivo: erro sem repetir o valor", async () => {
    const erro = await lerFeed("segredo-que-nao-existe.xml").catch((e: Error) => e);
    expect((erro as Error).message).toBe("Feed não encontrado (use um arquivo existente ou uma URL http/https).");
    expect((erro as Error).message).not.toContain("segredo");
  });
  it("lê um arquivo existente", async () => {
    const f = await lerFeed("scripts/loft/fixtures/feed.xml");
    expect(f.nome).toBe("feed.xml");
    expect(f.xml).toContain("Listing");
  });
});

describe("linhaProgresso", () => {
  it("formata criado com fotos e sem fotos", () => {
    expect(linhaProgresso({ n: 3, total: 422, referencia: "442", acao: "criado", codigo: "CZ1011", fotos: { ok: 18, total: 19 } })).toBe("[3/422] ref 442 → criado CZ1011 (18/19 fotos)");
    expect(linhaProgresso({ n: 4, total: 422, referencia: "9", acao: "excluído" })).toBe("[4/422] ref 9 → excluído");
  });
});
