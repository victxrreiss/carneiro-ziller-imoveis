import { describe, expect, it } from "vitest";
import { lerArgumentos } from "./importar-loft";

const base = ["--feed", "f.xml", "--ativos", "a.csv", "--pendentes", "p.csv", "--responsavel", "x@y.test"];

describe("lerArgumentos", () => {
  it("lê os quatro argumentos e simular começa desligado", () => {
    expect(lerArgumentos(base)).toEqual({ feed: "f.xml", ativos: "a.csv", pendentes: "p.csv", responsavel: "x@y.test", simular: false });
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
});
