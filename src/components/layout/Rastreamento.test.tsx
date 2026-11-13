import { render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { beforeEach, describe, expect, test, vi } from "vitest";
import { rastreamento, rastreamentoAtivo } from "@/lib/site";
import { Rastreamento } from "./Rastreamento";

const caminho = vi.hoisted(() => ({ atual: "/" }));
vi.mock("next/navigation", () => ({ usePathname: () => caminho.atual }));
// next/script não roda no jsdom; basta saber que foi pedido e com qual conteúdo.
vi.mock("next/script", () => ({
  default: ({ id, children, dangerouslySetInnerHTML }: { id: string; children?: string; dangerouslySetInnerHTML?: { __html: string } }) => (
    <script data-testid={id}>{children ?? dangerouslySetInnerHTML?.__html}</script>
  ),
}));

describe("rastreamentoAtivo", () => {
  test("só no domínio de produção", () => {
    expect(rastreamentoAtivo("https://carneiroziller.com.br")).toBe(true);
    expect(rastreamentoAtivo("https://carneiroziller.com.br/")).toBe(true);
    expect(rastreamentoAtivo("http://localhost:3000")).toBe(false);
    expect(rastreamentoAtivo("https://carneiroziller.granconsultoria.com.br")).toBe(false);
    expect(rastreamentoAtivo(undefined)).toBe(false);
    expect(rastreamentoAtivo("não é url")).toBe(false);
  });
});

describe("Rastreamento", () => {
  beforeEach(() => {
    caminho.atual = "/";
    (window as unknown as { fbq?: unknown }).fbq = undefined;
  });

  test("carrega o Tag Manager e o Pixel com os IDs do gestor de tráfego", () => {
    const { getByTestId } = render(<Rastreamento />);
    expect(getByTestId("gtm").textContent).toContain(rastreamento.gtm);
    expect(getByTestId("meta-pixel").textContent).toContain(rastreamento.metaPixel);
    // <noscript> só tem conteúdo no HTML do servidor, que é onde ele vale.
    const html = renderToString(<Rastreamento />);
    expect(html).toContain(`ns.html?id=${rastreamento.gtm}`);
    expect(html).toContain(`tr?id=${rastreamento.metaPixel}&amp;ev=PageView&amp;noscript=1`);
  });

  test("não roda no painel", () => {
    caminho.atual = "/painel/imoveis";
    const { container } = render(<Rastreamento />);
    expect(container.innerHTML).toBe("");
  });

  test("conta PageView no Pixel ao trocar de página, sem repetir o da carga", () => {
    const fbq = vi.fn();
    (window as unknown as { fbq: typeof fbq }).fbq = fbq;
    const { rerender } = render(<Rastreamento />);
    expect(fbq).not.toHaveBeenCalled();
    caminho.atual = "/imoveis";
    rerender(<Rastreamento />);
    expect(fbq).toHaveBeenCalledWith("track", "PageView");
  });
});
