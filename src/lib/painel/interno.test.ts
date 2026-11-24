// Captação e proprietário: só o ADMIN e o responsável veem e editam, e nada disso chega ao site.
import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { imovelInterno, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { buscarImoveis, destaquesHome, obterImovel } from "@/lib/imoveis/catalogo";
import { obterParaEdicao, salvarImovel } from "./imoveis";
import { validarInterno, type EntradaImovel, type EntradaInterno } from "./regras";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
  // cz1009 é da Mariana; o Ricardo é outro corretor.
  await amb.db.update(imoveis).set({ responsavelId: amb.mariana.id }).where(eq(imoveis.id, "cz1009"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const PROPRIETARIO: EntradaInterno = {
  captadorId: "",
  captadorNome: "Parceiro Fictício",
  proprietarioNome: "Proprietária de Teste",
  proprietarioTelefone: "(31) 90000-0000",
  proprietarioEmail: "proprietaria@exemplo.test",
  proprietarioObs: "Chaves na portaria.",
};

/** A entrada atual do imóvel (como a tela manda num "Salvar" sem mexer), com `interno` trocado. */
async function entradaCom(id: string, interno: EntradaInterno | undefined): Promise<EntradaImovel> {
  const e = (await obterParaEdicao(amb.admin, id, amb.db))!.entrada;
  return { ...e, interno };
}

const linha = async (id: string) => (await amb.db.select().from(imovelInterno).where(eq(imovelInterno.imovelId, id)))[0];

describe("dados internos do imóvel (captação e proprietário)", () => {
  test("o responsável grava; ele e o ADMIN veem; outro corretor não vê nem recebe os dados", async () => {
    const r = await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    expect(r.ok).toBe(true);

    const daMariana = await obterParaEdicao(amb.mariana, "cz1009", amb.db);
    expect(daMariana!.interno).toEqual(PROPRIETARIO);
    expect(daMariana!.entrada.interno).toEqual(PROPRIETARIO);
    expect((await obterParaEdicao(amb.admin, "cz1009", amb.db))!.interno).toEqual(PROPRIETARIO);

    const doRicardo = await obterParaEdicao(amb.ricardo, "cz1009", amb.db);
    expect(doRicardo!.interno).toBeNull();
    expect(doRicardo!.entrada.interno).toBeUndefined();
    expect(JSON.stringify(doRicardo)).not.toContain("Proprietária de Teste");
  });

  test("outro corretor salva o imóvel: o que mandar em `interno` é ignorado e o gravado fica", async () => {
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    const tentativa = { ...PROPRIETARIO, proprietarioNome: "Outro Nome", proprietarioTelefone: "" };
    const r = await salvarImovel(amb.ricardo, "cz1009", await entradaCom("cz1009", tentativa), "salvar", new Date(), amb.db);
    expect(r.ok).toBe(true);
    expect(await linha("cz1009")).toMatchObject({ proprietarioNome: "Proprietária de Teste", proprietarioTelefone: "(31) 90000-0000" });
  });

  test("sem `interno` na entrada, nada muda (nem para o responsável)", async () => {
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", undefined), "salvar", new Date(), amb.db);
    expect(await linha("cz1009")).toMatchObject({ proprietarioNome: "Proprietária de Teste" });
  });

  test("o ADMIN troca o responsável: o novo passa a ver, o antigo deixa de ver", async () => {
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    const e = { ...(await entradaCom("cz1009", undefined)), responsavelId: amb.ricardo.id };
    expect((await salvarImovel(amb.admin, "cz1009", e, "salvar", new Date(), amb.db)).ok).toBe(true);
    expect((await obterParaEdicao(amb.ricardo, "cz1009", amb.db))!.interno).toEqual(PROPRIETARIO);
    expect((await obterParaEdicao(amb.mariana, "cz1009", amb.db))!.interno).toBeNull();
  });

  test("captador do painel: o nome livre não vale; usuário que não existe é erro", async () => {
    const comUsuario = { ...PROPRIETARIO, captadorId: amb.ricardo.id };
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", comUsuario), "salvar", new Date(), amb.db);
    expect(await linha("cz1009")).toMatchObject({ captadorId: amb.ricardo.id, captadorNome: null });

    const inexistente = { ...PROPRIETARIO, captadorId: "00000000-0000-4000-8000-000000000000" };
    const r = await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", inexistente), "salvar", new Date(), amb.db);
    expect(r).toEqual({ ok: false, erros: { captador: "Escolha quem captou na lista." } });
  });

  test("cadastro novo: quem cria grava a captação junto", async () => {
    const e: EntradaImovel = {
      ...(await entradaCom("cz1009", undefined)),
      fotos: [],
      situacao: "rascunho",
      interno: { ...PROPRIETARIO, captadorId: amb.mariana.id, captadorNome: "" },
    };
    const r = await salvarImovel(amb.mariana, null, e, "rascunho", new Date(), amb.db);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(await linha(r.id)).toMatchObject({ captadorId: amb.mariana.id, proprietarioEmail: "proprietaria@exemplo.test", alteradoPorId: amb.mariana.id });
  });

  test("nada da captação nem do proprietário chega ao site", async () => {
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    const publico = JSON.stringify([
      await obterImovel("cz1009", amb.db),
      await buscarImoveis({ pagina: 1 }, amb.db),
      await destaquesHome(amb.db),
    ]);
    for (const v of [PROPRIETARIO.captadorNome, PROPRIETARIO.proprietarioNome, PROPRIETARIO.proprietarioTelefone, PROPRIETARIO.proprietarioEmail, PROPRIETARIO.proprietarioObs]) {
      expect(publico).not.toContain(v);
    }
  });

  test("excluir o imóvel apaga os dados internos junto", async () => {
    await salvarImovel(amb.mariana, "cz1009", await entradaCom("cz1009", PROPRIETARIO), "salvar", new Date(), amb.db);
    await amb.db.delete(imoveis).where(eq(imoveis.id, "cz1009"));
    expect(await linha("cz1009")).toBeUndefined();
  });
});

describe("validarInterno", () => {
  const vazio: EntradaInterno = { captadorId: "", captadorNome: "", proprietarioNome: "", proprietarioTelefone: "", proprietarioEmail: "", proprietarioObs: "" };

  test("tudo opcional: vazio vira null", () => {
    expect(validarInterno(vazio)).toEqual({
      erros: {},
      dados: { captadorId: null, captadorNome: null, proprietarioNome: null, proprietarioTelefone: null, proprietarioEmail: null, proprietarioObs: null },
    });
  });

  test("telefone, e-mail, tamanhos e captador inválidos", () => {
    const { erros } = validarInterno({
      ...vazio,
      captadorId: "nao-e-uuid",
      proprietarioNome: "x".repeat(121),
      proprietarioTelefone: "abc",
      proprietarioEmail: "sem-arroba",
      proprietarioObs: "x".repeat(2001),
    });
    expect(erros).toEqual({
      captador: "Escolha quem captou na lista.",
      proprietarioNome: "Use até 120 caracteres.",
      proprietarioTelefone: "Telefone inválido. Use DDD e número.",
      proprietarioEmail: "E-mail inválido.",
      proprietarioObs: "Use até 2000 caracteres.",
    });
  });

  test("normaliza: espaços, e-mail em minúsculas", () => {
    const { dados } = validarInterno({ ...vazio, proprietarioNome: "  Maria   Silva ", proprietarioEmail: " Maria@Exemplo.TEST " });
    expect(dados).toMatchObject({ proprietarioNome: "Maria Silva", proprietarioEmail: "maria@exemplo.test" });
  });
});
