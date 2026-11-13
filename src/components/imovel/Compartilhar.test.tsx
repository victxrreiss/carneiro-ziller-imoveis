import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, test, vi } from "vitest";
import { Compartilhar } from "./Compartilhar";

const URL_IMOVEL = "https://carneiroziller.com.br/imovel/cz1009";
const TITULO = "Cobertura no Belvedere";

function definir(prop: "share" | "clipboard", valor: unknown) {
  Object.defineProperty(navigator, prop, { value: valor, configurable: true, writable: true });
}

afterEach(() => {
  definir("share", undefined);
  definir("clipboard", undefined);
});

const botao = () => screen.getByRole("button", { name: "Compartilhar" });

describe("Compartilhar", () => {
  test("Compartilhar usa navigator.share quando existe; sem ele, mostra WhatsApp e Copiar link", async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    definir("share", share);
    const { unmount } = render(<Compartilhar titulo={TITULO} url={URL_IMOVEL} />);
    fireEvent.click(botao());
    expect(share).toHaveBeenCalledWith({ title: TITULO, url: URL_IMOVEL });
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    unmount();

    definir("share", undefined);
    const writeText = vi.fn().mockResolvedValue(undefined);
    definir("clipboard", { writeText });
    render(<Compartilhar titulo={TITULO} url={URL_IMOVEL} />);
    expect(screen.queryByRole("link", { name: /WhatsApp/ })).toBeNull();
    fireEvent.click(botao());
    expect(botao()).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("link", { name: /WhatsApp/ })).toHaveAttribute(
      "href",
      `https://wa.me/?text=${encodeURIComponent(`${TITULO} ${URL_IMOVEL}`)}`,
    );
    fireEvent.click(screen.getByRole("button", { name: "Copiar link" }));
    expect(writeText).toHaveBeenCalledWith(URL_IMOVEL);
    await waitFor(() => expect(screen.getByRole("status")).toHaveTextContent("Link copiado"));
  });

  test("cancelar o compartilhamento nativo não abre a alternativa nem gera erro", async () => {
    const share = vi.fn().mockRejectedValue(new DOMException("cancelado", "AbortError"));
    definir("share", share);
    render(<Compartilhar titulo={TITULO} url={URL_IMOVEL} />);
    fireEvent.click(botao());
    await waitFor(() => expect(share).toHaveBeenCalled());
    expect(screen.queryByRole("button", { name: "Copiar link" })).toBeNull();
  });

  test("Esc fecha a alternativa e devolve o foco ao botão", () => {
    render(<Compartilhar titulo={TITULO} url={URL_IMOVEL} />);
    fireEvent.click(botao());
    fireEvent.keyDown(screen.getByRole("button", { name: "Copiar link" }), { key: "Escape" });
    expect(screen.queryByRole("button", { name: "Copiar link" })).toBeNull();
    expect(botao()).toHaveFocus();
  });
});
