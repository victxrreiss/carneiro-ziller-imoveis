import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import { MenuDrawer } from "./MenuDrawer";

const items = [
  { label: "Home", href: "/", current: true },
  { label: "Sobre nós", href: "/sobre", current: false },
];

function renderMenu() {
  return render(
    <main>
      <MenuDrawer items={items} />
    </main>,
  );
}

describe("MenuDrawer", () => {
  test("começa fechado", () => {
    renderMenu();
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  test("abre o menu em tela cheia com os links, o atual marcado e os contatos", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    const dialog = screen.getByRole("dialog", { name: "Menu" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(screen.getByRole("link", { name: "Home" })).toHaveAttribute("aria-current", "page");
    expect(screen.getByRole("link", { name: "Sobre nós" })).toHaveAttribute("href", "/sobre");
    expect(screen.getByRole("link", { name: "Falar no WhatsApp" })).toHaveAttribute("href", "https://wa.me/5531995395988");
    expect(screen.getByRole("link", { name: "(31) 99539-5988" })).toHaveAttribute("href", "tel:+5531995395988");
    expect(dialog).toHaveTextContent("CRECI 7904");
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveAttribute("href", "/painel/entrar");
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveFocus();
  });

  test("deixa o resto da página inerte e trava a rolagem", async () => {
    const { container } = renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    expect(container.inert).toBe(true);
    expect(document.body.style.overflow).toBe("hidden");
    await userEvent.keyboard("{Escape}");
    expect(container.inert).toBe(false);
    expect(document.body.style.overflow).toBe("");
  });

  test("Esc fecha e devolve o foco ao botão", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Abrir menu" })).toHaveFocus();
  });

  test("Tab fica preso na gaveta", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    await userEvent.tab();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Sobre nós" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "Falar no WhatsApp" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "SOU CORRETOR" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("link", { name: "(31) 99539-5988" })).toHaveFocus();
    await userEvent.tab();
    expect(screen.getByRole("button", { name: "Fechar menu" })).toHaveFocus();
  });

  test("o botão de fechar e os links fecham o menu", async () => {
    renderMenu();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    await userEvent.click(screen.getByRole("button", { name: "Fechar menu" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Abrir menu" }));
    await userEvent.click(screen.getByRole("link", { name: "Sobre nós" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });
});
