import { beforeEach, describe, expect, test, vi } from "vitest";
import { banco, reiniciarBanco } from "@/lib/dados/banco";
import { SENHA_DEMO } from "@/lib/dados/semente";
import { oportunidadeDeHoje } from "@/lib/imoveis/catalogo";
import { convidar, definirSenha, desativar, entrar, lerSessao, abrirSessao, lerToken, pedirRedefinicao, reativar, trocarSenha } from "./contas";
import { avisoOportunidadeVazia, excluirImovel, guardarFoto, listarImoveis, obterParaEdicao, salvarImovel } from "./imoveis";
import type { EntradaImovel, UsuarioLogado } from "./regras";

const admin: UsuarioLogado = { id: "u1", nome: "André Ziller", email: "andre@zillerimoveis.com.br", papel: "admin" };
const mariana: UsuarioLogado = { id: "u3", nome: "Mariana Costa", email: "mariana.costa@carneiroziller.com.br", papel: "corretor" };

const vazia: EntradaImovel = {
  finalidade: "", lancamento: false, tipo: "", titulo: "", bairro: "", cidade: "", uf: "MG",
  valor: "", area: "", quartos: "", vagas: "", descricao: "", fotos: [], situacao: "rascunho",
};
const completa: EntradaImovel = {
  ...vazia, finalidade: "venda", tipo: "Casa", titulo: "Casa no Sion", bairro: "Sion", cidade: "Belo Horizonte",
  valor: "2500000", area: "320", quartos: "4", descricao: "Casa ampla.\n\nPerto de tudo.",
};

beforeEach(() => {
  reiniciarBanco();
  vi.spyOn(console, "info").mockImplementation(() => {});
});

describe("cadastro de imóvel", () => {
  test("rascunho salva incompleto e não aparece no site", () => {
    const r = salvarImovel(mariana, null, vazia, "rascunho");
    expect(r).toMatchObject({ ok: true, codigo: "CZ1036", situacao: "rascunho", novo: true });
    expect(banco().imoveis.get("cz1036")?.responsavelId).toBe("u3");
    expect(banco().imoveis.get("cz1036")?.publicadoEm).toBeNull();
  });

  test("publicar exige os obrigatórios, com a mensagem de cada campo", () => {
    const r = salvarImovel(mariana, null, { ...vazia, finalidade: "locacao" }, "publicar");
    expect(r.ok).toBe(false);
    if (r.ok || !("erros" in r)) return;
    expect(Object.keys(r.erros).sort()).toEqual(["area", "bairro", "cidade", "descricao", "tipo", "titulo", "valor"]);
    expect(r.erros.valor).toBe("Informe o valor mensal.");
    expect(banco().imoveis.has("cz1036")).toBe(false);
  });

  test("publicar grava a data da primeira publicação, que não muda ao editar", () => {
    const r = salvarImovel(mariana, null, completa, "publicar", new Date("2026-10-21T12:00:00Z"));
    if (!r.ok) throw new Error("esperava ok");
    salvarImovel(mariana, r.id, { ...completa, titulo: "Casa reformada no Sion", situacao: "publicado" }, "salvar", new Date("2026-10-22T12:00:00Z"));
    const reg = banco().imoveis.get(r.id)!;
    expect(reg.publicadoEm).toBe("2026-10-21T12:00:00.000Z");
    expect(reg.alteradoEm).toBe("2026-10-22T12:00:00.000Z");
    expect(reg.descricao).toBe("Casa ampla.\n\nPerto de tudo.");
  });

  test("Corretor edita só os próprios e não troca o responsável", () => {
    expect(salvarImovel(mariana, "cz1015", { ...completa, situacao: "publicado" }, "salvar")).toEqual({ ok: false, proibido: true });
    const r = salvarImovel(mariana, "cz1009", { ...obterParaEdicao(mariana, "cz1009")!.entrada, responsavelId: "u4" }, "salvar");
    expect(r.ok).toBe(true);
    expect(banco().imoveis.get("cz1009")?.responsavelId).toBe("u3");
    expect(listarImoveis(mariana).find((l) => l.id === "cz1015")?.podeEditar).toBe(false);
  });

  test("ADMIN troca o responsável", () => {
    salvarImovel(admin, "cz1015", { ...obterParaEdicao(admin, "cz1015")!.entrada, responsavelId: "u3" }, "salvar");
    expect(banco().imoveis.get("cz1015")?.responsavelId).toBe("u3");
  });

  test("só ADMIN exclui", () => {
    expect(excluirImovel(mariana, "cz1009")).toEqual({ ok: false });
    expect(excluirImovel(admin, "cz1026")).toMatchObject({ ok: true, codigo: "CZ1026", oportunidadeSaiu: false });
    expect(banco().imoveis.has("cz1026")).toBe(false);
  });

  test("fotos: tipo e tamanho conferidos; a ordem define a capa", () => {
    expect(guardarFoto(mariana, new Uint8Array(10), "image/gif", 10, 10)).toEqual({ ok: false, erro: "tipo" });
    const f = guardarFoto(mariana, new Uint8Array(10), "image/jpeg", 1600, 1200);
    if (!f.ok) throw new Error("esperava ok");
    const edicao = obterParaEdicao(mariana, "cz1009")!;
    salvarImovel(mariana, "cz1009", { ...edicao.entrada, fotos: [{ id: f.id, alt: "Fachada" }, ...edicao.entrada.fotos] }, "salvar");
    expect(banco().imoveis.get("cz1009")?.fotos[0]).toMatchObject({ src: `/fotos/${f.id}`, alt: "Fachada", largura: 1600 });
    const r = salvarImovel(mariana, "cz1009", { ...edicao.entrada, fotos: [{ id: "nao-existe", alt: "" }] }, "salvar");
    expect(r.ok).toBe(false);
  });
});

describe("Oportunidade de hoje", () => {
  test("ADMIN marca outro imóvel publicado e ele substitui o atual", () => {
    salvarImovel(admin, "cz1015", { ...obterParaEdicao(admin, "cz1015")!.entrada, oportunidade: true }, "salvar");
    expect(banco().oportunidadeId).toBe("cz1015");
    expect(oportunidadeDeHoje()?.codigo).toBe("CZ1015");
  });

  test("Corretor não muda a escolha", () => {
    salvarImovel(mariana, "cz1009", { ...obterParaEdicao(mariana, "cz1009")!.entrada, oportunidade: false }, "salvar");
    expect(banco().oportunidadeId).toBe("cz1009");
  });

  test("só imóvel publicado entra", () => {
    salvarImovel(admin, null, { ...completa, oportunidade: true }, "rascunho");
    expect(banco().oportunidadeId).toBe("cz1009");
  });

  test("Corretor tira o imóvel do ar: a seção some e o ADMIN é avisado", () => {
    const r = salvarImovel(mariana, "cz1009", { ...obterParaEdicao(mariana, "cz1009")!.entrada, situacao: "indisponivel" }, "salvar");
    expect(r).toMatchObject({ ok: true, oportunidadeSaiu: true });
    expect(oportunidadeDeHoje()).toBeNull();
    expect(avisoOportunidadeVazia(mariana)).toBeNull();
    const aviso = avisoOportunidadeVazia(admin);
    expect(aviso?.porNome).toBe("Mariana Costa");
    expect(aviso?.aviso).toMatchObject({ codigo: "CZ1009", motivo: "indisponivel" });
  });

  test("excluir o imóvel da Oportunidade de hoje esvazia a seção", () => {
    expect(excluirImovel(admin, "cz1009")).toMatchObject({ ok: true, oportunidadeSaiu: true });
    expect(avisoOportunidadeVazia(admin)?.aviso?.motivo).toBe("excluido");
    salvarImovel(admin, "cz1015", { ...obterParaEdicao(admin, "cz1015")!.entrada, oportunidade: true }, "salvar");
    expect(avisoOportunidadeVazia(admin)).toBeNull();
  });
});

describe("acesso", () => {
  test("e-mail ou senha errados: mensagem única; 5 erros bloqueiam por 15 minutos", () => {
    const agora = Date.parse("2026-10-21T12:00:00Z");
    expect(entrar("ninguem@x.com", "x", agora)).toEqual({ ok: false, erro: "credenciais" });
    for (let i = 0; i < 4; i++) expect(entrar(admin.email, "errada", agora).ok).toBe(false);
    expect(entrar(admin.email, "errada", agora)).toEqual({ ok: false, erro: "bloqueado" });
    expect(entrar(admin.email, SENHA_DEMO, agora + 60_000)).toEqual({ ok: false, erro: "bloqueado" });
    expect(entrar(admin.email, SENHA_DEMO, agora + 16 * 60_000).ok).toBe(true);
  });

  test("convite pendente e desativado não entram", () => {
    expect(entrar("juliana.prado@carneiroziller.com.br", SENHA_DEMO).ok).toBe(false);
    expect(entrar("paulo.menezes@carneiroziller.com.br", SENHA_DEMO).ok).toBe(false);
    expect(entrar(" Mariana.Costa@carneiroziller.com.br ", SENHA_DEMO).ok).toBe(true);
  });

  test("sessão ociosa expira", () => {
    const t = abrirSessao("u3", 0);
    expect(lerSessao(t, 60 * 60_000).usuario?.id).toBe("u3");
    expect(lerSessao(t, 60 * 60_000 + 121 * 60_000)).toEqual({ usuario: null, motivo: "expirada" });
  });

  test("esqueci a senha só envia para conta ativa; o link vale uma vez", () => {
    pedirRedefinicao("ninguem@x.com");
    pedirRedefinicao("paulo.menezes@carneiroziller.com.br");
    expect(banco().caixaSaida).toHaveLength(0);
    pedirRedefinicao("mariana.costa@carneiroziller.com.br");
    const token = new URL(banco().caixaSaida[0].link).searchParams.get("token")!;
    expect(lerToken(token)).toMatchObject({ valido: true, tipo: "redefinicao" });
    expect(definirSenha(token, "curta", "curta")).toEqual({ ok: false, erros: { nova: "A senha precisa ter pelo menos 10 caracteres." } });
    expect(definirSenha(token, "nova-senha-123", "outra-senha-123")).toMatchObject({ ok: false, erros: { confirmacao: expect.any(String) } });
    expect(definirSenha(token, "nova-senha-123", "nova-senha-123")).toMatchObject({ ok: true });
    expect(lerToken(token)).toEqual({ valido: false, tipo: "redefinicao" });
    expect(entrar(mariana.email, "nova-senha-123").ok).toBe(true);
  });

  test("link de redefinição expira em 1 hora", () => {
    pedirRedefinicao(mariana.email, 0);
    const token = new URL(banco().caixaSaida[0].link).searchParams.get("token")!;
    expect(lerToken(token, 61 * 60_000)).toEqual({ valido: false, tipo: "redefinicao" });
  });
});

describe("usuários", () => {
  test("convidado entra como Corretor pendente e ativa ao criar a senha", () => {
    const r = convidar(admin, "Fernanda Lima", "Fernanda.Lima@carneiroziller.com.br");
    if (!r.ok) throw new Error("esperava ok");
    expect(r.usuario).toMatchObject({ papel: "corretor", situacao: "pendente", email: "fernanda.lima@carneiroziller.com.br" });
    const token = new URL(banco().caixaSaida.at(-1)!.link).searchParams.get("token")!;
    expect(lerToken(token)).toMatchObject({ valido: true, tipo: "convite" });
    definirSenha(token, "senha-da-fernanda", "senha-da-fernanda");
    expect(entrar("fernanda.lima@carneiroziller.com.br", "senha-da-fernanda").ok).toBe(true);
  });

  test("e-mail já cadastrado", () => {
    const r = convidar(admin, "Paulo", "paulo.menezes@carneiroziller.com.br");
    expect(r.ok).toBe(false);
    if (r.ok) return;
    expect(r.erros.email).toContain("Paulo Menezes (desativado)");
  });

  test("ADMIN não desativa a si mesmo; desativar derruba a sessão e mantém os imóveis", () => {
    expect(desativar(admin, "u1")).toBe(false);
    const t = abrirSessao("u3");
    expect(desativar(admin, "u3")).toBe(true);
    expect(lerSessao(t).usuario).toBeNull();
    expect(banco().imoveis.get("cz1009")?.responsavelId).toBe("u3");
    expect(reativar("u3")).toBe(true);
    expect(banco().usuarios.get("u3")?.situacao).toBe("ativo");
  });

  test("trocar senha confere a atual", () => {
    expect(trocarSenha("u3", "errada", "nova-senha-2027", "nova-senha-2027")).toEqual({ ok: false, erros: { atual: "A senha atual está incorreta." } });
    expect(trocarSenha("u3", SENHA_DEMO, "nova-senha-2027", "nova-senha-2027")).toEqual({ ok: true });
  });
});
