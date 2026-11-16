// Nenhuma foto se repete na Home (abertura, tipos, regiões e bloco institucional). A comparação é
// pelo conteúdo do arquivo: o mesmo JPG existe com nomes diferentes em public/images.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, test, vi } from "vitest";
import { REGIOES } from "@/lib/imoveis/regioes";
import { abertura } from "@/lib/site";
import { CARDS } from "./CardsTipos";
import { FOTO_INSTITUCIONAL } from "./Institutional";

vi.mock("@/lib/imoveis", () => ({ getContagemPorTipo: vi.fn() }));

const conteudo = (src: string) => createHash("md5").update(readFileSync(path.join(process.cwd(), "public", src))).digest("hex");

describe("fotos da Home", () => {
  test("nenhuma foto se repete na Home, comparando o conteúdo dos arquivos", () => {
    const fotos = [
      ...abertura.imagens.map((i) => ["abertura", i.src]),
      ...CARDS.map((c) => [`tipo ${c.tipo}`, c.img]),
      ...REGIOES.map((r) => [`região ${r.nome}`, r.img]),
      ["institucional", FOTO_INSTITUCIONAL],
    ];
    const porConteudo = new Map<string, string[]>();
    for (const [onde, src] of fotos) porConteudo.set(conteudo(src), [...(porConteudo.get(conteudo(src)) ?? []), `${onde} (${src})`]);
    const repetidas = [...porConteudo.values()].filter((usos) => usos.length > 1);
    expect(repetidas).toEqual([]);
    expect(porConteudo.size).toBe(fotos.length);
  });
});
