import { render, screen, within } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import type { LinhaTela } from "./ListaContatos";
import { ListaContatos } from "./ListaContatos";

const base = { criadoEm: new Date("2026-11-04T13:30:00Z"), data: "04/11/2026", hora: "10h30", origem: "site", observacoes: "" };
const comImovel: LinhaTela = {
  ...base,
  id: "a",
  nome: "Carla Souza",
  telefone: "+5531999998888",
  email: "carla@x.test",
  observacoes: "Posso visitar sábado?",
  codigo: "CZ1241",
  pagina: "/imovel/cz1241?de=x",
  imovel: { id: "cz1241", codigo: "CZ1241", titulo: "Casa" },
};
const geral: LinhaTela = { ...base, id: "b", nome: "Beto Lima", telefone: "+5531988887777", email: "beto@x.test", codigo: "", pagina: "https://evil.test/x", imovel: null };
const excluido: LinhaTela = { ...geral, id: "c", nome: "Duda", codigo: "CZ1100" };

const props = { total: 2, pagina: 1, paginas: 1, porPagina: 30 };
// Tabela (desktop) e cartões (<1280px) coexistem no DOM; os testes olham a tabela.
const tabela = () => screen.getByRole("table", { hidden: true });
const linhaDe = (nome: string) => within(tabela()).getByText(nome).closest("tr")!;

describe("ListaContatos", () => {
  test("linha de imóvel: data, hora, contato, observações, imóvel e página de origem", () => {
    render(<ListaContatos linhas={[comImovel, geral]} {...props} />);
    const tr = linhaDe("Carla Souza");
    expect(within(tr).getByText("04/11/2026")).toBeTruthy();
    expect(within(tr).getByText("10h30")).toBeTruthy();
    expect(within(tr).getByRole("link", { name: "+5531999998888" }).getAttribute("href")).toBe("tel:+5531999998888");
    expect(within(tr).getByRole("link", { name: /WhatsApp/ }).getAttribute("href")).toBe("https://wa.me/5531999998888");
    expect(within(tr).getByRole("link", { name: "carla@x.test" }).getAttribute("href")).toBe("mailto:carla@x.test");
    expect(within(tr).getByText("Posso visitar sábado?")).toBeTruthy();
    expect(within(tr).getByRole("link", { name: "CZ1241" }).getAttribute("href")).toBe("/painel/imoveis/cz1241");
    expect(within(tr).getByText("/imovel/cz1241?de=x")).toBeTruthy();
  });

  test("contato geral e imóvel excluído em texto; página de origem nunca é link", () => {
    render(<ListaContatos linhas={[geral, excluido]} {...props} />);
    const tr = linhaDe("Beto Lima");
    expect(within(tr).getByText("Contato geral")).toBeTruthy();
    expect(within(tr).getByText("https://evil.test/x")).toBeTruthy();
    expect(within(tr).queryByRole("link", { name: /evil/ })).toBeNull();
    expect(tr.querySelector('a[href*="evil"]')).toBeNull();
    const td = linhaDe("Duda");
    expect(within(td).getByText("CZ1100 (excluído)")).toBeTruthy();
    expect(within(td).queryByRole("link", { name: /CZ1100/ })).toBeNull();
  });

  test("sem linhas: mensagem vazia", () => {
    render(<ListaContatos linhas={[]} total={0} pagina={1} paginas={1} porPagina={30} />);
    expect(screen.getByText("Nenhum contato recebido ainda.")).toBeTruthy();
    expect(screen.queryByRole("table", { hidden: true })).toBeNull();
  });

  test("paginação por links ?pagina=", () => {
    render(<ListaContatos linhas={[comImovel]} total={65} pagina={2} paginas={3} porPagina={30} />);
    const nav = screen.getByRole("navigation", { name: "Paginação" });
    expect(within(nav).getByRole("link", { name: "Página anterior" }).getAttribute("href")).toBe("/painel/contatos?pagina=1");
    expect(within(nav).getByRole("link", { name: "Próxima página" }).getAttribute("href")).toBe("/painel/contatos?pagina=3");
    expect(within(nav).getByRole("link", { name: "Página 2" }).getAttribute("aria-current")).toBe("page");
    expect(screen.getByText("31–31")).toBeTruthy();
  });
});
