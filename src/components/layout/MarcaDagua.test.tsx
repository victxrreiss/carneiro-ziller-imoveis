import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MarcaDagua } from "./MarcaDagua";

describe("MarcaDagua", () => {
  test("desenha a logo com o selo, cuja forma vem do arquivo da logo no CSS", () => {
    const { container } = render(<MarcaDagua />);
    expect(container.querySelector(".cz-marca-dagua > .cz-marca-dagua-logo")).not.toBeNull();
    const css = readFileSync(path.join(process.cwd(), "src/styles/cz-site.css"), "utf8");
    expect(css).toMatch(/\.cz-marca-dagua-logo\{[^}]*mask:url\(\/logo\/carneiro-ziller-selo-negativo\.svg\)/);
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
