import { act, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, describe, expect, test, vi } from "vitest";
import { abertura } from "@/lib/site";
import { Abertura } from "./Abertura";
import { ANCORA_CONTEUDO } from "./partes";

function movimentoReduzido(reduzido: boolean) {
  vi.stubGlobal("matchMedia", (query: string) => ({ matches: reduzido, media: query, addEventListener: () => {}, removeEventListener: () => {} }));
}

const ativas = (raiz: ParentNode, seletor: string) => [...raiz.querySelectorAll(seletor)].map((el) => el.getAttribute("data-ativa"));
const texto = (el: Element | null) => el?.textContent?.replace(/\s+/g, " ").trim();

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("Abertura", () => {
  test("abertura mostra a primeira imagem e a primeira frase sem JavaScript", () => {
    // Render no servidor: é o HTML que chega antes de qualquer script.
    const html = renderToString(<Abertura>busca</Abertura>);
    const doc = new DOMParser().parseFromString(html, "text/html");

    expect(ativas(doc, "[data-abertura-imagem]")).toEqual(["true", "false", "false"]);
    expect(ativas(doc, "[data-abertura-frase]")).toEqual(["true", "false", "false", "false"]);
    expect(texto(doc.querySelector('[data-abertura-frase][data-ativa="true"]'))).toBe("Morar bem começa pela escolha do endereço.");
    expect(doc.querySelector("h1")).not.toBeNull();
    expect(doc.querySelector("video")).toBeNull();
  });

  test("o h1 é só a primeira frase; as que alternam ficam fora dele, escondidas dos leitores de tela", () => {
    const html = renderToString(<Abertura>busca</Abertura>);
    const doc = new DOMParser().parseFromString(html, "text/html");
    const h1s = doc.querySelectorAll("h1");
    expect(h1s).toHaveLength(1);
    expect(texto(h1s[0])).toBe("Morar bem começa pela escolha do endereço.");
    expect(h1s[0].hasAttribute("aria-hidden")).toBe(false);
    const frases = [...doc.querySelectorAll("[data-abertura-frase]")];
    expect(frases).toHaveLength(4);
    for (const f of frases.slice(1)) {
      expect(f.closest("h1")).toBeNull();
      expect(f.getAttribute("aria-hidden")).toBe("true");
    }
  });

  test("com a troca de frase, o h1 continua o mesmo e acessível", () => {
    movimentoReduzido(false);
    vi.useFakeTimers();
    const { container, getByRole } = render(<Abertura>busca</Abertura>);
    act(() => void vi.advanceTimersByTime(6000));
    expect(ativas(container, "[data-abertura-frase]")).toEqual(["false", "true", "false", "false"]);
    expect(texto(getByRole("heading", { level: 1 }))).toBe("Morar bem começa pela escolha do endereço.");
    expect(container.querySelector("h1")!.hasAttribute("aria-hidden")).toBe(false);
  });

  test("Rolar para baixo aponta para a âncora do conteúdo, que existe mesmo sem cards de tipo", () => {
    movimentoReduzido(true);
    const { getByRole } = render(<Abertura>busca</Abertura>);
    expect(getByRole("link", { name: "Rolar para baixo" })).toHaveAttribute("href", `#${ANCORA_CONTEUDO}`);
  });

  test("as frases são as 4 da direção visual e as imagens são 3", () => {
    expect(abertura.frases.map((f) => f.replace("\n", " "))).toEqual([
      "Morar bem começa pela escolha do endereço.",
      "Entre a serra e a cidade, o seu lugar.",
      "Casas que pedem silêncio, vistas que pedem tempo.",
      "Cada imóvel, uma história que começa com você.",
    ]);
    expect(abertura.imagens).toHaveLength(3);
    expect(abertura.imagens.every((i) => i.src.startsWith("/images/"))).toBe(true);
    expect(abertura.video).toBeNull();
  });

  test("com video em site.ts, renderiza <video muted loop playsinline> com poster", () => {
    movimentoReduzido(false);
    const { container } = render(
      <Abertura config={{ ...abertura, video: { mp4: "/video/abertura.mp4", poster: "/images/poster.jpg" } }}>busca</Abertura>,
    );
    const video = container.querySelector("video")!;
    expect(video).not.toBeNull();
    expect(video.muted).toBe(true);
    expect(video.loop).toBe(true);
    expect(video.autoplay).toBe(true);
    expect(video).toHaveAttribute("playsinline");
    expect(video).toHaveAttribute("poster", "/images/poster.jpg");
    expect(video.querySelector("source")).toHaveAttribute("src", "/video/abertura.mp4");
    // Com vídeo, só a primeira imagem fica (fundo enquanto o vídeo carrega e com movimento reduzido).
    expect(container.querySelectorAll("[data-abertura-imagem]")).toHaveLength(1);
  });

  test("troca de imagem e de frase a cada 6 s", () => {
    movimentoReduzido(false);
    vi.useFakeTimers();
    const { container } = render(<Abertura>busca</Abertura>);
    act(() => void vi.advanceTimersByTime(6000));
    expect(ativas(container, "[data-abertura-imagem]")).toEqual(["false", "true", "false"]);
    expect(ativas(container, "[data-abertura-frase]")).toEqual(["false", "true", "false", "false"]);
    act(() => void vi.advanceTimersByTime(12000));
    expect(ativas(container, "[data-abertura-imagem]")).toEqual(["true", "false", "false"]);
    expect(ativas(container, "[data-abertura-frase]")).toEqual(["false", "false", "false", "true"]);
  });

  test("com prefers-reduced-motion, a imagem e a frase ficam fixas", () => {
    movimentoReduzido(true);
    vi.useFakeTimers();
    const { container } = render(<Abertura>busca</Abertura>);
    act(() => void vi.advanceTimersByTime(30000));
    expect(ativas(container, "[data-abertura-imagem]")).toEqual(["true", "false", "false"]);
    expect(ativas(container, "[data-abertura-frase]")).toEqual(["true", "false", "false", "false"]);
  });

  test("só a primeira imagem carrega com prioridade", () => {
    movimentoReduzido(true);
    const { container } = render(<Abertura>busca</Abertura>);
    const imagens = [...container.querySelectorAll("[data-abertura-imagem]")];
    expect(imagens.map((i) => i.getAttribute("loading"))).toEqual(["eager", "lazy", "lazy"]);
  });
});
