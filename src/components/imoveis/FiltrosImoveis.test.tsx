import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import type { Filtros } from "@/lib/imoveis/filtros";
import { FiltrosImoveis } from "./FiltrosImoveis";

const localizacoes = [
  { cidade: "Belo Horizonte", bairros: ["Belvedere", "Lourdes", "Savassi"] },
  { cidade: "Nova Lima", bairros: ["Vale do Sereno", "Vila da Serra"] },
];
const tipos = [
  { tipo: "Apartamento", total: 3 },
  { tipo: "Cobertura", total: 1 },
];

function montar(filtros: Filtros = { pagina: 1 }, extra: Partial<ComponentProps<typeof FiltrosImoveis>> = {}) {
  const onAplicar = vi.fn();
  const props = { onAplicar, localizacoes, tipos, temLancamentos: true, ...extra };
  const r = render(<FiltrosImoveis filtros={filtros} {...props} />);
  const avancados = () => r.container.querySelector("details")!;
  return { onAplicar, avancados, unmount: r.unmount, trocar: (f: Filtros) => r.rerender(<FiltrosImoveis filtros={f} {...props} />) };
}

const textos = (select: HTMLElement, grupo?: string) =>
  [...select.querySelectorAll(grupo ? `optgroup[label="${grupo}"] option` : "option")].map((o) => o.textContent);

describe("FiltrosImoveis > filtros principais", () => {
  test("mostra Tipo, Cidade, Bairro e Quartos fora dos avançados", async () => {
    const { onAplicar, avancados } = montar();
    for (const rotulo of ["Tipo de imóvel", "Cidade", "Bairro", "Quartos"]) {
      const campo = screen.getByLabelText(rotulo);
      expect(campo.tagName).toBe("SELECT");
      expect(avancados().contains(campo)).toBe(false);
    }
    expect(avancados().open).toBe(false);
    // O tipo lista só os que têm imóvel.
    expect(textos(screen.getByLabelText("Tipo de imóvel"))).toEqual(["Todos os tipos", "Apartamento", "Cobertura"]);
    expect(textos(screen.getByLabelText("Cidade"))).toEqual(["Todas as cidades", "Belo Horizonte", "Nova Lima"]);

    await userEvent.selectOptions(screen.getByLabelText("Tipo de imóvel"), "Cobertura");
    expect(onAplicar).toHaveBeenLastCalledWith({ tipo: "Cobertura", pagina: 1 });
    await userEvent.selectOptions(screen.getByLabelText("Quartos"), "3+");
    expect(onAplicar).toHaveBeenLastCalledWith({ quartos: "3", pagina: 1 });
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit");
  });

  test("Cidade e Bairro gravam `local`; o bairro lista só os da cidade escolhida", async () => {
    const { onAplicar, unmount } = montar({ pagina: 4 });
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "Nova Lima");
    expect(onAplicar).toHaveBeenLastCalledWith({ local: "Nova Lima", pagina: 1 });
    // Sem cidade, os bairros vêm agrupados por cidade.
    expect(textos(screen.getByLabelText("Bairro"), "Nova Lima")).toEqual(["Vale do Sereno", "Vila da Serra"]);
    await userEvent.selectOptions(screen.getByLabelText("Bairro"), "Savassi, Belo Horizonte");
    expect(onAplicar).toHaveBeenLastCalledWith({ local: "Savassi, Belo Horizonte", pagina: 1 });
    unmount();

    // Bairro na URL: a cidade dele aparece escolhida, e "Todos os bairros" volta para a cidade.
    const b = montar({ local: "Vila da Serra, Nova Lima", pagina: 1 });
    expect(screen.getByLabelText("Cidade")).toHaveDisplayValue("Nova Lima");
    expect(screen.getByLabelText("Bairro")).toHaveDisplayValue("Vila da Serra");
    expect(textos(screen.getByLabelText("Bairro"), "Belo Horizonte")).toEqual([]);
    await userEvent.selectOptions(screen.getByLabelText("Bairro"), "");
    expect(b.onAplicar).toHaveBeenLastCalledWith({ local: "Nova Lima", pagina: 1 });
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "");
    expect(b.onAplicar).toHaveBeenLastCalledWith({ pagina: 1 });
  });

  test("Bairro tem o grupo Regiões com os pares e escolher um grava regiao", async () => {
    const { onAplicar, unmount } = montar({ local: "Lourdes, Belo Horizonte", quartos: "3", pagina: 2 });
    // Só os pares (regiões que juntam bairros diferentes com imóvel) que passam pela cidade escolhida (BH).
    expect(textos(screen.getByLabelText("Bairro"), "Regiões")).toEqual(["Lourdes e Savassi"]);
    await userEvent.selectOptions(screen.getByLabelText("Bairro"), "Lourdes e Savassi");
    expect(onAplicar).toHaveBeenLastCalledWith({ regiao: "lourdes-savassi", local: undefined, quartos: "3", pagina: 1 });
    expect(onAplicar.mock.lastCall![0].local).toBeUndefined();
    unmount();

    // Região na URL: aparece escolhida; trocar por um bairro ou por uma cidade tira a região.
    const r = montar({ regiao: "lourdes-savassi", pagina: 1 });
    expect(screen.getByLabelText("Bairro")).toHaveDisplayValue("Lourdes e Savassi");
    expect(screen.getByLabelText("Cidade")).toHaveDisplayValue("Todas as cidades");
    await userEvent.selectOptions(screen.getByLabelText("Bairro"), "Savassi, Belo Horizonte");
    expect(r.onAplicar).toHaveBeenLastCalledWith({ local: "Savassi, Belo Horizonte", pagina: 1 });
    expect(r.onAplicar.mock.lastCall![0].regiao).toBeUndefined();
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "Nova Lima");
    expect(r.onAplicar).toHaveBeenLastCalledWith({ local: "Nova Lima", pagina: 1 });
    expect(r.onAplicar.mock.lastCall![0].regiao).toBeUndefined();
    r.unmount();

    // Com cidade escolhida, só as regiões que passam por ela.
    const nl = montar({ local: "Nova Lima", pagina: 1 });
    expect(textos(screen.getByLabelText("Bairro"), "Regiões")).toEqual(["Vale do Sereno e Vila da Serra"]);
    nl.unmount();

    // Com imóvel em um bairro só do par, a região seria igual ao bairro: não é oferecida.
    montar({ pagina: 1 }, { localizacoes: [{ cidade: "Nova Lima", bairros: ["Alphaville Lagoa dos Ingleses", "Vila da Serra"] }] });
    expect(textos(screen.getByLabelText("Bairro"), "Regiões")).toEqual([]);
  });
});

describe("FiltrosImoveis > antes da hidratação", () => {
  const ocultoRegiao = () => document.querySelector<HTMLInputElement>('form input[type="hidden"][name="regiao"]');

  test("com região escolhida, o Buscar envia `regiao` num campo oculto", () => {
    const { unmount } = montar({ regiao: "vale-do-sereno-vila-da-serra", pagina: 1 });
    expect(ocultoRegiao()).toHaveValue("vale-do-sereno-vila-da-serra");
    // É o que um GET nativo do formulário enviaria: a região chega em `regiao`, que `lerFiltros` entende.
    const enviado = new FormData(document.querySelector("form")!);
    expect(enviado.get("regiao")).toBe("vale-do-sereno-vila-da-serra");
    unmount();

    montar({ local: "Nova Lima", pagina: 1 });
    expect(ocultoRegiao()).toBeNull();
  });
});

describe("FiltrosImoveis > filtros avançados", () => {
  test("preço, área, vagas, suítes, texto, características e ordenação ficam em Filtros avançados", async () => {
    const { onAplicar, avancados } = montar({ finalidade: "comprar", pagina: 2 });
    const dentro = within(avancados());
    expect(avancados().querySelector("summary")).toHaveTextContent("Filtros avançados");
    for (const rotulo of ["Preço", "Área", "Vagas", "Suítes", "Ordenar por"]) expect(dentro.getByLabelText(rotulo).tagName).toBe("SELECT");
    expect(dentro.getByLabelText("Código ou texto")).toHaveAttribute("name", "q");
    expect(within(dentro.getByRole("group", { name: "Características" })).getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Piscina",
      "Academia",
      "Área gourmet",
      "Varanda",
      "Mobiliado",
      "Condomínio fechado",
    ]);

    await userEvent.selectOptions(dentro.getByLabelText("Preço"), "R$ 3 a 6 milhões");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", preco: "3m-6m", pagina: 1 });
    await userEvent.selectOptions(dentro.getByLabelText("Área"), "200 a 400 m²");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", area: "200-400", pagina: 1 });
    await userEvent.selectOptions(dentro.getByLabelText("Vagas"), "2+");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", vagas: "2", pagina: 1 });
    await userEvent.selectOptions(dentro.getByLabelText("Suítes"), "4+");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", suites: "4", pagina: 1 });
    await userEvent.selectOptions(dentro.getByLabelText("Ordenar por"), "Maior preço");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", ordem: "maior-preco", pagina: 1 });
    await userEvent.click(dentro.getByRole("button", { name: "Piscina" }));
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", carac: ["piscina"], pagina: 1 });
    // O texto só vale ao enviar (Enter ou Buscar).
    await userEvent.type(dentro.getByLabelText("Código ou texto"), " CZ1009 {Enter}");
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", q: "CZ1009", pagina: 1 });
    await userEvent.click(dentro.getByRole("button", { name: "Limpar filtros" }));
    expect(onAplicar).toHaveBeenLastCalledWith({ pagina: 1 });
  });

  test("característica marcada aparece pressionada e sai ao clicar; sem finalidade o preço fica desabilitado", async () => {
    const { onAplicar } = montar({ carac: ["piscina", "varanda"], ordem: "menor-preco", pagina: 1 });
    expect(screen.getByRole("button", { name: "Piscina" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("button", { name: "Academia" })).toHaveAttribute("aria-pressed", "false");
    await userEvent.click(screen.getByRole("button", { name: "Piscina" }));
    expect(onAplicar).toHaveBeenLastCalledWith({ carac: ["varanda"], ordem: "menor-preco", pagina: 1 });
    expect(screen.getByLabelText("Ordenar por")).toHaveDisplayValue("Menor preço");
    expect(screen.getByLabelText("Preço")).toBeDisabled();
    expect(screen.getByLabelText("Preço")).toHaveAccessibleDescription("Escolha Comprar ou Alugar");
  });

  test("avançados abre sozinho quando a URL tem algum filtro avançado", () => {
    const comAvancado: Filtros[] = [
      { finalidade: "comprar", preco: "3m-6m", pagina: 1 },
      { area: "200-400", pagina: 1 },
      { vagas: "2", pagina: 1 },
      { suites: "1", pagina: 1 },
      { q: "CZ1009", pagina: 1 },
      { carac: ["piscina"], pagina: 1 },
      { ordem: "maior-area", pagina: 1 },
    ];
    for (const f of comAvancado) {
      const { avancados, unmount } = montar(f);
      expect(avancados().open, JSON.stringify(f)).toBe(true);
      unmount();
    }
    // Filtro principal não abre; `avancados=1` (link da Home) abre.
    const principal = montar({ finalidade: "alugar", tipo: "Cobertura", local: "Nova Lima", quartos: "3", pagina: 2 });
    expect(principal.avancados().open).toBe(false);
    // A URL ganhou um filtro avançado depois (Voltar do navegador): abre.
    principal.trocar({ finalidade: "alugar", vagas: "2", pagina: 1 });
    expect(principal.avancados().open).toBe(true);
    // E não fecha sozinho quando o filtro sai.
    principal.trocar({ finalidade: "alugar", pagina: 1 });
    expect(principal.avancados().open).toBe(true);
    principal.unmount();
    const regiao = montar({ regiao: "lourdes-savassi", pagina: 1 });
    expect(regiao.avancados().open).toBe(false);
    regiao.unmount();
    expect(montar({ pagina: 1 }, { avancados: true }).avancados().open).toBe(true);
  });
});

describe("FiltrosImoveis > finalidade", () => {
  const abas = () => within(screen.getByRole("navigation", { name: "Finalidade" })).getAllByRole("link");

  test("abas Comprar, Alugar e Lançamentos são links para o grid; a atual fica marcada", async () => {
    const { onAplicar } = montar({ finalidade: "alugar", preco: "10k-30k", tipo: "Casa", pagina: 3 });
    expect(abas().map((a) => a.textContent)).toEqual(["Comprar", "Alugar", "Lançamentos"]);
    expect(screen.getByRole("link", { name: "Alugar" })).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: "Comprar" })).not.toHaveAttribute("aria-current");
    // Sem JavaScript o link já leva ao grid certo (a faixa de preço de aluguel não vale para compra).
    expect(screen.getByRole("link", { name: "Comprar" })).toHaveAttribute("href", "/imoveis?finalidade=comprar&tipo=Casa");
    await userEvent.click(screen.getByRole("link", { name: "Comprar" }));
    expect(onAplicar).toHaveBeenLastCalledWith({ finalidade: "comprar", preco: undefined, tipo: "Casa", pagina: 1 });
  });

  test("Lançamentos só aparece com lançamento publicado ou quando a URL já pede", () => {
    const sem = montar({ pagina: 1 }, { temLancamentos: false });
    expect(abas().map((a) => a.textContent)).toEqual(["Comprar", "Alugar"]);
    sem.unmount();
    montar({ finalidade: "lancamentos", pagina: 1 }, { temLancamentos: false });
    expect(abas().map((a) => a.textContent)).toEqual(["Comprar", "Alugar", "Lançamentos"]);
  });
});
