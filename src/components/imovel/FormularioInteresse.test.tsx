import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, test, vi } from "vitest";
import type { Imovel } from "@/lib/imoveis";
import { AgendarProvider, BotaoAgendar } from "./Agendar";

const imovel: Imovel = {
  id: "cz1009",
  codigo: "CZ1009",
  finalidade: "venda",
  lancamento: false,
  tipo: "Apartamento",
  titulo: "Apartamento no Belvedere",
  bairro: "Belvedere",
  cidade: "Belo Horizonte",
  uf: "MG",
  valor: 7890000,
  area: 398,
  quartos: 4,
  vagas: 5,
  foto: { src: "/a.jpg", alt: "", largura: 10, altura: 10 },
  descricao: [],
  fotos: [{ src: "/a.jpg", alt: "foto", largura: 10, altura: 10 }],
};

function renderTela() {
  render(
    <main>
      <AgendarProvider imovel={imovel}>
        <BotaoAgendar id="im-cta" />
      </AgendarProvider>
    </main>,
  );
}

async function abrir() {
  await userEvent.click(screen.getByRole("button", { name: "AGENDAR VISITA" }));
  return screen.getByRole("dialog", { name: "Agendar visita" });
}

async function preencher() {
  await userEvent.type(screen.getByLabelText(/NOME/), "Mariana Duarte");
  await userEvent.type(screen.getByLabelText(/TELEFONE/), "31998765432");
  await userEvent.type(screen.getByLabelText(/E-MAIL/), "mariana.duarte@email.com");
}

afterEach(() => vi.unstubAllGlobals());

describe("Formulário de interesse", () => {
  test("abre vinculado ao imóvel, com foco no nome", async () => {
    renderTela();
    const dialog = await abrir();
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveTextContent("CÓD. CZ1009 · APARTAMENTO");
    expect(dialog).toHaveTextContent("Apartamento no Belvedere");
    expect(screen.getByLabelText(/NOME/)).toHaveFocus();
    expect(screen.getByRole("button", { name: "AGENDAR VISITA" })).toHaveAttribute("aria-expanded", "true");
  });

  test("valida ao enviar, foca o primeiro inválido e limpa o erro quando o campo fica válido", async () => {
    renderTela();
    await abrir();
    await userEvent.click(screen.getByRole("button", { name: "ENVIAR" }));
    const nome = screen.getByLabelText(/NOME/);
    expect(nome).toHaveFocus();
    expect(nome).toHaveAttribute("aria-invalid", "true");
    expect(nome).toHaveAccessibleDescription("Informe seu nome.");
    expect(screen.getByLabelText(/TELEFONE/)).toHaveAccessibleDescription("Informe seu telefone.");
    await userEvent.type(nome, "Ma");
    expect(nome).toHaveAttribute("aria-invalid", "false");
    expect(screen.queryByText("Informe seu nome.")).not.toBeInTheDocument();
  });

  test("telefone com máscara", async () => {
    renderTela();
    await abrir();
    const tel = screen.getByLabelText(/TELEFONE/);
    await userEvent.type(tel, "31998765432");
    expect(tel).toHaveValue("(31) 99876-5432");
    expect(tel).toHaveAccessibleDescription("Com DDD. Celular ou fixo.");
  });

  test("sucesso: envia o payload, mostra o resumo e reabre vazio", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 201 }));
    vi.stubGlobal("fetch", fetchMock);
    renderTela();
    await abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "ENVIAR" }));
    const titulo = await screen.findByRole("heading", { name: "Solicitação enviada" });
    await waitFor(() => expect(titulo).toHaveFocus());
    const corpo = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(corpo).toMatchObject({
      imovelId: "cz1009",
      codigo: "CZ1009",
      nome: "Mariana Duarte",
      telefone: "+5531998765432",
      email: "mariana.duarte@email.com",
      origem: "site",
    });
    await userEvent.click(screen.getByRole("button", { name: "VOLTAR AO IMÓVEL" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AGENDAR VISITA" })).toHaveFocus();
    await abrir();
    expect(screen.getByLabelText(/NOME/)).toHaveValue("");
  });

  test("falha: alerta, dados mantidos e tentar novamente", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 404 })));
    renderTela();
    await abrir();
    await preencher();
    await userEvent.click(screen.getByRole("button", { name: "ENVIAR" }));
    expect(await screen.findByRole("alert")).toHaveTextContent("Não foi possível enviar");
    expect(screen.getByLabelText(/NOME/)).toHaveValue("Mariana Duarte");
    expect(screen.getByRole("button", { name: "TENTAR NOVAMENTE" })).toBeInTheDocument();
  });

  test("Esc fecha e devolve o foco", async () => {
    renderTela();
    await abrir();
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "AGENDAR VISITA" })).toHaveFocus();
  });
});
