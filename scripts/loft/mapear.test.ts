import { readFileSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "vitest";
import { juntar, mapearTipo } from "./mapear";
import { lerPlanilha } from "./planilha";
import { lerVrsync } from "./vrsync";

const ler = (n: string) => readFileSync(join(process.cwd(), "scripts/loft/fixtures", n), "utf8");
const feed = lerVrsync(ler("feed.xml"));
const ativos = lerPlanilha(ler("ativos.csv"));
const pendentes = lerPlanilha(ler("pendentes.csv"));
const pendentesRefs = ["907", "908"];
const FORA_DO_SITE = "906";

const todos = () => juntar(feed, ativos, pendentes);
const item = (ref: string) => todos().find((i) => i.referencia === ref)!;

test("tipos pela categoria da Loft, com o VRSync de reserva", () => {
  expect(mapearTipo("Apartamento Duplex", undefined)).toBe("Apartamento");
  expect(mapearTipo("Casa em Condomínio", undefined)).toBe("Casa em condomínio");
  expect(mapearTipo("Área", undefined)).toBe("Terreno");
  expect(mapearTipo("Salas/Conjuntos", undefined)).toBe("Sala / Laje corporativa");
  expect(mapearTipo("Sala Comercial", undefined)).toBe("Sala / Laje corporativa");
  expect(mapearTipo("Loft", undefined)).toBe("Loft");
  expect(mapearTipo("Studio", undefined)).toBe("Studio");
  expect(mapearTipo(undefined, "Residential / Penthouse")).toBe("Cobertura");
  expect(mapearTipo(undefined, "Residential / Land Lot")).toBe("Terreno");
  expect(mapearTipo("", "Commercial / Building")).toBe("Prédio comercial");
  expect(mapearTipo("Desconhecida", undefined)).toBeNull();
  expect(mapearTipo(undefined, undefined)).toBeNull();
});

test("situação por origem", () => {
  const l = todos();
  expect(l).toHaveLength(8);
  expect(l.filter((i) => i.situacao === "publicado")).toHaveLength(5);
  expect(item(FORA_DO_SITE).situacao).toBe("rascunho");
  expect(l.filter((i) => pendentesRefs.includes(i.referencia)).every((i) => i.situacao === "rascunho")).toBe(true);
});

test("a planilha decide a situação de quem também está no feed", () => {
  const l = juntar(feed, ativos, [{ ...pendentes[0], referencia: "901" }]);
  expect(l.find((i) => i.referencia === "901")!.situacao).toBe("rascunho");
  expect(l.filter((i) => i.referencia === "901")).toHaveLength(1);
});

test("categoria da planilha manda no tipo, o VRSync é reserva", () => {
  expect(item("905").tipo).toBe("Casa em condomínio");
  expect(item("903").tipo).toBe("Cobertura");
  expect(juntar(feed, [], []).find((i) => i.referencia === "903")!.tipo).toBe("Cobertura");
});

test("área do lote vem da LotArea; areaTotal só quando maior que a privativa", () => {
  expect(item("902")).toMatchObject({ area: 633, areaTotal: null });
  expect(item("905")).toMatchObject({ area: 500, areaTotal: 5000 });
  expect(item("901")).toMatchObject({ area: 56, areaTotal: null });
});

test("venda-locação: finalidade venda, valor de venda e valorLocacao", () => {
  expect(item("903")).toMatchObject({ finalidade: "venda", valor: 3_200_000, valorLocacao: 15_000 });
  expect(item("901")).toMatchObject({ finalidade: "venda", valor: 990_000, valorLocacao: null });
});

test("campos do feed chegam à ficha", () => {
  expect(item("901")).toMatchObject({
    quartos: 2, suites: 1, banheiros: null, vagas: 1, andar: 7, anoConstrucao: 2015, condominio: 1250, iptu: 5500,
    bairro: "Bairro Exemplo", cidade: "Cidade Exemplo", uf: "MG", endereco: "Rua Exemplo", numero: "100", complemento: "101", cep: "34000-000",
    empreendimento: "Edifício Exemplo; Torre A",
  });
  expect(item("901").fotos[0]).toBe("https://cdn.exemplo.test/fotos/901/1.jpg");
  expect(item("902")).toMatchObject({ complemento: null, empreendimento: null });
});

test("título ausente é gerado; features mapeadas, 'Number of stories' ignorada, 'Rooftop' vira aviso", () => {
  expect(item("904").titulo).toBe("Apartamento à venda no Bairro Exemplo, Cidade Exemplo");
  expect(item("904").avisos).toContain("Título ausente, gerado");
  const a = item("901");
  expect(a.caracteristicas).toEqual(["academia", "piscina"]);
  expect(a.avisos).toContain("Característica desconhecida: Rooftop");
  expect(a.avisos.some((x) => x.includes("Number of stories"))).toBe(false);
});

test("título cortado por palavra em 90", () => {
  const longo = "Apartamento espetacular com vista para as montanhas e acabamento de altíssimo padrão no melhor bairro";
  const l = juntar([{ ...feed[0], titulo: longo }], [], []);
  expect(l[0].titulo.length).toBeLessThanOrEqual(90);
  expect(l[0].titulo).toBe("Apartamento espetacular com vista para as montanhas e acabamento de altíssimo padrão no");
  expect(longo.startsWith(l[0].titulo)).toBe(true);
});

test("descrição que cita rua e número gera aviso, mas continua publicado", () => {
  const i = item("905");
  expect(i.situacao).toBe("publicado");
  expect(i.avisos).toContain("Descrição cita o endereço (rua e número)");
  expect(item("901").avisos.some((x) => x.includes("endereço"))).toBe(false);
});

test("só na planilha: sem fotos, sem descrição, cidade vazia; empreendimento e endereço vêm da planilha", () => {
  const l = item("908");
  expect(l).toMatchObject({
    situacao: "rascunho", tipo: "Loft", finalidade: "locacao", valor: 4500, valorLocacao: null, quartos: 1,
    bairro: "Bairro Exemplo", cidade: "", uf: "", descricao: "", area: null, fotos: [], empreendimento: "Loft Exemplo",
    endereco: "Rua Exemplo Oito", numero: "800", complemento: null, cep: null,
  });
  const f = item(FORA_DO_SITE);
  expect(f).toMatchObject({ tipo: "Apartamento", finalidade: "venda", valor: 2_500_000, quartos: 4, fotos: [], endereco: "Avenida dos ExemplÃ£o" });
  expect(item("907")).toMatchObject({ tipo: "Terreno", complemento: "000" });
});

test("sem área: aviso, mas a situação não muda", () => {
  const l = juntar([{ ...feed[1], areaUtil: null, areaTerreno: null }], [], []);
  expect(l[0].area).toBeNull();
  expect(l[0].situacao).toBe("publicado");
  expect(l[0].avisos).toContain("Sem área: não aparece no site até ser preenchida.");
  expect(item("901").avisos.some((x) => x.startsWith("Sem área"))).toBe(false);
  expect(item("908").avisos).toContain("Sem área: não aparece no site até ser preenchida.");
});

test("só na planilha sem valores: aviso de finalidade", () => {
  const l = juntar([], [], [{ ...pendentes[0], valorVenda: null, valorAluguel: null }]);
  expect(l[0].finalidade).toBeNull();
  expect(l[0].avisos).toContain("Sem finalidade: sem valor de venda nem de aluguel.");
  expect(item("908").avisos.some((x) => x.startsWith("Sem finalidade"))).toBe(false);
});

test("venda-locação sem preço de venda vira locação", () => {
  const l = juntar([{ ...feed[2], precoVenda: null }], [], []);
  expect(l[0]).toMatchObject({ finalidade: "locacao", valor: 15_000, valorLocacao: null });
});

test("cita rua e número em formas variadas", () => {
  const com = (d: string) => juntar([{ ...feed[0], descricao: d }], [], [])[0].avisos.includes("Descrição cita o endereço (rua e número)");
  expect(com("Fica na Rua Exemplo, número 100, perto de tudo")).toBe(true);
  expect(com("Fica na Rua Exemplo nº 100")).toBe(true);
  expect(com("Fica na Rua Exemplo, 1000")).toBe(false);
  expect(com("Fica na Rua Exemplo, perto de tudo")).toBe(false);
});
