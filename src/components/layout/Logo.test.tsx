import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Logo } from "./Logo";

const img = () => screen.getByRole("img", { name: "Carneiro & Ziller Imóveis" });

describe("Logo", () => {
  test("padrão: horizontal positiva, com o nome da empresa como texto alternativo", () => {
    render(<Logo />);
    expect(img().getAttribute("src")).toContain("/logo/carneiro-ziller-horizontal.svg");
    expect(img()).toHaveClass("cz-logo", "cz-logo-horizontal");
  });

  test("horizontal negativa para o azul-noite", () => {
    render(<Logo variante="negativa" />);
    expect(img().getAttribute("src")).toContain("/logo/carneiro-ziller-horizontal-negativo.svg");
  });

  test("selo, positivo e negativo, na proporção do arquivo", () => {
    const { unmount } = render(<Logo forma="selo" />);
    expect(img().getAttribute("src")).toContain("/logo/carneiro-ziller-selo.svg");
    expect(img()).toHaveAttribute("width", "1286");
    expect(img()).toHaveAttribute("height", "383");
    unmount();
    render(<Logo forma="selo" variante="negativa" />);
    expect(img().getAttribute("src")).toContain("/logo/carneiro-ziller-selo-negativo.svg");
  });
});
