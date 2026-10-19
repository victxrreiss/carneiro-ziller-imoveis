import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import type { ImovelCard } from "@/lib/imoveis";
import { SelectedTabs } from "./SelectedTabs";

const card = (id: string, title: string, badge: ImovelCard["badge"]): ImovelCard => ({
  id,
  badge,
  title,
  location: "Belo Horizonte",
  price: "R$ 1",
  area: "1 m²",
  img: "/images/x.jpg",
  alt: title,
});

const venda = [card("v1", "Casa à venda", "VENDA")];
const locacao = [card("r1", "Sala para alugar", "LOCAÇÃO")];

describe("SelectedTabs", () => {
  test("mostra venda e esconde locação de início", () => {
    render(<SelectedTabs venda={venda} locacao={locacao} />);
    expect(screen.getByText("Casa à venda")).toBeVisible();
    expect(screen.getByText("Sala para alugar")).not.toBeVisible();
  });

  test("clicar em LOCAÇÃO troca o painel visível", async () => {
    render(<SelectedTabs venda={venda} locacao={locacao} />);
    await userEvent.click(screen.getByRole("tab", { name: "LOCAÇÃO" }));
    expect(screen.getByText("Sala para alugar")).toBeVisible();
    expect(screen.getByText("Casa à venda")).not.toBeVisible();
  });

  test("painéis ligados às abas por aria-controls e aria-labelledby", () => {
    render(<SelectedTabs venda={venda} locacao={locacao} />);
    const tab = screen.getByRole("tab", { name: "VENDA" });
    const panel = screen.getByRole("tabpanel", { name: "VENDA" });
    expect(tab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveAttribute("aria-labelledby", tab.id);
  });

  test("cards não têm botão de favoritar", () => {
    render(<SelectedTabs venda={venda} locacao={locacao} />);
    expect(screen.queryByRole("button", { name: /favoritar/i })).not.toBeInTheDocument();
  });
});
