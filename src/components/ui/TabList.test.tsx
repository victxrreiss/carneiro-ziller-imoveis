import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, test, vi } from "vitest";
import { TabList, type Tab } from "./TabList";

const tabs: Tab[] = [
  { id: "comprar", label: "COMPRAR" },
  { id: "alugar", label: "ALUGAR" },
  { id: "lancamentos", label: "LANÇAMENTOS" },
];

function Controlled({ onSelect = () => {} }: { onSelect?: (id: string) => void }) {
  const [selected, setSelected] = useState("comprar");
  return (
    <TabList
      label="Finalidade"
      tabs={tabs}
      selected={selected}
      onSelect={(id) => {
        setSelected(id);
        onSelect(id);
      }}
      variant="finalidade"
    />
  );
}

describe("TabList", () => {
  test("expõe tablist rotulado e marca só a aba selecionada", () => {
    render(<Controlled />);
    expect(screen.getByRole("tablist", { name: "Finalidade" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "COMPRAR" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tab", { name: "ALUGAR" })).toHaveAttribute("aria-selected", "false");
  });

  test("só a aba selecionada fica no tab order", () => {
    render(<Controlled />);
    expect(screen.getByRole("tab", { name: "COMPRAR" })).toHaveAttribute("tabindex", "0");
    expect(screen.getByRole("tab", { name: "ALUGAR" })).toHaveAttribute("tabindex", "-1");
  });

  test("clique seleciona a aba", async () => {
    const onSelect = vi.fn();
    render(<Controlled onSelect={onSelect} />);
    await userEvent.click(screen.getByRole("tab", { name: "ALUGAR" }));
    expect(onSelect).toHaveBeenCalledWith("alugar");
    expect(screen.getByRole("tab", { name: "ALUGAR" })).toHaveAttribute("aria-selected", "true");
  });

  test("setas movem foco e seleção, com volta circular", async () => {
    render(<Controlled />);
    screen.getByRole("tab", { name: "COMPRAR" }).focus();
    await userEvent.keyboard("{ArrowLeft}");
    const last = screen.getByRole("tab", { name: "LANÇAMENTOS" });
    expect(last).toHaveFocus();
    expect(last).toHaveAttribute("aria-selected", "true");
    await userEvent.keyboard("{ArrowRight}");
    expect(screen.getByRole("tab", { name: "COMPRAR" })).toHaveFocus();
  });

  test("Home e End vão para a primeira e a última aba", async () => {
    render(<Controlled />);
    screen.getByRole("tab", { name: "COMPRAR" }).focus();
    await userEvent.keyboard("{End}");
    expect(screen.getByRole("tab", { name: "LANÇAMENTOS" })).toHaveFocus();
    await userEvent.keyboard("{Home}");
    expect(screen.getByRole("tab", { name: "COMPRAR" })).toHaveFocus();
  });

  test("repassa aria-controls e id quando a aba controla um painel", () => {
    render(
      <TabList
        label="Venda ou locação"
        tabs={[{ id: "venda", label: "VENDA", controls: "painel-venda" }]}
        selected="venda"
        onSelect={() => {}}
        variant="listagem"
        idPrefix="sel"
      />,
    );
    const tab = screen.getByRole("tab", { name: "VENDA" });
    expect(tab).toHaveAttribute("aria-controls", "painel-venda");
    expect(tab).toHaveAttribute("id", "sel-tab-venda");
  });
});
