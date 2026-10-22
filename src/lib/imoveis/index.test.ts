import { beforeEach, describe, expect, test } from "vitest";
import { banco, reiniciarBanco } from "@/lib/dados/banco";
import { lancamentosHome, locacaoHome, oportunidadeDeHoje, regioesHome, vendaHome } from "./catalogo";

beforeEach(() => {
  reiniciarBanco();
});

describe("Home: Oportunidade de hoje (escolha do ADMIN)", () => {
  test("é o CZ1009 na semente", () => {
    const d = oportunidadeDeHoje();
    expect(d?.codigo).toBe("CZ1009");
    expect(d?.valor).toBe("R$ 7.890.000");
    expect(d?.quartos).toBe("4");
  });

  test("some quando não há imóvel escolhido ou ele não está publicado", () => {
    banco().imoveis.get("cz1009")!.situacao = "indisponivel";
    expect(oportunidadeDeHoje()).toBeNull();
    banco().imoveis.get("cz1009")!.situacao = "publicado";
    banco().oportunidadeId = null;
    expect(oportunidadeDeHoje()).toBeNull();
  });

  test("terreno não mostra quartos nem vagas", () => {
    banco().oportunidadeId = "cz1026";
    const d = oportunidadeDeHoje();
    expect(d?.quartos).toBeUndefined();
    expect(d?.vagas).toBeUndefined();
  });
});

describe("Home: seções automáticas", () => {
  test("lançamentos: os 4 publicados mais recentes com a marcação", () => {
    const items = lancamentosHome();
    expect(items.map((i) => i.id)).toEqual(["cz1001", "cz1002", "cz1003", "cz1004"]);
    expect(items.every((i) => i.badge === "LANÇAMENTO")).toBe(true);
  });

  test("venda: os 4 mais recentes, sem lançamentos e sem a Oportunidade de hoje", () => {
    const items = vendaHome();
    expect(items.map((i) => i.id)).toEqual(["cz1005", "cz1006", "cz1007", "cz1008"]);
    expect(items.every((i) => i.badge === "VENDA")).toBe(true);
    banco().oportunidadeId = "cz1005";
    expect(vendaHome().map((i) => i.id)).toEqual(["cz1006", "cz1007", "cz1008", "cz1009"]);
  });

  test("locação: os 4 mais recentes", () => {
    const items = locacaoHome();
    expect(items.map((i) => i.id)).toEqual(["cz1010", "cz1011", "cz1012", "cz1013"]);
    expect(items.every((i) => i.badge === "LOCAÇÃO" && i.price.endsWith("/mês"))).toBe(true);
  });

  test("a data da primeira publicação ordena, não a última edição", () => {
    const r = banco().imoveis.get("cz1018")!;
    r.alteradoEm = new Date().toISOString();
    expect(lancamentosHome().map((i) => i.id)).not.toContain("cz1018");
    r.publicadoEm = new Date().toISOString();
    expect(lancamentosHome()[0].id).toBe("cz1018");
  });

  test("regiões trazem as 4 da Home", () => {
    expect(regioesHome().map((r) => r.nome)).toEqual(["Belvedere", "Vila da Serra", "Lagoa dos Ingleses", "Savassi e Lourdes"]);
  });

  test("toda imagem é servida de /images/", () => {
    const all = [...lancamentosHome(), ...vendaHome(), ...locacaoHome(), ...regioesHome(), oportunidadeDeHoje()!];
    expect(all.every((i) => i.img.startsWith("/images/"))).toBe(true);
  });
});
