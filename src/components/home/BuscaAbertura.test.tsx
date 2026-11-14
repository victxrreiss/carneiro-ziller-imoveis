import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, test, vi } from "vitest";
import { lerFiltros } from "@/lib/imoveis/filtros";
import { BuscaAbertura } from "./BuscaAbertura";

// next/form depende do router do App Router; aqui basta o <form> nativo,
// que é exatamente o que ele renderiza.
vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const tipos = ["Apartamento", "Cobertura", "Casa em condomínio"];
const locais = [
  { cidade: "Belo Horizonte", bairros: ["Belvedere", "Lourdes"] },
  { cidade: "Nova Lima", bairros: ["Belvedere", "Vila da Serra"] },
];

function busca(temLancamentos = true) {
  return render(<BuscaAbertura temLancamentos={temLancamentos} tipos={tipos} locais={locais} />);
}

/** Toca em Buscar e devolve os parâmetros da URL para onde a busca navegou. */
function enviado() {
  push.mockClear();
  fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
  expect(push).toHaveBeenCalledTimes(1);
  const url = new URL(push.mock.calls[0][0], "http://localhost");
  expect(url.pathname).toBe("/imoveis");
  return Object.fromEntries(url.searchParams);
}

describe("BuscaAbertura", () => {
  test("busca da abertura é um form GET para /imoveis com tipo, local, quartos e finalidade", async () => {
    busca();
    const form = screen.getByRole("search") as HTMLFormElement;
    expect(form).toHaveAttribute("action", "/imoveis");
    expect(form.method).toBe("get");
    // Nada escolhido: só a finalidade, sem parâmetros vazios na URL.
    expect(enviado()).toEqual({ finalidade: "comprar" });

    await userEvent.click(screen.getByRole("tab", { name: "Alugar" }));
    await userEvent.selectOptions(screen.getByLabelText("Tipo de imóvel"), "Cobertura");
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "Nova Lima");
    await userEvent.selectOptions(screen.getByLabelText("Bairro"), "Vila da Serra");
    await userEvent.selectOptions(screen.getByLabelText("Quartos"), "3+");

    const dados = enviado();
    expect(dados).toEqual({ finalidade: "alugar", tipo: "Cobertura", local: "Vila da Serra, Nova Lima", quartos: "3" });
    // São os parâmetros que o grid entende.
    expect(lerFiltros(dados as Record<string, string>)).toEqual({
      finalidade: "alugar",
      tipo: "Cobertura",
      local: "Vila da Serra, Nova Lima",
      quartos: "3",
      pagina: 1,
    });
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit");
  });

  test("só a cidade escolhida: local é a cidade, e o bairro lista só os dela", async () => {
    busca();
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "Belo Horizonte");
    expect(enviado().local).toBe("Belo Horizonte");
    const bairros = [...(screen.getByLabelText("Bairro") as HTMLSelectElement).options].map((o) => o.textContent);
    expect(bairros).toEqual(["Todos os bairros", "Belvedere", "Lourdes"]);
  });

  test("bairro escolhido sem cidade leva a cidade junto; trocar de cidade limpa o bairro de outra", async () => {
    busca();
    const bairro = screen.getByLabelText("Bairro") as HTMLSelectElement;
    await userEvent.selectOptions(bairro, "Lourdes, Belo Horizonte");
    expect(enviado().local).toBe("Lourdes, Belo Horizonte");
    await userEvent.selectOptions(screen.getByLabelText("Cidade"), "Nova Lima");
    expect(enviado().local).toBe("Nova Lima");
    expect(bairro.value).toBe("");
  });

  test("escolha que só chegou ao DOM (antes da hidratação) continua indo na busca", () => {
    busca();
    const select = (rotulo: string) => screen.getByLabelText(rotulo) as HTMLSelectElement;
    // Depois da hidratação nenhum select perde o name: é o DOM que vai na URL, não o estado.
    expect(screen.getAllByRole("combobox").map((s) => s.getAttribute("name"))).toEqual(["tipo", "local", "local", "quartos"]);
    // Valor posto direto no DOM, sem evento de change (o React não fica sabendo).
    select("Tipo de imóvel").value = "Cobertura";
    select("Cidade").value = "Nova Lima";
    select("Quartos").value = "3";
    expect(enviado()).toEqual({ finalidade: "comprar", tipo: "Cobertura", local: "Nova Lima", quartos: "3" });

    // Bairro também só no DOM: vale o bairro, que já leva a cidade.
    select("Bairro").value = "Vila da Serra, Nova Lima";
    expect(enviado()).toEqual({ finalidade: "comprar", tipo: "Cobertura", local: "Vila da Serra, Nova Lima", quartos: "3" });
  });

  test("Filtros avançados leva a /imoveis com o painel aberto", () => {
    busca();
    expect(screen.getByRole("link", { name: /Filtros avançados/ })).toHaveAttribute("href", "/imoveis?avancados=1");
  });

  test("aba Lançamentos só aparece com lançamento publicado", async () => {
    const { unmount } = busca(false);
    expect(screen.getByRole("tab", { name: "Comprar" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "Alugar" })).toBeInTheDocument();
    expect(screen.queryByRole("tab", { name: "Lançamentos" })).not.toBeInTheDocument();
    unmount();

    busca(true);
    await userEvent.click(screen.getByRole("tab", { name: "Lançamentos" }));
    expect(enviado().finalidade).toBe("lancamentos");
  });

  test("sem JavaScript, o HTML do servidor já envia tipo, local e quartos", () => {
    const html = renderToString(<BuscaAbertura temLancamentos tipos={tipos} locais={locais} />);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const form = doc.querySelector("form")!;
    expect(form.getAttribute("action")).toBe("/imoveis");
    const selects = [...form.querySelectorAll("select")];
    expect(selects.map((s) => s.getAttribute("name"))).toEqual(["tipo", "local", "local", "quartos"]);
    const [tipo, cidade, bairro, quartos] = selects;
    const url = () => new URLSearchParams([...new FormData(form)].map(([k, v]) => [k, String(v)]));

    // Nada escolhido: os vazios vão na URL e o grid os descarta.
    expect(lerFiltros(url())).toEqual({ finalidade: "comprar", pagina: 1 });

    // Só a cidade.
    tipo.value = "Cobertura";
    cidade.value = "Nova Lima";
    quartos.value = "3";
    expect(lerFiltros(url())).toEqual({ finalidade: "comprar", tipo: "Cobertura", local: "Nova Lima", quartos: "3", pagina: 1 });

    // Cidade e bairro: vale o bairro, que já leva a cidade dele.
    bairro.value = "Vila da Serra, Nova Lima";
    expect(url().getAll("local")).toEqual(["Nova Lima", "Vila da Serra, Nova Lima"]);
    expect(lerFiltros(url()).local).toBe("Vila da Serra, Nova Lima");

    // Só o bairro.
    cidade.value = "";
    expect(lerFiltros(url()).local).toBe("Vila da Serra, Nova Lima");
  });
});
