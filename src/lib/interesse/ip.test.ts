import { describe, expect, it } from "vitest";
import { ipDoVisitante } from "./ip";

const h = (o: Record<string, string>) => new Headers(o);

describe("ipDoVisitante", () => {
  it("prefere cf-connecting-ip", () => {
    expect(ipDoVisitante(h({ "cf-connecting-ip": "1.1.1.1", "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("1.1.1.1");
  });
  it("sem Cloudflare, usa x-real-ip", () => {
    expect(ipDoVisitante(h({ "x-real-ip": "2.2.2.2", "x-forwarded-for": "3.3.3.3" }))).toBe("2.2.2.2");
  });
  it("só x-forwarded-for: usa o último valor, não o forjável primeiro", () => {
    expect(ipDoVisitante(h({ "x-forwarded-for": "9.9.9.9, 8.8.8.8 , 3.3.3.3" }))).toBe("3.3.3.3");
  });
  it("sem cabeçalhos, devolve vazio", () => {
    expect(ipDoVisitante(h({}))).toBe("");
  });
});
