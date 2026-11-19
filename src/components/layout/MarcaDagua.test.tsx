import { readFileSync } from "node:fs";
import path from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, test } from "vitest";
import { MarcaDagua, temMarcaGravada } from "./MarcaDagua";

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

  test("foto da Loft (marca já gravada) fica sem a marca d'água do site", () => {
    const loft = "https://carneiroziller.com.br/cz-fotos/fotos/loft-453c1569e129a841ca601a018881a90591943580.jpg";
    expect(render(<MarcaDagua src={loft} />).container.innerHTML).toBe("");
    expect(render(<MarcaDagua src="https://carneiroziller.com.br/cz-fotos/fotos/8d9c18a6-25ed-460a-8d0a-722550812bbe.jpg" />).container.querySelector(".cz-marca-dagua")).not.toBeNull();
  });

  test("temMarcaGravada olha só o nome do arquivo da foto", () => {
    expect(temMarcaGravada("/cz-fotos/fotos/loft-abc.webp")).toBe(true);
    expect(temMarcaGravada("https://x.test/cz-fotos/fotos/loft-abc.jpg?w=640")).toBe(true);
    expect(temMarcaGravada("https://x.test/cz-fotos/fotos/abc.jpg?q=loft-")).toBe(false);
    expect(temMarcaGravada("/images/imoveis/a1843e848f2e8288905697ba4fc1dc0a.jpg")).toBe(false);
    expect(temMarcaGravada("https://x.test/fotos/loft-abc/outra.jpg")).toBe(false);
  });
});
