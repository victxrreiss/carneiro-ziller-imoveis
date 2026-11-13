import { render, screen } from "@testing-library/react";
import { describe, expect, test, vi } from "vitest";
import { SiteChrome } from "./SiteChrome";

// Header e Footer são componentes assíncronos de servidor (testados nos próprios arquivos).
const header = vi.hoisted(() => vi.fn());
vi.mock("./Header", () => ({
  Header: (props: { current?: string; variante?: string }) => {
    header(props);
    return <header data-testid="topo" />;
  },
}));
vi.mock("./Footer", () => ({ Footer: () => <footer data-testid="rodape" /> }));

describe("SiteChrome", () => {
  test("moldura .cz com cabeçalho sólido, conteúdo e rodapé, sem barra de utilidades", () => {
    const { container } = render(
      <SiteChrome current="imoveis" className="extra">
        <main>conteúdo</main>
      </SiteChrome>,
    );
    const raiz = container.firstElementChild!;
    expect(raiz).toHaveClass("cz", "extra");
    expect([...raiz.children].map((el) => el.tagName)).toEqual(["HEADER", "MAIN", "FOOTER"]);
    expect(header).toHaveBeenLastCalledWith({ current: "imoveis" });
    expect(raiz).not.toHaveTextContent("CRECI");
    expect(screen.getByText("conteúdo")).toBeInTheDocument();
  });
});
