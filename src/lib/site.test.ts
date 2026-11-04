import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { empresa, linkWhatsApp, ogPadrao } from "./site";

function arquivosFonte(dir: string): string[] {
  return readdirSync(dir).flatMap((nome) => {
    const caminho = join(dir, nome);
    if (statSync(caminho).isDirectory()) return arquivosFonte(caminho);
    return /\.tsx?$/.test(nome) && !/\.test\./.test(nome) ? [caminho] : [];
  });
}

describe("site", () => {
  it("Open Graph padrão traz marca, idioma, tipo e imagem", () => {
    expect(ogPadrao).toMatchObject({ type: "website", siteName: empresa.nome, locale: "pt_BR" });
    expect(ogPadrao.images[0].url).toBe("/images/hero-predio.png");
  });

  it("monta o link do WhatsApp com e sem mensagem", () => {
    expect(linkWhatsApp()).toBe("https://wa.me/5531995395988");
    expect(linkWhatsApp("Olá! CZ1241")).toBe("https://wa.me/5531995395988?text=Ol%C3%A1!%20CZ1241");
  });

  it("tem um só endereço", () => {
    expect(empresa.endereco).toEqual(["Alameda Oscar Niemeyer, 288", "Vale do Sereno, Nova Lima - MG"]);
  });

  it("não restam vestígios das duas unidades no código", () => {
    const proibidos = [
      "Unidade Carneiro",
      "Unidade Ziller",
      "UNIDADE CARNEIRO",
      "UNIDADE ZILLER",
      "2 unidades",
      "zillerimoveis",
      "99981-0164",
      "36.697",
    ];
    for (const arquivo of arquivosFonte("src")) {
      const texto = readFileSync(arquivo, "utf8");
      for (const p of proibidos) expect(texto, `${arquivo} contém "${p}"`).not.toContain(p);
    }
  });
});
