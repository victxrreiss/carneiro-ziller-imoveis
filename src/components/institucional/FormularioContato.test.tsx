import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import { FormularioContato } from "./FormularioContato";

async function preencher() {
  await userEvent.type(screen.getByLabelText(/NOME/), "Mariana Duarte");
  await userEvent.type(screen.getByLabelText(/TELEFONE/), "31998765432");
  await userEvent.type(screen.getByLabelText(/E-MAIL/), "mariana.duarte@email.com");
  await userEvent.type(screen.getByLabelText(/MENSAGEM/), "Quero vender meu apartamento.");
}

const enviar = () => userEvent.click(screen.getByRole("button", { name: "ENVIAR MENSAGEM" }));

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("Formulário de contato", () => {
  test("campos inválidos mostram as mesmas mensagens do formulário do imóvel", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);
    render(<FormularioContato />);
    await enviar();
    const nome = screen.getByLabelText(/NOME/);
    expect(nome).toHaveFocus();
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(nome).toHaveAccessibleDescription("Informe seu nome.");
    expect(screen.getByLabelText(/TELEFONE/)).toHaveAccessibleDescription("Informe seu telefone.");
    expect(screen.getByLabelText(/E-MAIL/)).toHaveAccessibleDescription("Informe seu e-mail.");
    expect(fetchMock).not.toHaveBeenCalled();
    await userEvent.type(nome, "Ma");
    expect(nome).toHaveAttribute("aria-invalid", "false");
  });

  test("telefone com máscara e e-mail inválido", async () => {
    render(<FormularioContato />);
    const tel = screen.getByLabelText(/TELEFONE/);
    await userEvent.type(tel, "31998765432");
    expect(tel).toHaveValue("(31) 99876-5432");
    await userEvent.type(screen.getByLabelText(/E-MAIL/), "abc");
    await enviar();
    expect(screen.getByLabelText(/E-MAIL/)).toHaveAccessibleDescription("E-mail inválido. Use o formato nome@email.com.");
  });

  test("envio válido manda o contato geral e mostra o sucesso", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    render(<FormularioContato />);
    await preencher();
    await enviar();
    expect(await screen.findByText("Mensagem enviada. Nossa equipe vai falar com você em breve.")).toBeInTheDocument();
    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(corpo).toMatchObject({
      nome: "Mariana Duarte",
      telefone: "+5531998765432",
      email: "mariana.duarte@email.com",
      observacoes: "Quero vender meu apartamento.",
      origem: "contato",
    });
    expect(corpo).not.toHaveProperty("imovelId");
  });

  test("falha mantém os dados e mostra o erro", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 500 })));
    vi.spyOn(console, "error").mockImplementation(() => {});
    render(<FormularioContato />);
    await preencher();
    await enviar();
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível enviar");
    expect(screen.getByLabelText(/NOME/)).toHaveValue("Mariana Duarte");
    expect(screen.getByLabelText(/MENSAGEM/)).toHaveValue("Quero vender meu apartamento.");
    expect(screen.getByRole("button", { name: "TENTAR NOVAMENTE" })).toBeInTheDocument();
  });
});
