import { act, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import { ATRIBUTO_INTRO, CHAVE_INTRO, Intro, INTRO_MS, PULAR_MS, SCRIPT_INTRO } from "./Intro";

function movimentoReduzido(reduzido: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduzido, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
}

/**
 * Reproduz a carga do documento: o HTML do servidor entra na página, o script em linha roda
 * (o jsdom não executa scripts vindos de `innerHTML`) e só então o React hidrata.
 */
function carregar({ hidratar = true } = {}) {
  const raiz = document.createElement("div");
  document.body.appendChild(raiz);
  raiz.innerHTML = renderToString(<Intro />);
  const script = raiz.querySelector("script")!;
  Object.defineProperty(document, "currentScript", { configurable: true, value: script });
  new Function(script.textContent!)();
  Object.defineProperty(document, "currentScript", { configurable: true, value: null });
  if (hidratar) render(<Intro />, { container: raiz, hydrate: true });
  return raiz;
}

const estado = (raiz: ParentNode) => raiz.querySelector(`[${ATRIBUTO_INTRO}]`)?.getAttribute(ATRIBUTO_INTRO);
const camada = (raiz: ParentNode) => raiz.querySelector(".cz-intro");
const vista = () => window.sessionStorage.getItem(CHAVE_INTRO);

beforeEach(() => {
  vi.useFakeTimers();
  movimentoReduzido(false);
});

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  window.sessionStorage.clear();
  document.body.innerHTML = "";
});

describe("Intro", () => {
  test("o HTML do servidor traz o script antes da camada, que é decorativa e sem nada focável", () => {
    const doc = new DOMParser().parseFromString(renderToString(<Intro />), "text/html");
    const involucro = doc.querySelector(`[${ATRIBUTO_INTRO}]`)!;

    expect(involucro.firstElementChild?.tagName).toBe("SCRIPT");
    expect(involucro.firstElementChild?.textContent).toBe(SCRIPT_INTRO);
    expect(involucro.lastElementChild).toBe(camada(doc));
    expect(camada(doc)?.getAttribute("aria-hidden")).toBe("true");
    expect(camada(doc)!.querySelectorAll("a, button, input, select, textarea, [tabindex]")).toHaveLength(0);
    expect(camada(doc)!.textContent).toBe("Pular");
    // Sem JavaScript o atributo fica vazio: o CSS mostra a camada e a tira sozinho.
    expect(involucro.getAttribute(ATRIBUTO_INTRO)).toBe("");
    expect(doc.querySelector("video, img")).toBeNull();
  });

  test("na primeira visita toca até o fim, grava a sessão e sai do DOM", () => {
    const raiz = carregar();
    expect(estado(raiz)).toBe("toca");
    expect(camada(raiz)).not.toBeNull();
    expect(vista()).toBeNull();

    act(() => void vi.advanceTimersByTime(INTRO_MS - 1));
    expect(camada(raiz)).not.toBeNull();
    expect(vista()).toBeNull();

    act(() => void vi.advanceTimersByTime(1));
    expect(camada(raiz)).toBeNull();
    expect(vista()).toBe("1");
  });

  test("a duração total, com a saída, não passa de 3 segundos", () => {
    expect(INTRO_MS).toBeLessThanOrEqual(3000);
    expect(PULAR_MS).toBeLessThan(400);
  });

  test.each([
    ["clique ou toque", () => fireEvent.pointerDown(document.body)],
    ["tecla", () => fireEvent.keyDown(document.body, { key: "Enter" })],
    ["rolagem", () => fireEvent.wheel(document.body)],
  ])("%s pula: a saída rápida começa na hora e a sessão fica gravada", (_nome, gesto) => {
    const raiz = carregar();
    act(() => void vi.advanceTimersByTime(400));

    act(() => void gesto());
    expect(estado(raiz)).toBe("pula");
    expect(vista()).toBeNull();

    act(() => void vi.advanceTimersByTime(PULAR_MS));
    expect(camada(raiz)).toBeNull();
    expect(vista()).toBe("1");
  });

  test("pulo antes da hidratação: o script começa a saída rápida e o React só a conclui", () => {
    const raiz = carregar({ hidratar: false });
    fireEvent.keyDown(document.body, { key: "Tab" });
    expect(estado(raiz)).toBe("pula");
    expect(vista()).toBeNull();

    render(<Intro />, { container: raiz, hydrate: true });
    expect(camada(raiz)).not.toBeNull();
    act(() => void vi.advanceTimersByTime(PULAR_MS));
    expect(camada(raiz)).toBeNull();
    expect(vista()).toBe("1");
  });

  test("o fim da animação de saída conclui antes do relógio", () => {
    const raiz = carregar();
    act(() => void fireEvent.animationEnd(camada(raiz)!));
    expect(camada(raiz)).toBeNull();
    expect(vista()).toBe("1");
  });

  test("o fim das animações de dentro (letras, Z…) não conclui nada", () => {
    const raiz = carregar();
    act(() => void fireEvent.animationEnd(raiz.querySelector(".cz-intro-z")!));
    expect(camada(raiz)).not.toBeNull();
    expect(vista()).toBeNull();
  });

  test("já vista nesta sessão: o script esconde antes da hidratação e ela sai do DOM", () => {
    window.sessionStorage.setItem(CHAVE_INTRO, "1");
    const semHidratar = carregar({ hidratar: false });
    expect(estado(semHidratar)).toBe("vista");

    const raiz = carregar();
    expect(camada(raiz)).toBeNull();
    expect(raiz.querySelector("script")).toBeNull();
  });

  test("com movimento reduzido nunca aparece", () => {
    movimentoReduzido(true);
    const semHidratar = carregar({ hidratar: false });
    expect(estado(semHidratar)).toBe("vista");

    const raiz = carregar();
    expect(camada(raiz)).toBeNull();
  });

  test("chegando à Home por navegação interna não toca, e a sessão fica marcada", () => {
    // Render só no cliente: não há HTML do servidor nem script em linha.
    const { container } = render(<Intro />);
    expect(container).toBeEmptyDOMElement();
    expect(vista()).toBe("1");
  });

  test("armazenamento bloqueado não quebra: toca, termina e sai do DOM", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("bloqueado");
    });
    const raiz = carregar();
    expect(estado(raiz)).toBe("toca");

    act(() => void vi.advanceTimersByTime(INTRO_MS));
    expect(camada(raiz)).toBeNull();
  });

  test("ao sair da Home no meio da abertura, os ouvintes e o relógio são desfeitos", () => {
    const raiz = carregar({ hidratar: false });
    const { unmount } = render(<Intro />, { container: raiz, hydrate: true });
    unmount();

    act(() => void fireEvent.keyDown(document.body, { key: "Enter" }));
    act(() => void vi.advanceTimersByTime(INTRO_MS));
    expect(vista()).toBeNull();
  });
});
