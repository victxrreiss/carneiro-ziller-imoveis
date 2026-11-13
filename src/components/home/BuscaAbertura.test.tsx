import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { lerFiltros } from "@/lib/imoveis/filtros";
import { BuscaAbertura } from "./BuscaAbertura";

// next/form depende do router do App Router; aqui basta o <form> nativo,
// que é exatamente o que ele renderiza.
vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

const tipos = ["Apartamento", "Cobertura", "Casa em condomínio"];
const locais = [
  { cidade: "Belo Horizonte", bairros: ["Belvedere", "Lourdes"] },
  { cidade: "Nova Lima", bairros: ["Belvedere", "Vila da Serra"] },
];

function busca(temLancamentos = true) {
  return render(<BuscaAbertura temLancamentos={temLancamentos} tipos={tipos} locais={locais} />);
}

function enviado() {
  const form = screen.getByRole("search") as HTMLFormElement;
  return Object.fromEntries(new FormData(form));
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
});
