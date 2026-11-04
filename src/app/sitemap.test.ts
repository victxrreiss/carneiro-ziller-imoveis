import { beforeEach, describe, expect, test, vi } from "vitest";

const temLancamentos = vi.fn();
vi.mock("@/lib/imoveis", () => ({
  getSitemapImoveis: async () => [
    { id: "cz1001", alteradoEm: "2026-10-01T10:00:00.000Z" },
    { id: "cz1002", alteradoEm: "2026-10-02T10:00:00.000Z" },
  ],
  getTemLancamentos: () => temLancamentos(),
}));

import robots from "./robots";
import sitemap from "./sitemap";

beforeEach(() => {
  vi.stubEnv("SITE_URL", "https://site.com");
});

describe("sitemap", () => {
  test("páginas fixas e imóveis publicados, absolutos, com lastModified; sem lançamentos quando não há", async () => {
    temLancamentos.mockResolvedValue(false);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toEqual([
      "https://site.com/",
      "https://site.com/imoveis",
      "https://site.com/contato",
      "https://site.com/sobre",
      "https://site.com/politica-de-privacidade",
      "https://site.com/imovel/cz1001",
      "https://site.com/imovel/cz1002",
    ]);
    const item = (await sitemap()).find((e) => e.url.endsWith("cz1002"));
    expect(item?.lastModified).toBe("2026-10-02T10:00:00.000Z");
  });

  test("com lançamentos, inclui a página deles", async () => {
    temLancamentos.mockResolvedValue(true);
    const urls = (await sitemap()).map((e) => e.url);
    expect(urls).toContain("https://site.com/imoveis?finalidade=lancamentos");
  });
});

describe("robots", () => {
  test("bloqueia painel e api e aponta o sitemap", () => {
    const r = robots();
    expect(r.rules).toEqual({ userAgent: "*", allow: "/", disallow: ["/painel", "/api"] });
    expect(r.sitemap).toBe("https://site.com/sitemap.xml");
  });
});
