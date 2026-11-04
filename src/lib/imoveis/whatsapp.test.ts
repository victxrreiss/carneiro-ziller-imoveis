import { describe, expect, it } from "vitest";
import { linkWhatsApp } from "@/lib/site";
import { mensagemWhatsAppImovel } from "./whatsapp";

const url = "https://carneiroziller.com.br/imovel/cz1241";
const imovel = { codigo: "cz1241", titulo: "Luxuoso apartamento à venda em Nova Lima" };

describe("mensagemWhatsAppImovel", () => {
  it("monta a mensagem com código em maiúsculas, título e URL", () => {
    expect(mensagemWhatsAppImovel(imovel, url)).toBe(
      "Olá! Tenho interesse no imóvel CZ1241 — Luxuoso apartamento à venda em Nova Lima. https://carneiroziller.com.br/imovel/cz1241",
    );
  });

  it("gera um link wa.me codificado", () => {
    expect(linkWhatsApp(mensagemWhatsAppImovel(imovel, url))).toMatch(
      /^https:\/\/wa\.me\/5531995395988\?text=Ol%C3%A1!%20Tenho%20interesse%20no%20im%C3%B3vel%20CZ1241/,
    );
  });
});
