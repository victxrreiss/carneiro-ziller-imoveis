import { eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test } from "vitest";
import { destaquesHome as tabDestaques, imoveis } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { destaquesHome } from "@/lib/imoveis/catalogo";
import { listarDestaques, marcarDestaque, moverDestaque } from "./destaques";
import { excluirImovel, obterParaEdicao, salvarImovel } from "./imoveis";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
  // A semente já marca o cz1009; estes testes partem de uma lista vazia.
  await amb.db.delete(tabDestaques);
});

const ids = async () => (await listarDestaques(amb.admin, amb.db)).itens.map((i) => i.id);
const marcar = async (...lista: string[]) => {
  for (const id of lista) expect(await marcarDestaque(amb.admin, id, true, amb.db)).toEqual({ ok: true });
};

describe("destaques da página inicial", () => {
  test("ADMIN marca três publicados e eles saem na ordem em que foram marcados", async () => {
    await marcar("cz1015", "cz1005", "cz1020");
    expect(await ids()).toEqual(["cz1015", "cz1005", "cz1020"]);
    expect((await destaquesHome(amb.db)).map((i) => i.id)).toEqual(["cz1015", "cz1005", "cz1020"]);
  });

  test("corretor não marca destaque", async () => {
    expect(await marcarDestaque(amb.mariana, "cz1009", true, amb.db)).toEqual({ ok: false, erro: "permissao" });
    expect(await moverDestaque(amb.mariana, "cz1009", "subir", amb.db)).toEqual({ ok: false, erro: "permissao" });
    expect(await ids()).toEqual([]);
  });

  test("rascunho não pode ser destaque", async () => {
    await amb.db.update(imoveis).set({ situacao: "rascunho" }).where(eq(imoveis.id, "cz1005"));
    expect(await marcarDestaque(amb.admin, "cz1005", true, amb.db)).toEqual({ ok: false, erro: "nao-publicado" });
    expect(await marcarDestaque(amb.admin, "cz9999", true, amb.db)).toEqual({ ok: false, erro: "inexistente" });
    expect(await ids()).toEqual([]);
  });

  test("mover sobe e desce trocando com o vizinho; nas pontas não faz nada", async () => {
    await marcar("cz1005", "cz1006", "cz1007");
    await moverDestaque(amb.admin, "cz1007", "subir", amb.db);
    expect(await ids()).toEqual(["cz1005", "cz1007", "cz1006"]);
    await moverDestaque(amb.admin, "cz1005", "descer", amb.db);
    expect(await ids()).toEqual(["cz1007", "cz1005", "cz1006"]);
    expect(await moverDestaque(amb.admin, "cz1007", "subir", amb.db)).toEqual({ ok: true });
    expect(await moverDestaque(amb.admin, "cz1006", "descer", amb.db)).toEqual({ ok: true });
    expect(await ids()).toEqual(["cz1007", "cz1005", "cz1006"]);
    expect(await moverDestaque(amb.admin, "cz1020", "subir", amb.db)).toEqual({ ok: false, erro: "inexistente" });
  });

  test("com 8 marcados, destaquesHome devolve os 6 primeiros e listarDestaques marca naHome só neles", async () => {
    const oito = ["cz1005", "cz1006", "cz1007", "cz1008", "cz1015", "cz1016", "cz1017", "cz1018"];
    await marcar(...oito);
    expect((await destaquesHome(amb.db)).map((i) => i.id)).toEqual(oito.slice(0, 6));
    const { itens } = await listarDestaques(amb.admin, amb.db);
    expect(itens.map((i) => i.naHome)).toEqual([true, true, true, true, true, true, false, false]);
    expect(itens[0]).toMatchObject({ id: "cz1005", codigo: "CZ1005" });
  });

  test("salvar o destaque como indisponível tira da lista e grava aviso com motivo \"indisponivel\" e porId do usuário", async () => {
    await marcar("cz1009", "cz1005");
    const entrada = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!.entrada;
    await amb.db.update(imoveis).set({ responsavelId: amb.mariana.id }).where(eq(imoveis.id, "cz1009"));
    const r = await salvarImovel(amb.mariana, "cz1009", { ...entrada, situacao: "indisponivel" }, "salvar", new Date(), amb.db);
    expect(r).toMatchObject({ ok: true, destaqueSaiu: true });
    expect(await ids()).toEqual(["cz1005"]);
    const { aviso } = await listarDestaques(amb.admin, amb.db);
    expect(aviso?.aviso).toMatchObject({ motivo: "indisponivel", porId: amb.mariana.id, codigo: "CZ1009" });
    expect(aviso?.porNome).toBe("Mariana Costa");
    expect(aviso?.foiVoce).toBe(false);
  });

  test("excluir o imóvel tira da lista e grava aviso \"excluido\"", async () => {
    await marcar("cz1005", "cz1006");
    expect(await excluirImovel(amb.admin, "cz1005", amb.db)).toMatchObject({ ok: true, destaqueSaiu: true });
    expect(await ids()).toEqual(["cz1006"]);
    const { aviso } = await listarDestaques(amb.admin, amb.db);
    expect(aviso?.aviso).toMatchObject({ motivo: "excluido", porId: amb.admin.id });
    expect(aviso?.foiVoce).toBe(true);
    // Excluir quem não era destaque não mexe no aviso.
    await excluirImovel(amb.admin, "cz1020", amb.db);
    expect((await listarDestaques(amb.admin, amb.db)).aviso?.aviso.codigo).toBe("CZ1005");
  });

  test("desmarcar grava aviso \"desmarcado\"; marcar outro limpa o aviso", async () => {
    await marcar("cz1005");
    await marcarDestaque(amb.admin, "cz1005", false, amb.db);
    expect(await ids()).toEqual([]);
    expect((await listarDestaques(amb.admin, amb.db)).aviso?.aviso).toMatchObject({ motivo: "desmarcado", codigo: "CZ1005" });
    await marcar("cz1006");
    expect((await listarDestaques(amb.admin, amb.db)).aviso).toBeNull();
  });

  test("imóvel que deixou de estar publicado fora do painel não aparece na lista nem na Home", async () => {
    await marcar("cz1005", "cz1006");
    await amb.db.update(imoveis).set({ situacao: "indisponivel" }).where(eq(imoveis.id, "cz1005"));
    expect(await ids()).toEqual(["cz1006"]);
    expect((await destaquesHome(amb.db)).map((i) => i.id)).toEqual(["cz1006"]);
  });

  test("salvar de novo um destaque que já está na lista não apaga o aviso de outro que saiu", async () => {
    await marcar("cz1005", "cz1009");
    await marcarDestaque(amb.admin, "cz1009", false, amb.db);
    const entrada = (await obterParaEdicao(amb.admin, "cz1005", amb.db))!.entrada;
    await salvarImovel(amb.admin, "cz1005", { ...entrada, destaque: true, titulo: "Novo título" }, "salvar", new Date(), amb.db);
    const { itens, aviso } = await listarDestaques(amb.admin, amb.db);
    expect(itens.map((i) => i.id)).toEqual(["cz1005"]);
    expect(aviso?.aviso).toMatchObject({ motivo: "desmarcado", codigo: "CZ1009" });
  });

  test("publicado mas incompleto não conta como naHome, igual à Home (o seguinte ocupa a vaga)", async () => {
    const sete = ["cz1005", "cz1006", "cz1007", "cz1008", "cz1015", "cz1016", "cz1017"];
    await marcar(...sete);
    await amb.db.update(imoveis).set({ area: null }).where(eq(imoveis.id, "cz1005"));
    const { itens } = await listarDestaques(amb.admin, amb.db);
    expect(itens.map((i) => i.naHome)).toEqual([false, true, true, true, true, true, true]);
    expect(itens.filter((i) => i.naHome).map((i) => i.id)).toEqual((await destaquesHome(amb.db)).map((i) => i.id));
  });
});
