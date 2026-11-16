import { render, screen } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { Logo } from "./Logo";

describe("Logo", () => {
  test("positiva: SVG da logo B com o nome da empresa como texto alternativo", () => {
    render(<Logo />);
    const img = screen.getByRole("img", { name: "Carneiro & Ziller Imóveis" });
    expect(img.getAttribute("src")).toContain("/logo/carneiro-ziller.svg");
  });

  test("negativa: usa o arquivo para fundo escuro", () => {
    render(<Logo variante="negativa" />);
    expect(screen.getByRole("img", { name: "Carneiro & Ziller Imóveis" }).getAttribute("src")).toContain(
      "/logo/carneiro-ziller-negativo.svg",
    );
  });
});
