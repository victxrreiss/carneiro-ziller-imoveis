import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { imoveis } from "../../src/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "../../src/lib/dados/testes";
import { montarRelatorio, paraCsv } from "./relatorio";

let amb: Ambiente;
let n = 0;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar();
  n = 0;
});

const novo = async (extra: Partial<typeof imoveis.$inferInsert> = {}) => {
  n++;
  const [i] = await amb.db
    .insert(imoveis)
    .values({
      id: `cz${2000 + n}`,
      codigo: `CZ${2000 + n}`,
      titulo: `Imóvel ${n}`,
      finalidade: "venda",
      tipo: "Apartamento",
      bairro: "Lourdes",
      cidade: "Belo Horizonte",
      area: 100 + n * 50,
      valor: 500_000 + n * 300_000,
      situacao: "publicado",
      responsavelId: amb.admin.id,
      alteradoPorId: amb.admin.id,
      ...extra,
    })
    .returning();
  return i;
};

describe("avisos", () => {
  test("imóvel sem área aparece com 'sem área'; completo não aparece", async () => {
    const sem = await novo({ area: null });
    await novo();
    const r = await montarRelatorio(amb.db);
    expect(r.problemas).toEqual([{ codigo: sem.codigo, titulo: sem.titulo, situacao: "publicado", problemas: ["sem área"] }]);
  });

  test("sem finalidade e sem valor", async () => {
    await novo({ finalidade: null, valor: null });
    const r = await montarRelatorio(amb.db);
    expect(r.problemas[0].problemas).toEqual(["sem finalidade", "sem valor"]);
  });

  test("descrição com rua e número é marcada; rua sem número não", async () => {
    const a = await novo({ descricao: "Ótimo imóvel na Rua Montes Claros, 395, com vista." });
    await novo({ descricao: "Fica na Rua dos Timbiras, no bairro Lourdes." });
    const r = await montarRelatorio(amb.db);
    expect(r.problemas.map((p) => p.codigo)).toEqual([a.codigo]);
    expect(r.problemas[0].problemas).toEqual(["descrição cita rua e número"]);
  });

  test("indisponíveis ficam de fora; rascunhos entram", async () => {
    await novo({ area: null, situacao: "indisponivel" });
    const rasc = await novo({ area: null, situacao: "rascunho" });
    const r = await montarRelatorio(amb.db);
    expect(r.problemas.map((p) => [p.codigo, p.situacao])).toEqual([[rasc.codigo, "rascunho"]]);
  });
});

describe("duplicados", () => {
  const emp = { empreendimento: "Edifício Aurora" };
  test("mesmo empreendimento e tipo, área e valor a até 2% formam um grupo", async () => {
    const a = await novo({ ...emp, area: 200, valor: 1_000_000 });
    const b = await novo({ ...emp, area: 202, valor: 1_010_000 });
    const r = await montarRelatorio(amb.db);
    expect(r.duplicados).toHaveLength(1);
    expect(r.duplicados[0].codigos).toEqual([a.codigo, b.codigo]);
    expect(r.duplicados[0].motivo).toContain("Edifício Aurora");
  });

  test("área 200 vs 210 não forma grupo", async () => {
    await novo({ ...emp, area: 200, valor: 1_000_000 });
    await novo({ ...emp, area: 210, valor: 1_000_000 });
    expect((await montarRelatorio(amb.db)).duplicados).toEqual([]);
  });

  test("sem empreendimento usa bairro e cidade; tipo diferente separa", async () => {
    const a = await novo({ area: 100, valor: 700_000 });
    const b = await novo({ area: 100, valor: 700_000 });
    await novo({ area: 100, valor: 700_000, tipo: "Casa" });
    await novo({ area: 100, valor: 700_000, bairro: "Savassi" });
    const r = await montarRelatorio(amb.db);
    expect(r.duplicados.map((d) => d.codigos)).toEqual([[a.codigo, b.codigo]]);
  });
});

describe("CSV", () => {
  test("tem BOM, separador ';', duas seções e nenhum endereço ou CEP", async () => {
    await novo({ area: null, endereco: "Rua Secreta Alfa", numero: "777", complemento: "apto 12", cep: "30000-000", descricao: "Rua Montes Claros, 395" });
    const csv = paraCsv(await montarRelatorio(amb.db));
    expect(csv.startsWith("﻿")).toBe(true);
    expect(csv).toContain("Avisos do cadastro");
    expect(csv).toContain("Prováveis duplicados");
    expect(csv).toContain("Código;Título;Situação;Avisos");
    expect(csv).toContain("sem área, descrição cita rua e número");
    for (const proibido of ["Rua Secreta Alfa", "777", "apto 12", "30000-000", "Montes Claros"]) expect(csv).not.toContain(proibido);
  });

  test("escapa ponto e vírgula e aspas", () => {
    const csv = paraCsv({ problemas: [{ codigo: "CZ1", titulo: 'A;B "C"', situacao: "publicado", problemas: ["sem área"] }], duplicados: [] });
    expect(csv).toContain('"A;B ""C"""');
  });
});
