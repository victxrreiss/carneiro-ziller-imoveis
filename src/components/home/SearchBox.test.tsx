import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ComponentProps } from "react";
import { describe, expect, test, vi } from "vitest";
import { SearchBox } from "./SearchBox";

// next/form depende do router do App Router; aqui basta o <form> nativo,
// que é exatamente o que ele renderiza.
vi.mock("next/form", () => ({
  default: (props: ComponentProps<"form">) => <form {...props} />,
}));

function formValues() {
  const form = screen.getByRole("search") as HTMLFormElement;
  return Object.fromEntries(new FormData(form));
}

describe("SearchBox", () => {
  test("envia para /imoveis com finalidade comprar por padrão", () => {
    render(<SearchBox />);
    expect(screen.getByRole("search")).toHaveAttribute("action", "/imoveis");
    expect(formValues()).toEqual({ finalidade: "comprar", q: "" });
  });

  test("trocar a aba muda a finalidade enviada", async () => {
    render(<SearchBox />);
    await userEvent.click(screen.getByRole("tab", { name: "ALUGAR" }));
    expect(formValues().finalidade).toBe("alugar");
    await userEvent.click(screen.getByRole("tab", { name: "LANÇAMENTOS" }));
    expect(formValues().finalidade).toBe("lancamentos");
  });

  test("campo rotulado, com nome q e limite de tamanho", async () => {
    render(<SearchBox />);
    const input = screen.getByLabelText("Buscar imóvel");
    expect(input).toHaveAttribute("name", "q");
    expect(input).toHaveAttribute("maxLength", "120");
    await userEvent.type(input, "Vila & Serra #1");
    expect(formValues().q).toBe("Vila & Serra #1");
  });

  test("botão de envio acessível e link de busca avançada", () => {
    render(<SearchBox />);
    expect(screen.getByRole("button", { name: "Buscar" })).toHaveAttribute("type", "submit");
    expect(screen.getByRole("link", { name: /Busca avançada/ })).toHaveAttribute("href", "/imoveis");
  });
});
