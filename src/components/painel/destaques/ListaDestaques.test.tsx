import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import type { LinhaDestaque } from "@/lib/painel/destaques";
import { ListaDestaques } from "./ListaDestaques";

vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh: () => {} }) }));
vi.mock("@/app/painel/_acoes/destaques", () => ({ marcarDestaqueAction: async () => ({ ok: true }), moverDestaqueAction: async () => ({ ok: true }) }));

const linha = (n: number, naHome = true): LinhaDestaque => ({ id: `cz${1000 + n}`, codigo: `CZ${1000 + n}`, titulo: `Imóvel ${n}`, capa: null, naHome });

describe("ListaDestaques", () => {
  test("estado vazio explica como marcar", () => {
    render(<ListaDestaques itens={[]} aviso={null} max={6} />);
    expect(screen.getByRole("heading", { name: "Nenhum destaque escolhido" })).toBeTruthy();
    expect(screen.getByText(/marque “Destaque na página inicial”/)).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Subir/ })).toBeNull();
  });

  test("Subir desabilitado no primeiro e Descer no último", () => {
    render(<ListaDestaques itens={[linha(1), linha(2), linha(3)]} aviso={null} max={6} />);
    const botao = (nome: RegExp) => screen.getByRole("button", { name: nome }) as HTMLButtonElement;
    expect(botao(/Subir CZ1001/).disabled).toBe(true);
    expect(botao(/Descer CZ1001/).disabled).toBe(false);
    expect(botao(/Subir CZ1003/).disabled).toBe(false);
    expect(botao(/Descer CZ1003/).disabled).toBe(true);
    expect(botao(/Remover CZ1002/).disabled).toBe(false);
  });

  test("separa os que aparecem na Home dos que ficam de fora; cada um liga ao imóvel", () => {
    render(<ListaDestaques itens={[linha(1), linha(2, false)]} aviso={null} max={6} />);
    expect(screen.getByRole("heading", { name: "Aparecem na página inicial (1)" })).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Ficam de fora (1)" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Imóvel 2" }).getAttribute("href")).toBe("/painel/imoveis/cz1002");
  });

  test("o limite da Home vem da página (MAX_DESTAQUES_HOME), não fica fixo no componente", () => {
    render(<ListaDestaques itens={[linha(1), linha(2), linha(3, false)]} aviso={null} max={2} />);
    expect(screen.getByText(/A Home mostra os 2 primeiros\./)).toBeTruthy();
    expect(screen.getByText(/A página inicial mostra só 2\./)).toBeTruthy();
  });

  test("mostra o aviso de quem tirou o último", () => {
    render(<ListaDestaques itens={[]} aviso="Mariana Costa marcou CZ1009 · Casa como Indisponível em 13/11/2026, às 10h30." max={6} />);
    expect(screen.getByText("Um imóvel saiu dos destaques")).toBeTruthy();
    expect(screen.getByText(/Mariana Costa marcou CZ1009/)).toBeTruthy();
  });
});
