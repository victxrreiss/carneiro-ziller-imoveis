import { count, eq } from "drizzle-orm";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { armazenamento, type armazenamentoMemoria } from "../../src/lib/armazenamento";
import { configuracaoSite, fotos, imovelFotos, imoveis, importacaoLoft } from "../../src/lib/dados/esquema";
import { carregarImovel } from "../../src/lib/dados/consultas";
import { criarAmbiente, type Ambiente } from "../../src/lib/dados/testes";
import { excluirImovel, obterParaEdicao, salvarImovel } from "../../src/lib/painel/imoveis";
import type { UsuarioLogado } from "../../src/lib/painel/regras";
import { importarImoveis } from "../importar-imoveis";
import { EXEMPLOS } from "../semente-imoveis";
import { importarLoft } from "./importar";
import { juntar, type ImovelLoft } from "./mapear";
import { lerPlanilha } from "./planilha";
import { lerVrsync } from "./vrsync";

const ler = (n: string) => readFileSync(join(process.cwd(), "scripts/loft/fixtures", n), "utf8");
const feedXml = lerVrsync(ler("feed.xml"));
const ativos = lerPlanilha(ler("ativos.csv"));
const pendentes = lerPlanilha(ler("pendentes.csv"));
/** Lista nova a cada chamada (os testes alteram cópias). */
const lista = (): ImovelLoft[] => structuredClone(juntar(feedXml, ativos, pendentes));
const mudar = (l: ImovelLoft[], ref: string, f: (i: ImovelLoft) => void) => {
  f(l.find((i) => i.referencia === ref)!);
  return l;
};

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0, 1, 1, 0, 0, 1, 0, 1]);
const PDF = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34, 0, 0, 0, 0, 0, 0, 0, 0]);

let amb: Ambiente;
let baixadas: string[];
/** URLs com "falha" lançam erro, a não ser que estejam aqui. */
let liberadas: Set<string>;
const AGORA = new Date("2026-10-29T12:00:00Z");

beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: false });
  baixadas = [];
  liberadas = new Set();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const opcoes = (extra: { agora?: Date } = {}) => ({
  responsavelId: amb.mariana.id,
  armazenamento: armazenamento(),
  agora: extra.agora ?? AGORA,
  baixar: async (url: string) => {
    if (url.includes("falha") && !liberadas.has(url)) throw new Error("HTTP 404");
    baixadas.push(url);
    if (url.includes("pdf")) return { bytes: PDF, tipo: "image/jpeg" };
    return { bytes: JPG, tipo: "image/jpeg" };
  },
  dimensoes: async () => ({ largura: 1600, altura: 1200 }),
});

const memoria = () => armazenamento() as ReturnType<typeof armazenamentoMemoria>;
const chaveLoft = (ref: string, url: string) => `fotos/loft-${createHash("sha1").update(ref + url).digest("hex")}.jpg`;
const contar = async (t: typeof imoveis | typeof fotos | typeof imovelFotos | typeof importacaoLoft) => (await amb.db.select({ n: count() }).from(t))[0].n;
const porRef = async (ref: string) => (await amb.db.select().from(imoveis).where(eq(imoveis.referenciaLoft, ref)))[0];
const chavesDe = async (imovelId: string) =>
  (
    await amb.db
      .select({ chave: fotos.chave })
      .from(imovelFotos)
      .innerJoin(fotos, eq(fotos.id, imovelFotos.fotoId))
      .where(eq(imovelFotos.imovelId, imovelId))
      .orderBy(imovelFotos.ordem)
  ).map((f) => f.chave);
const oportunidade = async () => (await amb.db.select().from(configuracaoSite))[0]?.oportunidadeId ?? null;

/** Salva pelo painel, como a tela faria: a entrada atual com as mudanças. */
async function salvarNoPainel(u: UsuarioLogado, id: string, f: (e: NonNullable<Awaited<ReturnType<typeof obterParaEdicao>>>["entrada"]) => void) {
  const ed = await obterParaEdicao(u, id, amb.db);
  const e = ed!.entrada;
  f(e);
  const r = await salvarImovel(u, id, e, "salvar", new Date(), amb.db);
  if (!r.ok) throw new Error(`salvar falhou: ${JSON.stringify(r)}`);
}

async function criarExemplos() {
  await importarImoveis(amb.db, { responsavelId: amb.admin.id, armazenamento: armazenamento(), ids: EXEMPLOS, lerArquivo: async () => JPG });
}

describe("importarLoft", () => {
  test("primeira rodada: cria, define situação, responsável, fotos e Oportunidade, e remove os exemplos", async () => {
    await criarExemplos();
    const chavesExemplos = (await amb.db.select({ chave: fotos.chave }).from(fotos)).map((f) => f.chave);
    expect(chavesExemplos.length).toBeGreaterThan(0);
    const l = lista();

    const r = await importarLoft(amb.db, l, opcoes());

    expect(r.criados).toHaveLength(8);
    expect(r.exemplosRemovidos.sort()).toEqual(["cz1001", "cz1009", "cz1010"]);
    for (const id of EXEMPLOS) expect(await carregarImovel(amb.db, id)).toBeNull();
    for (const k of chavesExemplos) expect(memoria().objetos.has(k)).toBe(false);
    expect(await contar(imoveis)).toBe(8);

    const todos = await amb.db.select().from(imoveis);
    expect(todos.every((i) => i.responsavelId === amb.mariana.id && i.referenciaLoft && /^cz1\d{3}$/.test(i.id) && !i.lancamento)).toBe(true);
    expect(todos.map((i) => i.id).sort()[0]).toBe("cz1011");
    const publicados = todos.filter((i) => i.situacao === "publicado");
    expect(publicados).toHaveLength(5);
    expect(publicados.every((i) => i.publicadoEm?.getTime() === AGORA.getTime())).toBe(true);
    expect(todos.filter((i) => i.situacao !== "publicado").every((i) => i.publicadoEm === null)).toBe(true);

    for (const i of l.filter((x) => x.situacao === "publicado")) {
      const db = await porRef(i.referencia);
      expect(await chavesDe(db.id)).toEqual(i.fotos.map((u) => chaveLoft(i.referencia, u)));
      for (const u of i.fotos) expect(memoria().objetos.has(chaveLoft(i.referencia, u))).toBe(true);
    }
    const f901 = (await carregarImovel(amb.db, (await porRef("901")).id))!;
    expect(f901.fotos[0].alt).toBe("Apartamento no Bairro Exemplo — foto 1 de 3");
    expect(f901.fotos[0]).toMatchObject({ largura: 1600, altura: 1200 });
    expect(r.fotosBaixadas).toBe(9);
    expect(r.fotosFalhas).toEqual([]);

    // O publicado de maior valor, à venda e com foto: 905 (R$ 4,3 mi).
    const op = (await porRef("905")).id;
    expect(r.oportunidade).toBe(op);
    expect(await oportunidade()).toBe(op);
    expect(r.avisos).toContainEqual({ referencia: "904", aviso: "Título ausente, gerado" });

    const [ctl] = await amb.db.select().from(importacaoLoft).where(eq(importacaoLoft.referencia, "901"));
    expect(ctl.imovelId).toBe((await porRef("901")).id);
    expect(ctl.fotosOrigem).toEqual(l.find((i) => i.referencia === "901")!.fotos);
    expect(ctl.fotoIds).toHaveLength(3);
    expect(Object.keys(ctl.valores).sort()).not.toContain("referencia");
    expect(ctl.valores).not.toHaveProperty("fotos");
    expect(ctl.valores).not.toHaveProperty("avisos");
    expect(ctl.valores).toMatchObject({ titulo: f901.titulo, valor: 990_000, situacao: "publicado", caracteristicas: ["piscina", "academia"] });
    // Mesma forma que o painel grava (a ordem das características é a de CARACTERISTICAS).
    expect((await porRef("901")).caracteristicas).toEqual(ctl.valores.caracteristicas);
  });

  test("imóvel criado à mão com o código de um exemplo não é removido", async () => {
    const r0 = await salvarImovel(amb.admin, null, {
      finalidade: "venda", lancamento: false, tipo: "Casa", titulo: "Casa da equipe", bairro: "Sion", cidade: "Belo Horizonte", uf: "MG",
      valor: "100", area: "10", quartos: "", vagas: "", descricao: "x", fotos: [], situacao: "rascunho",
      banheiros: "", suites: "", areaTotal: "", condominio: "", iptu: "", valorLocacao: "", andar: "", anoConstrucao: "",
      empreendimento: "", endereco: "", numero: "", complemento: "", cep: "", caracteristicas: [],
    }, "rascunho", new Date(), amb.db);
    expect(r0.ok && r0.id).toBe("cz1001");
    const r = await importarLoft(amb.db, lista(), opcoes());
    expect(r.exemplosRemovidos).toEqual([]);
    expect(await carregarImovel(amb.db, "cz1001")).not.toBeNull();
    expect(await contar(imoveis)).toBe(9);
  });

  test("rodar de novo sem mudanças não cria nem baixa nada", async () => {
    await criarExemplos();
    await importarLoft(amb.db, lista(), opcoes());
    const antes = { imoveis: await contar(imoveis), fotos: await contar(fotos), ligacoes: await contar(imovelFotos), controle: await contar(importacaoLoft) };
    const objetos = memoria().objetos.size;
    baixadas = [];

    const r = await importarLoft(amb.db, lista(), opcoes({ agora: new Date("2026-10-30T12:00:00Z") }));

    expect(r).toMatchObject({ criados: [], atualizados: [], camposPreservados: [], indisponibilizados: [], ausentesRascunho: [], excluidosNoPainel: [], fotosBaixadas: 0, fotosFalhas: [], exemplosRemovidos: [], oportunidade: null });
    expect(baixadas).toEqual([]);
    expect({ imoveis: await contar(imoveis), fotos: await contar(fotos), ligacoes: await contar(imovelFotos), controle: await contar(importacaoLoft) }).toEqual(antes);
    expect(memoria().objetos.size).toBe(objetos);
    expect((await porRef("901")).publicadoEm?.getTime()).toBe(AGORA.getTime());
  });

  test("campo editado no painel é preservado; os outros atualizam", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const a = await porRef("901");
    const tituloFeed = a.titulo;
    await salvarNoPainel(amb.admin, a.id, (e) => (e.titulo = "Título da equipe"));

    const novo = () => mudar(lista(), "901", (i) => { i.titulo = "Título novo da Loft"; i.valor = 950_000; });
    const r = await importarLoft(amb.db, novo(), opcoes());

    expect(r.camposPreservados).toEqual([{ referencia: "901", campos: ["titulo"] }]);
    expect(r.atualizados).toEqual(["901"]);
    expect(await porRef("901")).toMatchObject({ titulo: "Título da equipe", valor: 950_000 });

    // A equipe volta ao título original da Loft: ele volta a seguir o feed.
    await salvarNoPainel(amb.admin, a.id, (e) => (e.titulo = tituloFeed));
    const r2 = await importarLoft(amb.db, novo(), opcoes());
    expect(r2.camposPreservados).toEqual([]);
    expect((await porRef("901")).titulo).toBe("Título novo da Loft");
  });

  test("reatribuir o responsável não bloqueia a atualização de preço e fotos", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const a = await porRef("901");
    await salvarNoPainel(amb.admin, a.id, (e) => (e.responsavelId = amb.ricardo.id));

    const l = mudar(lista(), "901", (i) => {
      i.valor = 1_000_000;
      i.fotos = [...i.fotos, "https://cdn.exemplo.test/fotos/901/4.jpg"];
    });
    const r = await importarLoft(amb.db, l, opcoes());

    expect(r.camposPreservados).toEqual([]);
    expect(r.atualizados).toEqual(["901"]);
    expect(r.fotosBaixadas).toBe(1);
    expect(await porRef("901")).toMatchObject({ valor: 1_000_000, responsavelId: amb.ricardo.id });
    expect(await chavesDe(a.id)).toEqual(l.find((i) => i.referencia === "901")!.fotos.map((u) => chaveLoft("901", u)));
  });

  test("fotos editadas no painel não são tocadas; não editadas sincronizam (nova baixada, removida descartada)", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const a = await porRef("901");
    const b = await porRef("902");
    await salvarNoPainel(amb.admin, a.id, (e) => e.fotos.reverse());
    const ordemPainel = await chavesDe(a.id);
    const [saiu, fica] = await chavesDe(b.id);

    const l = lista();
    mudar(l, "901", (i) => (i.fotos = [...i.fotos, "https://cdn.exemplo.test/fotos/901/4.jpg"]));
    mudar(l, "902", (i) => (i.fotos = [i.fotos[1], "https://cdn.exemplo.test/fotos/902/3.jpg"]));
    baixadas = [];
    const r = await importarLoft(amb.db, l, opcoes());

    expect(r.camposPreservados).toEqual([{ referencia: "901", campos: ["fotos"] }]);
    expect(await chavesDe(a.id)).toEqual(ordemPainel);
    expect(baixadas).toEqual(["https://cdn.exemplo.test/fotos/902/3.jpg"]);
    expect(await chavesDe(b.id)).toEqual([fica, chaveLoft("902", "https://cdn.exemplo.test/fotos/902/3.jpg")]);
    expect(r.atualizados).toEqual(["902"]);
    // A que saiu do feed sai do banco e do armazenamento; a do 901 que a equipe mantém, não.
    expect(memoria().objetos.has(saiu)).toBe(false);
    expect(await amb.db.select().from(fotos).where(eq(fotos.chave, saiu))).toEqual([]);
    for (const k of ordemPainel) expect(memoria().objetos.has(k)).toBe(true);
    const [ctl] = await amb.db.select().from(importacaoLoft).where(eq(importacaoLoft.referencia, "902"));
    expect(ctl.fotosOrigem).toEqual(l.find((i) => i.referencia === "902")!.fotos);
  });

  test("excluído no painel não volta", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const b = await porRef("902");
    expect((await excluirImovel(amb.admin, b.id, amb.db)).ok).toBe(true);

    const r = await importarLoft(amb.db, lista(), opcoes());

    expect(r.excluidosNoPainel).toEqual(["902"]);
    expect(r.criados).toEqual([]);
    expect(await porRef("902")).toBeUndefined();
    expect(await contar(imoveis)).toBe(7);
    expect(baixadas.filter((u) => u.includes("/902/"))).toHaveLength(2);
  });

  test("sumiu do feed: indisponível; se era a Oportunidade, ela é reatribuída", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const op = (await porRef("905")).id;
    expect(await oportunidade()).toBe(op);
    const editado = await porRef("904");
    await salvarNoPainel(amb.admin, editado.id, (e) => (e.descricao = "Descrição da equipe."));

    const sem = () => lista().filter((i) => i.referencia !== "905" && i.referencia !== "904");
    const r = await importarLoft(amb.db, sem(), opcoes());

    expect(r.indisponibilizados).toEqual(["905"]);
    expect((await porRef("905")).situacao).toBe("indisponivel");
    expect((await porRef("904")).situacao).toBe("publicado");
    expect(r.avisos.some((a) => a.referencia === "904" && /editado no painel/.test(a.aviso))).toBe(true);
    // Próximo publicado de maior valor, à venda e com foto: 903 (R$ 3,2 mi).
    const novaOp = (await porRef("903")).id;
    expect(r.oportunidade).toBe(novaOp);
    expect(await oportunidade()).toBe(novaOp);

    const r2 = await importarLoft(amb.db, sem(), opcoes());
    expect(r2.indisponibilizados).toEqual([]);
    expect(r2.oportunidade).toBeNull();

    // Voltou ao feed: volta a publicado, sem mudar a data da primeira publicação.
    const r3 = await importarLoft(amb.db, lista(), opcoes({ agora: new Date("2026-11-02T12:00:00Z") }));
    expect(r3.atualizados).toContain("905");
    expect(await porRef("905")).toMatchObject({ situacao: "publicado", publicadoEm: AGORA });
  });

  test("foto que falha não derruba o imóvel e entra no relatório; a próxima rodada tenta de novo", async () => {
    const quebrada = "https://cdn.exemplo.test/fotos/901/falha.jpg";
    const pdf = "https://cdn.exemplo.test/fotos/902/pdf.jpg";
    const l = () => {
      const x = mudar(lista(), "901", (i) => (i.fotos = [i.fotos[0], quebrada, i.fotos[2]]));
      return mudar(x, "902", (i) => (i.fotos = [...i.fotos, pdf]));
    };
    const r = await importarLoft(amb.db, l(), opcoes());

    expect(r.criados).toHaveLength(8);
    expect(r.fotosFalhas).toEqual([
      { referencia: "901", url: quebrada, erro: expect.stringMatching(/404/) },
      { referencia: "902", url: pdf, erro: expect.stringMatching(/tipo/i) },
    ]);
    const a = await porRef("901");
    const urls901 = l().find((i) => i.referencia === "901")!.fotos;
    expect(await chavesDe(a.id)).toEqual([chaveLoft("901", urls901[0]), chaveLoft("901", urls901[2])]);
    expect(await amb.db.select().from(fotos).where(eq(fotos.chave, chaveLoft("902", pdf)))).toEqual([]);

    liberadas.add(quebrada);
    baixadas = [];
    const r2 = await importarLoft(amb.db, l(), opcoes());
    expect(baixadas).toEqual([quebrada, pdf]);
    expect(r2.fotosBaixadas).toBe(1);
    expect(r2.fotosFalhas).toEqual([{ referencia: "902", url: pdf, erro: expect.stringMatching(/tipo/i) }]);
    expect(await chavesDe(a.id)).toEqual(urls901.map((u) => chaveLoft("901", u)));
    expect(r2.atualizados).toEqual(["901"]);
  });

  test("rascunho que sumiu da rodada não vira indisponível (a página de indisponível é pública)", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    const r = await importarLoft(amb.db, lista().filter((i) => i.referencia !== "906"), opcoes());
    expect(r.indisponibilizados).toEqual([]);
    expect(r.ausentesRascunho).toEqual(["906"]);
    expect(await porRef("906")).toMatchObject({ situacao: "rascunho", publicadoEm: null });
  });

  test("Oportunidade só vai para um imóvel que a Home mostra (completo: tipo e área)", async () => {
    // 905 é o de maior valor, publicado, à venda e com foto, mas sem área: não serve.
    const r = await importarLoft(amb.db, mudar(lista(), "905", (i) => (i.area = null)), opcoes());
    expect((await porRef("905")).situacao).toBe("publicado");
    expect(r.oportunidade).toBe((await porRef("903")).id);

    // A Oportunidade atual que ficou incompleta (sem tipo) também é trocada.
    await amb.db.update(imoveis).set({ tipo: null }).where(eq(imoveis.referenciaLoft, "903"));
    const r2 = await importarLoft(amb.db, mudar(lista(), "905", (i) => (i.area = null)), opcoes());
    expect(r2.oportunidade).toBe((await porRef("904")).id);
    expect(await oportunidade()).toBe((await porRef("904")).id);
  });

  test("campo sem entrada no snapshot: adota o do feed se a coluna está vazia; senão preserva", async () => {
    await importarLoft(amb.db, lista(), opcoes());
    for (const [ref, campo] of [["901", "andar"], ["903", "quartos"]] as const) {
      const [ctl] = await amb.db.select().from(importacaoLoft).where(eq(importacaoLoft.referencia, ref));
      const valores = { ...ctl.valores };
      delete valores[campo];
      await amb.db.update(importacaoLoft).set({ valores }).where(eq(importacaoLoft.referencia, ref));
    }
    await amb.db.update(imoveis).set({ andar: null }).where(eq(imoveis.referenciaLoft, "901"));

    const r = await importarLoft(amb.db, mudar(lista(), "903", (i) => (i.quartos = 9)), opcoes());

    expect((await porRef("901")).andar).toBe(7);
    const [ctl] = await amb.db.select().from(importacaoLoft).where(eq(importacaoLoft.referencia, "901"));
    expect(ctl.valores.andar).toBe(7);
    expect(r.camposPreservados).toEqual([{ referencia: "903", campos: ["quartos"] }]);
    expect((await porRef("903")).quartos).not.toBe(9);
  });

  test("lista vazia é recusada (feed vazio indisponibilizaria tudo)", async () => {
    await expect(importarLoft(amb.db, [], opcoes())).rejects.toThrow(/vazia/);
  });
});
