import { mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, test } from "vitest";
import { juntarCrm, lerFichasCrm, mapearFichaCrm, numeroCrm, provaveisDuplicados, type FichaCrm } from "./crm";

/** Ficha inventada no formato lido da tela do CRM. */
const ficha = (ref: string, campos: Record<string, string>, fotos = [`https://cdn.exemplo.test/fotos/1/${ref}-a.jpg`]): FichaCrm => ({
  ref,
  campos: Object.fromEntries(Object.entries(campos).map(([k, v]) => [`imo.${k}`, v])),
  fotos,
});

const completo = {
  VER_WEB: "on",
  CODIGO_CT: "Apartamento",
  STATUS: "Venda",
  TITULO_WEB: "Apartamento de 4 quartos no Bairro Teste",
  DESCRICAO_PARA_WEB: "Apartamento amplo.\r\nLazer completo.",
  ENDERECO_TIPO: "Rua",
  ENDERECO: "das Flores",
  NUM_ENDERECO: "100",
  COMP_ENDERECO: "301",
  CEP: "30000-000",
  BAIRRO: "Bairro Teste",
  CIDADE: "Belo Horizonte",
  UF: "MG",
  DORMITORIO: "4",
  SUITE: "2",
  BANHEIRO_SOCIAL: "5",
  VAGAS: "3",
  ANDAR_APTO: "3",
  ANO_CONSTRUCAO: "2015",
  VLR_VENDA: "R$ 1.800.000,00",
  VLR_CONDOMINIO: "R$ 1.285,00",
  VLR_IPTU: "R$ 478,00",
  AREA_PRIVATIVA: "244,00",
  EMPREENDIMENTO: "Edifício Teste",
  PISCINA_COLETIVA: "on",
  PISCINA_AQUECIDA: "on",
  SALA_GINASTICA: "on",
  AREA_SERVICO: "on",
  LANCAMENTO: "on",
  DATA: "05/10/2026",
};

describe("numeroCrm", () => {
  test("lê moeda e decimais brasileiros; zero, vazio e texto viram null", () => {
    expect(numeroCrm("R$ 1.800.000,00")).toBe(1_800_000);
    expect(numeroCrm("1.043,91")).toBe(1043.91);
    expect(numeroCrm("244,00")).toBe(244);
    expect(numeroCrm("12")).toBe(12);
    expect(numeroCrm("R$ 0,00")).toBeNull();
    expect(numeroCrm("PLANO")).toBeNull();
    expect(numeroCrm(undefined)).toBeNull();
  });
});

describe("mapearFichaCrm", () => {
  test("ficha completa e exibida no site: publicado, com prefixo de origem e campos do painel", () => {
    const i = mapearFichaCrm(ficha("10220", completo), "ZL-");
    expect(i).toMatchObject({
      referencia: "ZL-10220",
      situacao: "publicado",
      finalidade: "venda",
      tipo: "Apartamento",
      titulo: "Apartamento de 4 quartos no Bairro Teste",
      descricao: "Apartamento amplo.\nLazer completo.",
      bairro: "Bairro Teste",
      cidade: "Belo Horizonte",
      uf: "MG",
      valor: 1_800_000,
      valorLocacao: null,
      area: 244,
      areaTotal: null,
      quartos: 4,
      suites: 2,
      banheiros: 5,
      vagas: 3,
      andar: 3,
      anoConstrucao: 2015,
      condominio: 1285,
      iptu: 478,
      empreendimento: "Edifício Teste",
      endereco: "Rua das Flores",
      numero: "100",
      complemento: "301",
      cep: "30000-000",
      lancamento: true,
      avisos: [],
    });
    // Um campo do CRM por item, na ordem da lista do site (imóvel, depois condomínio).
    expect(i.caracteristicas).toEqual(["area-de-servico", "academia", "piscina-coletiva", "piscina-aquecida"]);
    expect(i.fotos).toEqual(["https://cdn.exemplo.test/fotos/1/10220-a.jpg"]);
  });

  test("sem \"Exibir no site\": rascunho", () => {
    const { VER_WEB, ...semWeb } = completo;
    void VER_WEB;
    expect(mapearFichaCrm(ficha("1", semWeb), "ZL-").situacao).toBe("rascunho");
  });

  test("exibido no site, mas sem o que o painel exige para publicar: rascunho com aviso", () => {
    const i = mapearFichaCrm(ficha("EVOLUTION", { VER_WEB: "on", CODIGO_CT: "Empreendimento", STATUS: "Venda", BAIRRO: "Buritis", CIDADE: "Belo Horizonte", UF: "MG" }), "ZL-");
    expect(i.situacao).toBe("rascunho");
    expect(i.tipo).toBeNull();
    expect(i.avisos).toEqual(
      expect.arrayContaining(["Tipo sem mapa: Empreendimento", expect.stringMatching(/^Exibido no site do CRM, mas entra como rascunho: falta .*tipo.*valor.*área.*descrição/)]),
    );
  });

  test("terreno: a área é a do lote; casa: a total só entra quando maior que a privativa", () => {
    const terreno = mapearFichaCrm(ficha("PI1", { ...completo, CODIGO_CT: "Terreno em Condomínio", AREA_PRIVATIVA: "", AREA_TOTAL: "2.171,00", DIMENSOES_TERRENO: "PLANO" }), "ZL-");
    expect(terreno).toMatchObject({ tipo: "Terreno", area: 2171, areaTotal: null });
    const casa = mapearFichaCrm(ficha("2", { ...completo, CODIGO_CT: "Casa em Condomínio", AREA_PRIVATIVA: "450,00", DIMENSOES_TERRENO: "1204,00" }), "ZL-");
    expect(casa).toMatchObject({ tipo: "Casa em condomínio", area: 450, areaTotal: 1204 });
  });

  test("venda e aluguel: valor de venda e de locação", () => {
    const i = mapearFichaCrm(ficha("3", { ...completo, STATUS: "Venda e Aluguel", VLR_ALUGUEL: "R$ 9.000,00" }), "ZL-");
    expect(i).toMatchObject({ finalidade: "venda", valor: 1_800_000, valorLocacao: 9000 });
  });

  test("andar que é o número da unidade fica vazio, com aviso; título ausente é gerado", () => {
    const { TITULO_WEB, ...semTitulo } = completo;
    void TITULO_WEB;
    const i = mapearFichaCrm(ficha("4", { ...semTitulo, ANDAR_APTO: "502" }), "ZL-");
    expect(i.andar).toBeNull();
    expect(i.titulo).toBe("Apartamento à venda no Bairro Teste, Belo Horizonte");
    expect(i.avisos).toEqual(expect.arrayContaining([expect.stringMatching(/Andar "502"/), "Título ausente, gerado"]));
  });

  test("descrição que cita rua e número gera aviso", () => {
    const i = mapearFichaCrm(ficha("5", { ...completo, DESCRICAO_PARA_WEB: "Fica na Rua das Flores, 100." }), "ZL-");
    expect(i.avisos).toContain("Descrição cita o endereço (rua e número)");
  });
});

describe("juntarCrm e lerFichasCrm", () => {
  test("lê a pasta, ignora referência repetida e vazia", async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), "cz-crm-"));
    await writeFile(path.join(pasta, "a.json"), JSON.stringify(ficha("10", completo)));
    await writeFile(path.join(pasta, "b.json"), JSON.stringify(ficha("10", { ...completo, BAIRRO: "Outro" })));
    await writeFile(path.join(pasta, "c.json"), JSON.stringify(ficha(" ", completo)));
    await writeFile(path.join(pasta, "leia-me.txt"), "não é ficha");
    const lista = juntarCrm(await lerFichasCrm(pasta), "ZL-");
    expect(lista.map((i) => [i.referencia, i.bairro])).toEqual([["ZL-10", "Bairro Teste"]]);
  });

  test("ficha sem o formato esperado é recusada", async () => {
    const pasta = await mkdtemp(path.join(tmpdir(), "cz-crm-"));
    await writeFile(path.join(pasta, "x.json"), JSON.stringify({ ref: "1" }));
    await expect(lerFichasCrm(pasta)).rejects.toThrow("Ficha inválida: x.json");
  });
});

describe("provaveisDuplicados", () => {
  const i = mapearFichaCrm(ficha("10220", completo), "ZL-");
  const base = { referenciaLoft: "442", endereco: null, numero: null, complemento: null, empreendimento: null, area: null };

  test("mesmo endereço e complemento (sem o tipo de logradouro e acentos), ou mesmo empreendimento e área", () => {
    const r = provaveisDuplicados(
      [i],
      [
        { ...base, codigo: "CZ1011", endereco: "R. das Flôres", numero: "100", complemento: "301" },
        { ...base, codigo: "CZ1012", empreendimento: "edificio teste", area: 244.6 },
        { ...base, codigo: "CZ1013", endereco: "Rua das Flores", numero: "100", complemento: "302" },
        { ...base, codigo: "CZ1014", empreendimento: "Edifício Teste", area: 300 },
      ],
      "ZL-",
    );
    expect(r).toEqual([
      { referencia: "ZL-10220", codigo: "CZ1011", motivo: "mesmo endereço e complemento" },
      { referencia: "ZL-10220", codigo: "CZ1012", motivo: "mesmo empreendimento e área" },
    ]);
  });

  test("não compara com os imóveis que já vieram desta origem", () => {
    expect(provaveisDuplicados([i], [{ ...base, codigo: "CZ2000", referenciaLoft: "ZL-10220", empreendimento: "Edifício Teste", area: 244 }], "ZL-")).toEqual([]);
  });
});
