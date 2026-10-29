import { count, eq } from "drizzle-orm";
import { beforeAll, beforeEach, describe, expect, test, vi } from "vitest";
import { armazenamento, armazenamentoMemoria, definirArmazenamento } from "@/lib/armazenamento";
import { oportunidadeDeHoje } from "@/lib/imoveis/catalogo";
import { remetente, type remetenteMemoria } from "@/lib/email";
import { configuracaoSite, fotos, imovelFotos, imoveis, sessoes, tentativasLogin, tokensSenha, usuarios } from "@/lib/dados/esquema";
import { criarAmbiente, type Ambiente } from "@/lib/dados/testes";
import { conferirSenha, gerarSenhaProvisoria, hashToken } from "@/lib/seguranca/senha";
import {
  abrirSessao,
  BLOQUEIO_MIN,
  convidar,
  criarToken,
  definirSenha,
  definirSenhaProvisoria,
  desativar,
  entrar,
  lerSessao,
  lerToken,
  limparExpirados,
  pedirRedefinicao,
  reativar,
  reenviarConvite,
  trocarSenha,
  trocarSenhaObrigatoria,
} from "./contas";
import {
  avisoOportunidadeVazia,
  confirmarFoto,
  excluirImovel,
  listarImoveis,
  obterParaEdicao,
  prepararEnvioFoto,
  salvarImovel,
} from "./imoveis";
import { erroNovaSenha, validarImovel, type EntradaImovel } from "./regras";

let amb: Ambiente;
beforeAll(async () => {
  amb = await criarAmbiente();
});
beforeEach(async () => {
  await amb.reiniciar({ imoveis: true });
  // cz1009 e cz1030 são da Mariana; cz1015 do Ricardo; o resto é do ADMIN (como a semente de dev).
  await amb.db.update(imoveis).set({ responsavelId: amb.mariana.id }).where(eq(imoveis.id, "cz1009"));
  await amb.db.update(imoveis).set({ responsavelId: amb.mariana.id }).where(eq(imoveis.id, "cz1030"));
  await amb.db.update(imoveis).set({ responsavelId: amb.ricardo.id }).where(eq(imoveis.id, "cz1015"));
  vi.spyOn(console, "error").mockImplementation(() => {});
});

const caixa = () => remetente() as ReturnType<typeof remetenteMemoria>;
const tokenDoEmail = (indice = -1) => {
  const m = caixa().enviadas.at(indice)!;
  return new URL(/https?:\S+definir-senha\?\S+/.exec(m.texto)![0]).searchParams.get("token")!;
};
const imovelDe = async (id: string) => (await amb.db.select().from(imoveis).where(eq(imoveis.id, id)))[0];
const contar = async (tabela: typeof usuarios | typeof imoveis | typeof fotos | typeof sessoes | typeof tokensSenha) => (await amb.db.select({ n: count() }).from(tabela))[0].n;

const vazia: EntradaImovel = {
  finalidade: "", lancamento: false, tipo: "", titulo: "", bairro: "", cidade: "", uf: "MG",
  valor: "", area: "", quartos: "", vagas: "", descricao: "", fotos: [], situacao: "rascunho",
  banheiros: "", suites: "", areaTotal: "", condominio: "", iptu: "", valorLocacao: "", andar: "", anoConstrucao: "",
  empreendimento: "", endereco: "", numero: "", complemento: "", cep: "", caracteristicas: [],
};
const completa: EntradaImovel = {
  ...vazia, finalidade: "venda", tipo: "Casa", titulo: "Casa no Sion", bairro: "Sion", cidade: "Belo Horizonte",
  valor: "2500000", area: "320", quartos: "4", descricao: "Casa ampla.\n\nPerto de tudo.",
};

/** Entrada publicável (os obrigatórios preenchidos). */
const entradaValida = (): EntradaImovel => ({ ...completa });

const JPG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]);

/** Faz o caminho completo de uma foto: preparar, "enviar" ao armazenamento e confirmar. */
async function fotoConfirmada(u = amb.mariana, bytes = JPG) {
  const p = await prepararEnvioFoto(u, { tipo: "image/jpeg", tamanho: bytes.byteLength, largura: 1600, altura: 1200 }, amb.db);
  if (!p.ok) throw new Error("esperava ok");
  const [linha] = await amb.db.select().from(fotos).where(eq(fotos.id, p.id));
  await armazenamento().enviar(linha.chave, bytes, "image/jpeg");
  const c = await confirmarFoto(u, p.id, amb.db);
  if (!c.ok) throw new Error("esperava confirmação");
  return c;
}

describe("cadastro de imóvel", () => {
  test("salva e relê os campos novos", async () => {
    const r = await salvarImovel(
      amb.admin, null,
      { ...entradaValida(), banheiros: "3", suites: "2", areaTotal: "450", condominio: "1250", iptu: "4800", valorLocacao: "", andar: "4", anoConstrucao: "2015", empreendimento: "  Edifício   Soho ", endereco: "Rua X", numero: "110", complemento: "403", cep: "34006-083", caracteristicas: ["piscina", "invalida", "academia", "piscina"] },
      "publicar", new Date(), amb.db,
    );
    if (!r.ok) throw new Error("esperava ok");
    const ed = (await obterParaEdicao(amb.admin, r.id, amb.db))!;
    expect(ed.entrada).toMatchObject({ banheiros: "3", suites: "2", areaTotal: "450", condominio: "1250", iptu: "4800", valorLocacao: "", andar: "4", anoConstrucao: "2015", empreendimento: "Edifício Soho", endereco: "Rua X", numero: "110", complemento: "403", cep: "34006-083" });
    expect(ed.entrada.caracteristicas).toEqual(["piscina", "academia"]);
    expect(ed.referenciaLoft).toBeNull();
    const linha = (await listarImoveis(amb.admin, amb.db)).find((l) => l.id === r.id)!;
    expect(linha).toMatchObject({ empreendimento: "Edifício Soho", referenciaLoft: null });
  });

  test("formatos inválidos dos campos novos são erro, vazio não é", () => {
    const { erros } = validarImovel({ ...entradaValida(), suites: "dois", anoConstrucao: "1700", cep: "abc", condominio: "" }, "publicado");
    expect(erros).toEqual({ suites: "Use só números.", anoConstrucao: "Ano inválido.", cep: "CEP inválido. Use 00000-000." });
  });

  test("valor de locação só com finalidade venda", () => {
    const { erros } = validarImovel({ ...entradaValida(), finalidade: "locacao", valorLocacao: "5000" }, "publicado");
    expect(erros.valorLocacao).toBe("Use o campo Valor mensal para imóveis de locação.");
  });

  test("textos acima de 120 caracteres são erro no próprio campo", () => {
    const longo = "x".repeat(121);
    for (const campo of ["empreendimento", "endereco", "numero", "complemento"] as const) {
      const { erros } = validarImovel({ ...entradaValida(), [campo]: longo }, "publicado");
      expect(erros).toEqual({ [campo]: "Use até 120 caracteres." });
    }
  });

  test("CEP sem hífen é gravado com hífen", async () => {
    const r = await salvarImovel(amb.admin, null, { ...entradaValida(), cep: "34006083" }, "publicar", new Date(), amb.db);
    if (!r.ok) throw new Error("esperava ok");
    expect((await obterParaEdicao(amb.admin, r.id, amb.db))!.entrada.cep).toBe("34006-083");
  });

  test("ano de construção: limites", () => {
    const ano = new Date().getFullYear();
    const erro = (v: number) => validarImovel({ ...entradaValida(), anoConstrucao: String(v) }, "publicado").erros.anoConstrucao;
    expect(erro(ano + 5)).toBeUndefined();
    expect(erro(ano + 6)).toBe("Ano inválido.");
    expect(erro(1800)).toBeUndefined();
    expect(erro(1799)).toBe("Ano inválido.");
  });

  test("limite dos números pequenos", () => {
    expect(validarImovel({ ...entradaValida(), suites: "100" }, "publicado").erros.suites).toBe("Use só números.");
  });

  test("valor de locação é aceito com finalidade venda", async () => {
    const r = await salvarImovel(amb.admin, null, { ...entradaValida(), finalidade: "venda", valorLocacao: "5000" }, "publicar", new Date(), amb.db);
    if (!r.ok) throw new Error("esperava ok");
    expect((await obterParaEdicao(amb.admin, r.id, amb.db))!.entrada.valorLocacao).toBe("5000");
  });

  test("rascunho salva incompleto e não aparece no site", async () => {
    const r = await salvarImovel(amb.mariana, null, vazia, "rascunho", new Date(), amb.db);
    expect(r).toMatchObject({ ok: true, codigo: "CZ1036", situacao: "rascunho", novo: true });
    const reg = await imovelDe("cz1036");
    expect(reg.responsavelId).toBe(amb.mariana.id);
    expect(reg.publicadoEm).toBeNull();
  });

  test("publicar exige os obrigatórios, com a mensagem de cada campo", async () => {
    const r = await salvarImovel(amb.mariana, null, { ...vazia, finalidade: "locacao" }, "publicar", new Date(), amb.db);
    expect(r.ok).toBe(false);
    if (r.ok || !("erros" in r)) return;
    expect(Object.keys(r.erros).sort()).toEqual(["area", "bairro", "cidade", "descricao", "tipo", "titulo", "valor"]);
    expect(r.erros.valor).toBe("Informe o valor mensal.");
    expect(await imovelDe("cz1036")).toBeUndefined();
  });

  test("publicar grava a data da primeira publicação, que não muda ao editar", async () => {
    const r = await salvarImovel(amb.mariana, null, completa, "publicar", new Date("2026-10-21T12:00:00Z"), amb.db);
    if (!r.ok) throw new Error("esperava ok");
    await salvarImovel(amb.mariana, r.id, { ...completa, titulo: "Casa reformada no Sion", situacao: "publicado" }, "salvar", new Date("2026-10-22T12:00:00Z"), amb.db);
    const reg = await imovelDe(r.id);
    expect(reg.publicadoEm?.toISOString()).toBe("2026-10-21T12:00:00.000Z");
    expect(reg.alteradoEm.toISOString()).toBe("2026-10-22T12:00:00.000Z");
    expect(reg.descricao).toBe("Casa ampla.\n\nPerto de tudo.");
  });

  test("Corretor edita só os próprios e não troca o responsável", async () => {
    expect(await salvarImovel(amb.mariana, "cz1015", { ...completa, situacao: "publicado" }, "salvar", new Date(), amb.db)).toEqual({ ok: false, proibido: true });
    const entrada = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!.entrada;
    const r = await salvarImovel(amb.mariana, "cz1009", { ...entrada, responsavelId: amb.ricardo.id }, "salvar", new Date(), amb.db);
    expect(r.ok).toBe(true);
    expect((await imovelDe("cz1009")).responsavelId).toBe(amb.mariana.id);
    expect((await listarImoveis(amb.mariana, amb.db)).find((l) => l.id === "cz1015")?.podeEditar).toBe(false);
  });

  test("ADMIN troca o responsável; id que não é uuid é ignorado", async () => {
    const entrada = (await obterParaEdicao(amb.admin, "cz1015", amb.db))!.entrada;
    await salvarImovel(amb.admin, "cz1015", { ...entrada, responsavelId: amb.mariana.id }, "salvar", new Date(), amb.db);
    expect((await imovelDe("cz1015")).responsavelId).toBe(amb.mariana.id);
    await salvarImovel(amb.admin, "cz1015", { ...entrada, responsavelId: "u3" }, "salvar", new Date(), amb.db);
    expect((await imovelDe("cz1015")).responsavelId).toBe(amb.mariana.id);
  });

  test("só ADMIN exclui, e a exclusão apaga as fotos do imóvel e os objetos", async () => {
    expect(await excluirImovel(amb.mariana, "cz1009", amb.db)).toEqual({ ok: false });
    const antes = await contar(fotos);
    const objetosAntes = (armazenamento() as ReturnType<typeof armazenamentoMemoria>).objetos.size;
    expect(await excluirImovel(amb.admin, "cz1026", amb.db)).toMatchObject({ ok: true, codigo: "CZ1026", oportunidadeSaiu: false });
    expect(await imovelDe("cz1026")).toBeUndefined();
    expect(await contar(fotos)).toBe(antes - 1);
    expect((armazenamento() as ReturnType<typeof armazenamentoMemoria>).objetos.size).toBe(objetosAntes - 1);
  });

  test("código vem da sequence: criações simultâneas não repetem", async () => {
    const rs = await Promise.all(Array.from({ length: 5 }, () => salvarImovel(amb.admin, null, vazia, "rascunho", new Date(), amb.db)));
    const codigos = rs.map((r) => (r.ok ? r.codigo : "")).sort();
    expect(new Set(codigos).size).toBe(5);
    expect(codigos[0]).toBe("CZ1036");
    expect(codigos[4]).toBe("CZ1040");
  });

  test("a sequence começa em 1001 num banco novo e não reaproveita código de imóvel excluído", async () => {
    await amb.reiniciar();
    expect(await salvarImovel(amb.admin, null, vazia, "rascunho", new Date(), amb.db)).toMatchObject({ codigo: "CZ1001" });
    await excluirImovel(amb.admin, "cz1001", amb.db);
    expect(await salvarImovel(amb.admin, null, vazia, "rascunho", new Date(), amb.db)).toMatchObject({ codigo: "CZ1002" });
  });

  test("salvar é transacional: falha ao gravar as fotos desfaz o imóvel", async () => {
    const f = await fotoConfirmada();
    const falho = new Proxy(amb.db, {
      get(alvo, prop) {
        if (prop !== "transaction") return Reflect.get(alvo, prop).bind?.(alvo) ?? Reflect.get(alvo, prop);
        return (fn: (tx: unknown) => unknown) =>
          alvo.transaction(async (tx) =>
            fn(
              new Proxy(tx, {
                get(t, p) {
                  const v = Reflect.get(t, p);
                  if (p === "insert") return (tabela: unknown) => (tabela === imovelFotos ? { values: () => Promise.reject(new Error("falha simulada")) } : t.insert(tabela as typeof imoveis));
                  return typeof v === "function" ? v.bind(t) : v;
                },
              }),
            ),
          );
      },
    });
    const antes = await contar(imoveis);
    await expect(salvarImovel(amb.mariana, null, { ...completa, fotos: [{ id: f.id, alt: "x" }] }, "publicar", new Date(), falho as typeof amb.db)).rejects.toThrow("falha simulada");
    expect(await contar(imoveis)).toBe(antes);
  });
});

describe("fotos (upload direto ao armazenamento)", () => {
  test("preparar confere tipo, tamanho e dimensões antes de dar a URL", async () => {
    const base = { tipo: "image/jpeg", tamanho: 1000, largura: 10, altura: 10 };
    expect(await prepararEnvioFoto(amb.mariana, { ...base, tipo: "image/gif" }, amb.db)).toEqual({ ok: false, erro: "tipo" });
    expect(await prepararEnvioFoto(amb.mariana, { ...base, tamanho: 16 * 1024 * 1024 }, amb.db)).toEqual({ ok: false, erro: "tamanho" });
    expect(await prepararEnvioFoto(amb.mariana, { ...base, tamanho: 0 }, amb.db)).toEqual({ ok: false, erro: "tamanho" });
    expect(await prepararEnvioFoto(amb.mariana, { ...base, largura: 0 }, amb.db)).toEqual({ ok: false, erro: "dimensoes" });
    const ok = await prepararEnvioFoto(amb.mariana, base, amb.db);
    expect(ok).toMatchObject({ ok: true });
    const [linha] = await amb.db.select().from(fotos).where(eq(fotos.id, (ok as { id: string }).id));
    expect(linha).toMatchObject({ confirmada: false, enviadoPorId: amb.mariana.id, tamanho: 1000 });
  });

  test("confirmar: objeto ausente, de outro usuário e inexistente", async () => {
    const p = await prepararEnvioFoto(amb.mariana, { tipo: "image/jpeg", tamanho: 16, largura: 10, altura: 10 }, amb.db);
    if (!p.ok) throw new Error("esperava ok");
    expect(await confirmarFoto(amb.mariana, p.id, amb.db)).toEqual({ ok: false, erro: "ausente" });
    expect(await confirmarFoto(amb.ricardo, p.id, amb.db)).toEqual({ ok: false, erro: "inexistente" });
    expect(await confirmarFoto(amb.mariana, "nao-e-uuid", amb.db)).toEqual({ ok: false, erro: "inexistente" });
  });

  test("confirmar recusa e apaga o objeto quando o tamanho ou a assinatura não batem", async () => {
    const p = await prepararEnvioFoto(amb.mariana, { tipo: "image/jpeg", tamanho: 16, largura: 10, altura: 10 }, amb.db);
    if (!p.ok) throw new Error("esperava ok");
    const [linha] = await amb.db.select().from(fotos).where(eq(fotos.id, p.id));
    const objetos = (armazenamento() as ReturnType<typeof armazenamentoMemoria>).objetos;
    await armazenamento().enviar(linha.chave, new TextEncoder().encode("isto não é uma foto"), "image/jpeg");
    expect(await confirmarFoto(amb.mariana, p.id, amb.db)).toEqual({ ok: false, erro: "invalida" });
    expect(objetos.has(linha.chave)).toBe(false);
    expect(await amb.db.select().from(fotos).where(eq(fotos.id, p.id))).toHaveLength(0);
  });

  test("a ordem define a capa e a URL é a do armazenamento", async () => {
    const f = await fotoConfirmada();
    expect(f.src).toMatch(/^https:\/\/fotos\.teste\/fotos\/.+\.jpg$/);
    const edicao = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!;
    const r = await salvarImovel(amb.mariana, "cz1009", { ...edicao.entrada, fotos: [{ id: f.id, alt: "Fachada" }, ...edicao.entrada.fotos] }, "salvar", new Date(), amb.db);
    expect(r.ok).toBe(true);
    const nova = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!;
    expect(nova.fotos[0]).toMatchObject({ id: f.id, src: f.src, alt: "Fachada", largura: 1600 });
    expect(nova.fotos).toHaveLength(7);
  });

  test("salvar recusa foto não confirmada, inexistente, de outro usuário, de outro imóvel ou repetida", async () => {
    const edicao = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!;
    const tentar = (fs: { id: string; alt: string }[]) => salvarImovel(amb.mariana, "cz1009", { ...edicao.entrada, fotos: fs }, "salvar", new Date(), amb.db);

    const pendente = await prepararEnvioFoto(amb.mariana, { tipo: "image/jpeg", tamanho: 16, largura: 10, altura: 10 }, amb.db);
    if (!pendente.ok) throw new Error("esperava ok");
    expect((await tentar([{ id: pendente.id, alt: "" }])).ok).toBe(false);
    expect((await tentar([{ id: "nao-existe", alt: "" }])).ok).toBe(false);

    const doRicardo = await fotoConfirmada(amb.ricardo);
    expect((await tentar([{ id: doRicardo.id, alt: "" }])).ok).toBe(false);

    const deOutroImovel = (await obterParaEdicao(amb.admin, "cz1005", amb.db))!.fotos[0];
    expect((await tentar([{ id: deOutroImovel.id, alt: "" }])).ok).toBe(false);

    const propria = await fotoConfirmada(amb.mariana);
    expect((await tentar([{ id: propria.id, alt: "" }, { id: propria.id, alt: "" }])).ok).toBe(false);
    expect((await tentar([{ id: propria.id, alt: "ok" }])).ok).toBe(true);
  });

  test("foto tirada do imóvel some do armazenamento", async () => {
    const edicao = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!;
    const [removida, ...resto] = edicao.entrada.fotos;
    const [linha] = await amb.db.select().from(fotos).where(eq(fotos.id, removida.id));
    const objetos = (armazenamento() as ReturnType<typeof armazenamentoMemoria>).objetos;
    expect(objetos.has(linha.chave)).toBe(true);
    await salvarImovel(amb.mariana, "cz1009", { ...edicao.entrada, fotos: resto }, "salvar", new Date(), amb.db);
    expect(objetos.has(linha.chave)).toBe(false);
    expect(await amb.db.select().from(fotos).where(eq(fotos.id, removida.id))).toHaveLength(0);
  });

  test("falha ao remover do armazenamento não derruba o salvar e deixa a foto para a limpeza", async () => {
    const memoria = armazenamentoMemoria();
    definirArmazenamento({ ...memoria, remover: async () => { throw new Error("bucket fora do ar"); } });
    const edicao = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!;
    const [removida, ...resto] = edicao.entrada.fotos;
    expect((await salvarImovel(amb.mariana, "cz1009", { ...edicao.entrada, fotos: resto }, "salvar", new Date(), amb.db)).ok).toBe(true);
    expect(await amb.db.select().from(fotos).where(eq(fotos.id, removida.id))).toHaveLength(1);
  });
});

describe("Oportunidade de hoje", () => {
  const cfg = async () => (await amb.db.select().from(configuracaoSite))[0];

  test("ADMIN marca outro imóvel publicado e ele substitui o atual", async () => {
    const entrada = (await obterParaEdicao(amb.admin, "cz1015", amb.db))!.entrada;
    await salvarImovel(amb.admin, "cz1015", { ...entrada, oportunidade: true }, "salvar", new Date(), amb.db);
    expect((await cfg()).oportunidadeId).toBe("cz1015");
    expect((await oportunidadeDeHoje(amb.db))?.codigo).toBe("CZ1015");
  });

  test("Corretor não muda a escolha", async () => {
    const entrada = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!.entrada;
    await salvarImovel(amb.mariana, "cz1009", { ...entrada, oportunidade: false }, "salvar", new Date(), amb.db);
    expect((await cfg()).oportunidadeId).toBe("cz1009");
  });

  test("só imóvel publicado entra", async () => {
    await salvarImovel(amb.admin, null, { ...completa, oportunidade: true }, "rascunho", new Date(), amb.db);
    expect((await cfg()).oportunidadeId).toBe("cz1009");
  });

  test("Corretor tira o imóvel do ar: a seção some e o ADMIN é avisado", async () => {
    const entrada = (await obterParaEdicao(amb.mariana, "cz1009", amb.db))!.entrada;
    const r = await salvarImovel(amb.mariana, "cz1009", { ...entrada, situacao: "indisponivel" }, "salvar", new Date(), amb.db);
    expect(r).toMatchObject({ ok: true, oportunidadeSaiu: true });
    expect(await oportunidadeDeHoje(amb.db)).toBeNull();
    expect(await avisoOportunidadeVazia(amb.mariana, amb.db)).toBeNull();
    const aviso = await avisoOportunidadeVazia(amb.admin, amb.db);
    expect(aviso?.porNome).toBe("Mariana Costa");
    expect(aviso?.aviso).toMatchObject({ codigo: "CZ1009", motivo: "indisponivel" });
  });

  test("excluir o imóvel da Oportunidade de hoje esvazia a seção", async () => {
    expect(await excluirImovel(amb.admin, "cz1009", amb.db)).toMatchObject({ ok: true, oportunidadeSaiu: true });
    expect((await avisoOportunidadeVazia(amb.admin, amb.db))?.aviso?.motivo).toBe("excluido");
    const entrada = (await obterParaEdicao(amb.admin, "cz1015", amb.db))!.entrada;
    await salvarImovel(amb.admin, "cz1015", { ...entrada, oportunidade: true }, "salvar", new Date(), amb.db);
    expect(await avisoOportunidadeVazia(amb.admin, amb.db)).toBeNull();
  });
});

describe("acesso", () => {
  test("e-mail ou senha errados: mensagem única; 5 erros bloqueiam por 15 minutos", async () => {
    const agora = Date.parse("2026-10-21T12:00:00Z");
    expect(await entrar("ninguem@x.com", "x", agora, amb.db)).toEqual({ ok: false, erro: "credenciais" });
    for (let i = 0; i < 4; i++) expect((await entrar(amb.admin.email, "errada", agora, amb.db)).ok).toBe(false);
    expect(await entrar(amb.admin.email, "errada", agora, amb.db)).toEqual({ ok: false, erro: "bloqueado" });
    expect(await entrar(amb.admin.email, amb.senha, agora + 60_000, amb.db)).toEqual({ ok: false, erro: "bloqueado" });
    expect((await entrar(amb.admin.email, amb.senha, agora + (BLOQUEIO_MIN + 1) * 60_000, amb.db)).ok).toBe(true);
  });

  test("tentativas simultâneas contam todas (sem corrida)", async () => {
    const agora = Date.now();
    await Promise.all(Array.from({ length: 5 }, () => entrar(amb.mariana.email, "errada", agora, amb.db)));
    expect(await entrar(amb.mariana.email, amb.senha, agora, amb.db)).toEqual({ ok: false, erro: "bloqueado" });
  });

  test("entrar com sucesso zera as tentativas e registra o último acesso", async () => {
    const agora = Date.parse("2026-10-21T12:00:00Z");
    await entrar(amb.mariana.email, "errada", agora, amb.db);
    const r = await entrar(` ${amb.mariana.email.toUpperCase()} `, amb.senha, agora, amb.db);
    expect(r.ok).toBe(true);
    expect(await amb.db.select().from(tentativasLogin)).toHaveLength(0);
    expect((await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.mariana.id)))[0].ultimoAcesso?.toISOString()).toBe("2026-10-21T12:00:00.000Z");
  });

  test("convite pendente e desativado não entram", async () => {
    expect((await entrar(amb.juliana.email, amb.senha, Date.now(), amb.db)).ok).toBe(false);
    expect((await entrar(amb.paulo.email, amb.senha, Date.now(), amb.db)).ok).toBe(false);
  });

  test("sessão ociosa expira; usuário desativado perde a sessão", async () => {
    const t = await abrirSessao(amb.mariana.id, 0, amb.db);
    expect((await lerSessao(t, 60 * 60_000, amb.db)).usuario?.id).toBe(amb.mariana.id);
    expect(await lerSessao(t, 60 * 60_000 + 121 * 60_000, amb.db)).toEqual({ usuario: null, motivo: "expirada" });
    expect(await lerSessao(t, 0, amb.db)).toEqual({ usuario: null, motivo: "expirada" });
  });

  test("a sessão guarda só o hash do token", async () => {
    const t = await abrirSessao(amb.mariana.id, Date.now(), amb.db);
    const linhas = await amb.db.select().from(sessoes);
    expect(linhas.map((l) => l.tokenHash)).toEqual([hashToken(t)]);
    expect(JSON.stringify(linhas)).not.toContain(t);
  });

  test("usada_em não é regravado a cada requisição (no máximo uma vez por minuto)", async () => {
    const t = await abrirSessao(amb.mariana.id, 0, amb.db);
    await lerSessao(t, 30_000, amb.db);
    expect((await amb.db.select().from(sessoes))[0].usadaEm.getTime()).toBe(0);
    await lerSessao(t, 90_000, amb.db);
    expect((await amb.db.select().from(sessoes))[0].usadaEm.getTime()).toBe(90_000);
  });

  test("esqueci a senha só envia para conta ativa; o link vale uma vez", async () => {
    await pedirRedefinicao("ninguem@x.com", Date.now(), amb.db);
    await pedirRedefinicao(amb.paulo.email, Date.now(), amb.db);
    await pedirRedefinicao(amb.juliana.email, Date.now(), amb.db);
    expect(caixa().enviadas).toHaveLength(0);
    await pedirRedefinicao(amb.mariana.email, Date.now(), amb.db);
    expect(caixa().enviadas).toHaveLength(1);
    const token = tokenDoEmail();
    expect(await lerToken(token, Date.now(), amb.db)).toMatchObject({ valido: true, tipo: "redefinicao" });
    expect(await definirSenha(token, "curta", "curta", Date.now(), amb.db)).toEqual({ ok: false, erros: { nova: "A senha precisa ter pelo menos 10 caracteres." } });
    expect(await definirSenha(token, "nova-senha-123", "outra-senha-123", Date.now(), amb.db)).toMatchObject({ ok: false, erros: { confirmacao: expect.any(String) } });
    expect(await definirSenha(token, "nova-senha-123", "nova-senha-123", Date.now(), amb.db)).toMatchObject({ ok: true });
    expect(await lerToken(token, Date.now(), amb.db)).toEqual({ valido: false, tipo: "redefinicao" });
    expect(await definirSenha(token, "outra-senha-456", "outra-senha-456", Date.now(), amb.db)).toMatchObject({ ok: false, expirado: true });
    expect((await entrar(amb.mariana.email, "nova-senha-123", Date.now(), amb.db)).ok).toBe(true);
  });

  test("link de redefinição expira em 1 hora", async () => {
    await pedirRedefinicao(amb.mariana.email, 0, amb.db);
    const token = tokenDoEmail();
    expect(await lerToken(token, 61 * 60_000, amb.db)).toEqual({ valido: false, tipo: "redefinicao" });
    expect(await definirSenha(token, "nova-senha-123", "nova-senha-123", 61 * 60_000, amb.db)).toMatchObject({ ok: false, expirado: true });
  });

  test("redefinir a senha encerra as sessões abertas", async () => {
    const aberta = await abrirSessao(amb.mariana.id, Date.now(), amb.db);
    await pedirRedefinicao(amb.mariana.email, Date.now(), amb.db);
    await definirSenha(tokenDoEmail(), "nova-senha-123", "nova-senha-123", Date.now(), amb.db);
    expect((await lerSessao(aberta, Date.now(), amb.db)).usuario).toBeNull();
  });

  test("dois envios simultâneos do mesmo link: só um vale", async () => {
    await pedirRedefinicao(amb.mariana.email, Date.now(), amb.db);
    const token = tokenDoEmail();
    const rs = await Promise.all([
      definirSenha(token, "senha-um-123456", "senha-um-123456", Date.now(), amb.db),
      definirSenha(token, "senha-dois-123456", "senha-dois-123456", Date.now(), amb.db),
    ]);
    expect(rs.filter((r) => r.ok)).toHaveLength(1);
  });

  test("no máximo um e-mail de redefinição a cada 2 minutos", async () => {
    await pedirRedefinicao(amb.mariana.email, 0, amb.db);
    await pedirRedefinicao(amb.mariana.email, 60_000, amb.db);
    expect(caixa().enviadas).toHaveLength(1);
    await pedirRedefinicao(amb.mariana.email, 3 * 60_000, amb.db);
    expect(caixa().enviadas).toHaveLength(2);
    expect(await contar(tokensSenha)).toBe(1);
  });

  test("falha de envio da redefinição não estoura e o log não leva o link", async () => {
    caixa().falhar = true;
    await expect(pedirRedefinicao(amb.mariana.email, Date.now(), amb.db)).resolves.toBeUndefined();
    const registrado = JSON.stringify(vi.mocked(console.error).mock.calls);
    expect(registrado).toContain("falha ao enviar a redefinição");
    expect(registrado).not.toContain("token=");
    expect(registrado).not.toContain("definir-senha");
  });

  test("limparExpirados apaga sessões ociosas e links vencidos há mais de 7 dias", async () => {
    await abrirSessao(amb.mariana.id, 0, amb.db);
    await pedirRedefinicao(amb.ricardo.email, 0, amb.db);
    const dia = 24 * 60 * 60_000;
    expect(await limparExpirados(3 * 60 * 60_000, amb.db)).toMatchObject({ sessoes: 1, tokens: 0 });
    expect(await limparExpirados(8 * dia, amb.db)).toMatchObject({ tokens: 1 });
  });
});

describe("senhas", () => {
  test("são argon2id e nunca aparecem em claro", async () => {
    const [u] = await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.mariana.id));
    expect(u.senhaHash).toMatch(/^\$argon2id\$/);
    expect(u.senhaHash).not.toContain(amb.senha);
  });

  test("hash em outro formato (scrypt antigo, texto puro) não autentica", async () => {
    expect(await conferirSenha("x", "scrypt$aa$bb")).toBe(false);
    expect(await conferirSenha(amb.senha, amb.senha)).toBe(false);
    expect(await conferirSenha(amb.senha, null)).toBe(false);
  });

  test("trocar senha confere a atual", async () => {
    expect(await trocarSenha(amb.mariana.id, "errada", "nova-senha-2027", "nova-senha-2027", amb.db)).toEqual({ ok: false, erros: { atual: "A senha atual está incorreta." } });
    expect(await trocarSenha(amb.mariana.id, amb.senha, "nova-senha-2027", "nova-senha-2027", amb.db)).toEqual({ ok: true });
    expect((await entrar(amb.mariana.email, "nova-senha-2027", Date.now(), amb.db)).ok).toBe(true);
    expect(await trocarSenha("nao-e-uuid", amb.senha, "x", "x", amb.db)).toEqual({ ok: false, erros: { atual: "Sessão inválida." } });
  });
});

describe("usuários", () => {
  test("só existe um ADMIN: o banco recusa o segundo", async () => {
    await expect(amb.db.insert(usuarios).values({ nome: "Outro", email: "outro@exemplo.test", papel: "admin" })).rejects.toThrow();
    expect(await amb.db.select().from(usuarios).where(eq(usuarios.papel, "admin"))).toHaveLength(1);
  });

  test("e-mail é gravado em minúsculas (o banco confere)", async () => {
    await expect(amb.db.insert(usuarios).values({ nome: "Maiúscula", email: "Maiuscula@exemplo.test" })).rejects.toThrow();
  });

  test("convidado entra como Corretor pendente e ativa ao criar a senha", async () => {
    const r = await convidar(amb.admin, "Fernanda Lima", "Fernanda.Lima@exemplo.test", Date.now(), amb.db);
    if (!r.ok) throw new Error("esperava ok");
    expect(r.usuario).toMatchObject({ papel: "corretor", situacao: "pendente", email: "fernanda.lima@exemplo.test" });
    const token = tokenDoEmail();
    expect(await lerToken(token, Date.now(), amb.db)).toMatchObject({ valido: true, tipo: "convite" });
    await definirSenha(token, "senha-da-fernanda", "senha-da-fernanda", Date.now(), amb.db);
    expect((await entrar("fernanda.lima@exemplo.test", "senha-da-fernanda", Date.now(), amb.db)).ok).toBe(true);
  });

  test("o convite vale 72 horas", async () => {
    await convidar(amb.admin, "Fernanda Lima", "fernanda@exemplo.test", 0, amb.db);
    const token = tokenDoEmail();
    expect((await lerToken(token, 71 * 3600_000, amb.db)).valido).toBe(true);
    expect((await lerToken(token, 73 * 3600_000, amb.db)).valido).toBe(false);
  });

  test("e-mail já cadastrado", async () => {
    const r = await convidar(amb.admin, "Paulo", amb.paulo.email, Date.now(), amb.db);
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.email).toContain("Paulo Menezes (desativado)");
  });

  test("convite com falha de envio cria o usuário e orienta a reenviar", async () => {
    caixa().falhar = true;
    const r = await convidar(amb.admin, "Fernanda Lima", "fernanda@exemplo.test", Date.now(), amb.db);
    expect(r).toMatchObject({ ok: false, erros: { email: expect.stringContaining("Reenviar convite") } });
    expect(await amb.db.select().from(usuarios).where(eq(usuarios.email, "fernanda@exemplo.test"))).toHaveLength(1);
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain("token=");
    caixa().falhar = false;
    const [nova] = await amb.db.select().from(usuarios).where(eq(usuarios.email, "fernanda@exemplo.test"));
    expect(await reenviarConvite(amb.admin, nova.id, Date.now(), amb.db)).toBe(true);
    expect(caixa().enviadas).toHaveLength(1);
  });

  test("reenviar convite só para pendente e com id válido", async () => {
    expect(await reenviarConvite(amb.admin, amb.mariana.id, Date.now(), amb.db)).toBe(false);
    expect(await reenviarConvite(amb.admin, "x", Date.now(), amb.db)).toBe(false);
    expect(await reenviarConvite(amb.admin, amb.juliana.id, Date.now(), amb.db)).toBe(true);
  });

  test("ADMIN não desativa a si mesmo; desativar derruba a sessão e mantém os imóveis", async () => {
    expect(await desativar(amb.admin, amb.admin.id, amb.db)).toBe(false);
    const t = await abrirSessao(amb.mariana.id, Date.now(), amb.db);
    expect(await desativar(amb.admin, amb.mariana.id, amb.db)).toBe(true);
    expect((await lerSessao(t, Date.now(), amb.db)).usuario).toBeNull();
    expect((await imovelDe("cz1009")).responsavelId).toBe(amb.mariana.id);
    expect(await reativar(amb.mariana.id, amb.db)).toBe(true);
    expect((await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.mariana.id)))[0].situacao).toBe("ativo");
  });

  test("reativar quem nunca definiu senha volta como convite pendente", async () => {
    await amb.db.update(usuarios).set({ situacao: "desativado" }).where(eq(usuarios.id, amb.juliana.id));
    expect(await reativar(amb.juliana.id, amb.db)).toBe(true);
    expect((await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.juliana.id)))[0].situacao).toBe("pendente");
  });

  test("ids que não são uuid não chegam ao banco", async () => {
    expect(await desativar(amb.admin, "'; drop table usuarios;--", amb.db)).toBe(false);
    expect(await reativar("u3", amb.db)).toBe(false);
  });
});

describe("senha provisória", () => {
  const AGORA = Date.UTC(2026, 9, 29, 12, 0, 0);
  const H = 3600_000;
  const gerar = async (id: string) => {
    const r = await definirSenhaProvisoria(amb.admin, id, AGORA, amb.db);
    if (!r.ok) throw new Error("não gerou");
    return r.senha;
  };

  test("gerarSenhaProvisoria: 12 caracteres sem ambíguos e válida na política", () => {
    for (let i = 0; i < 50; i++) {
      const s = gerarSenhaProvisoria();
      expect(s).toMatch(/^[^0O1lI]{12}$/);
      expect(s).toMatch(/^[A-Za-z2-9]{12}$/);
      expect(erroNovaSenha(s)).toBeNull();
    }
  });

  test("ADMIN gera, a pessoa entra e fica obrigada a trocar", async () => {
    const r = await definirSenhaProvisoria(amb.admin, amb.juliana.id, AGORA, amb.db);
    if (!r.ok) throw new Error();
    expect(erroNovaSenha(r.senha)).toBeNull();
    const e = await entrar(amb.juliana.email, r.senha, AGORA + 1000, amb.db);
    expect(e.ok).toBe(true);
    const token = await abrirSessao(amb.juliana.id, AGORA, amb.db);
    expect((await lerSessao(token, AGORA + 1000, amb.db)).usuario?.trocarSenha).toBe(true);
  });

  test("provisória vencida não entra", async () => {
    const senha = await gerar(amb.juliana.id);
    expect(await entrar(amb.juliana.email, senha, AGORA + 73 * H, amb.db)).toEqual({ ok: false, erro: "credenciais" });
    expect((await entrar(amb.juliana.email, senha, AGORA + 71 * H, amb.db)).ok).toBe(true);
  });

  test("depois da troca, a provisória não vale mais e a flag some", async () => {
    const senha = await gerar(amb.juliana.id);
    const nova = `${amb.senha}-nova`;
    expect(await trocarSenhaObrigatoria(amb.juliana.id, nova, nova, amb.db)).toEqual({ ok: true });
    expect(await entrar(amb.juliana.email, senha, AGORA + 1000, amb.db)).toEqual({ ok: false, erro: "credenciais" });
    expect((await entrar(amb.juliana.email, nova, AGORA + 1000, amb.db)).ok).toBe(true);
    const token = await abrirSessao(amb.juliana.id, AGORA, amb.db);
    expect((await lerSessao(token, AGORA + 1000, amb.db)).usuario?.trocarSenha).toBe(false);
    const [u] = await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.juliana.id));
    expect(u.senhaProvisoriaExpiraEm).toBeNull();
    // Passado o prazo, a nova senha continua valendo.
    expect((await entrar(amb.juliana.email, nova, AGORA + 100 * H, amb.db)).ok).toBe(true);
  });

  test("igual à provisória é recusada; validações de senha valem", async () => {
    const senha = await gerar(amb.juliana.id);
    const r = await trocarSenhaObrigatoria(amb.juliana.id, senha, senha, amb.db);
    expect(r).toEqual({ ok: false, erros: { nova: "Use uma senha diferente da provisória." } });
    const curta = await trocarSenhaObrigatoria(amb.juliana.id, "abc", "abc", amb.db);
    expect(curta.ok === false && curta.erros.nova).toBeTruthy();
    const dif = await trocarSenhaObrigatoria(amb.juliana.id, `${amb.senha}-x`, "outra", amb.db);
    expect(dif.ok === false && dif.erros.confirmacao).toBeTruthy();
  });

  test("trocarSenhaObrigatoria exige a flag", async () => {
    const r = await trocarSenhaObrigatoria(amb.mariana.id, `${amb.senha}-x`, `${amb.senha}-x`, amb.db);
    expect(r.ok).toBe(false);
    expect(await conferirSenha(amb.senha, (await amb.db.select().from(usuarios).where(eq(usuarios.id, amb.mariana.id)))[0].senhaHash)).toBe(true);
  });

  test("só ADMIN, nunca para si nem para ADMIN; desativado recusa", async () => {
    expect(await definirSenhaProvisoria(amb.mariana, amb.ricardo.id, AGORA, amb.db)).toEqual({ ok: false, erro: "proibido" });
    expect(await definirSenhaProvisoria(amb.admin, amb.admin.id, AGORA, amb.db)).toEqual({ ok: false, erro: "proibido" });
    expect(await definirSenhaProvisoria(amb.admin, amb.paulo.id, AGORA, amb.db)).toEqual({ ok: false, erro: "desativado" });
    expect(await definirSenhaProvisoria(amb.admin, "nao-e-uuid", AGORA, amb.db)).toEqual({ ok: false, erro: "inexistente" });
  });

  test("gerar de novo derruba sessões, tokens e bloqueio do usuário", async () => {
    const token = await abrirSessao(amb.ricardo.id, AGORA, amb.db);
    await amb.db.insert(tentativasLogin).values({ email: amb.ricardo.email, falhas: 3, bloqueadoAte: null });
    await gerar(amb.ricardo.id);
    expect((await lerSessao(token, AGORA + 1000, amb.db)).usuario).toBeNull();
    expect(await amb.db.select().from(tentativasLogin).where(eq(tentativasLogin.email, amb.ricardo.email))).toHaveLength(0);
    expect(await amb.db.select().from(tokensSenha).where(eq(tokensSenha.usuarioId, amb.ricardo.id))).toHaveLength(0);
  });

  test("definirSenha por link de redefinição encerra o regime da provisória", async () => {
    await gerar(amb.mariana.id);
    const token = await criarToken(amb.db, amb.mariana.id, "redefinicao", AGORA);
    const nova = `${amb.senha}-link`;
    expect((await definirSenha(token, nova, nova, AGORA + 1000, amb.db)).ok).toBe(true);
    expect((await entrar(amb.mariana.email, nova, AGORA + 73 * H, amb.db)).ok).toBe(true);
    const sessao = await abrirSessao(amb.mariana.id, AGORA + 73 * H, amb.db);
    expect((await lerSessao(sessao, AGORA + 73 * H, amb.db)).usuario?.trocarSenha).toBe(false);
  });

  test("trocarSenha (Minha conta) encerra o regime da provisória", async () => {
    const provisoria = await gerar(amb.mariana.id);
    const nova = `${amb.senha}-conta`;
    expect(await trocarSenha(amb.mariana.id, provisoria, nova, nova, amb.db)).toEqual({ ok: true });
    expect((await entrar(amb.mariana.email, nova, AGORA + 73 * H, amb.db)).ok).toBe(true);
    const sessao = await abrirSessao(amb.mariana.id, AGORA + 73 * H, amb.db);
    expect((await lerSessao(sessao, AGORA + 73 * H, amb.db)).usuario?.trocarSenha).toBe(false);
  });

  test("uuid bem formado que não existe é inexistente", async () => {
    expect(await definirSenhaProvisoria(amb.admin, "00000000-0000-4000-8000-000000000000", AGORA, amb.db)).toEqual({ ok: false, erro: "inexistente" });
  });
});
