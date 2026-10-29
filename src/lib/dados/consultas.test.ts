import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { imoveis } from "./esquema";
import { carregarImovel } from "./consultas";
import { criarAmbiente, type Ambiente } from "./testes";

describe("carregarImovel: ficha ampliada", () => {
  let amb: Ambiente;
  beforeAll(async () => {
    amb = await criarAmbiente();
  });
  beforeEach(async () => {
    await amb.reiniciar();
  });

  const base = () => ({ responsavelId: amb.admin.id, alteradoPorId: amb.admin.id });

  test("devolve os campos novos como gravados", async () => {
    await amb.db.insert(imoveis).values({
      ...base(),
      id: "cz2001",
      codigo: "CZ2001",
      banheiros: 3,
      suites: 2,
      areaTotal: 250,
      condominio: 1800,
      iptu: 6400,
      valorLocacao: 9500,
      caracteristicas: ["piscina", "academia"],
      andar: 7,
      anoConstrucao: 2015,
      empreendimento: "Edifício Aurora",
      endereco: "Rua das Flores",
      numero: "123",
      complemento: "Apto 701",
      cep: "30140-000",
      referenciaLoft: "LOFT-1",
    });
    const r = await carregarImovel(amb.db, "cz2001");
    expect(r).toMatchObject({
      banheiros: 3,
      suites: 2,
      areaTotal: 250,
      condominio: 1800,
      iptu: 6400,
      valorLocacao: 9500,
      caracteristicas: ["piscina", "academia"],
      andar: 7,
      anoConstrucao: 2015,
      empreendimento: "Edifício Aurora",
      endereco: "Rua das Flores",
      numero: "123",
      complemento: "Apto 701",
      cep: "30140-000",
      referenciaLoft: "LOFT-1",
    });
  });

  test("sem os campos novos, devolve null e lista vazia", async () => {
    await amb.db.insert(imoveis).values({ ...base(), id: "cz2002", codigo: "CZ2002" });
    const r = await carregarImovel(amb.db, "cz2002");
    expect(r).toMatchObject({
      banheiros: null,
      suites: null,
      areaTotal: null,
      condominio: null,
      iptu: null,
      valorLocacao: null,
      caracteristicas: [],
      andar: null,
      anoConstrucao: null,
      empreendimento: null,
      endereco: null,
      numero: null,
      complemento: null,
      cep: null,
      referenciaLoft: null,
    });
  });
});
