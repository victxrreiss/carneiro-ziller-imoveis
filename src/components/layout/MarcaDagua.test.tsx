import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MarcaDagua } from "./MarcaDagua";

describe("MarcaDagua", () => {
  test("desenha o símbolo e o nome da empresa", () => {
    const { container } = render(<MarcaDagua />);
    const marca = container.firstElementChild!;
    expect(marca.querySelector("svg path")).not.toBeNull();
    expect(marca).toHaveTextContent("CARNEIRO & ZILLER");
  });

  test("é decorativa: aria-hidden e fora da árvore de acessibilidade", () => {
    const { container } = render(<MarcaDagua />);
    const marca = container.firstElementChild!;
    expect(marca).toHaveAttribute("aria-hidden", "true");
    expect(marca).toHaveClass("cz-marca-dagua");
  });

  test("aceita uma classe extra para ajustar o tamanho no contexto", () => {
    const { container } = render(<MarcaDagua className="no-card" />);
    expect(container.firstElementChild).toHaveClass("cz-marca-dagua", "no-card");
  });
});
