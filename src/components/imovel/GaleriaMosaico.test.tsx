import { act, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test } from "vitest";
import type { Foto } from "@/lib/imoveis";
import { GaleriaMosaico } from "./GaleriaMosaico";

const PADRAO: Foto = { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 };
const fotos = (n: number): Foto[] =>
  Array.from({ length: n }, (_, i) => ({ src: `/f${i + 1}.jpg`, alt: `Ambiente ${i + 1}`, largura: 1600, altura: 1067 }));

const montar = (n: number) => render(<GaleriaMosaico fotos={fotos(n)} padrao={PADRAO} />);
const mosaico = () => screen.getByRole("region", { name: "Fotos do imóvel" });
const telaCheia = () => screen.getByRole("dialog", { name: "Fotos do imóvel" });
const contador = () => telaCheia().querySelector(".im-luz-cont");

/** Arrasta o dedo na foto da tela cheia, de `de` até `ate` (px na horizontal). */
function deslizar(de: number, ate: number) {
  const palco = telaCheia().querySelector(".im-luz-palco")!;
  // MouseEvent com o tipo de pointer: o jsdom não leva clientX no PointerEvent em todas as versões.
  const evento = (tipo: string, x: number) => new MouseEvent(tipo, { bubbles: true, clientX: x, clientY: 200 });
  act(() => {
    fireEvent(palco, evento("pointerdown", de));
    fireEvent(palco, evento("pointerup", ate));
  });
}

describe("GaleriaMosaico", () => {
  test("mosaico com 1, 2 e 3+ fotos sem espaço vazio; sem foto usa a imagem padrão", () => {
    for (const [n, itens] of [
      [1, 1],
      [2, 2],
      [3, 3],
      [8, 3],
    ] as const) {
      const { unmount } = montar(n);
      // A classe diz à grade quantas células existem: nenhuma fica vazia.
      expect(mosaico()).toHaveClass(`im-mos-${itens}`);
      expect(mosaico().querySelectorAll(".im-mos-item")).toHaveLength(itens);
      unmount();
    }

    montar(0);
    expect(mosaico()).toHaveClass("im-mos-1");
    const imgs = mosaico().querySelectorAll("img");
    expect(imgs).toHaveLength(1);
    expect(imgs[0].getAttribute("src")).toContain("sem-foto.svg");
    // Sem foto não há o que ampliar.
    expect(within(mosaico()).queryByRole("button")).toBeNull();
  });

  test("Ver as N fotos abre a tela cheia na foto clicada; ←/→ navegam, Esc fecha e devolve o foco ao botão", async () => {
    montar(8);
    const botao = screen.getByRole("button", { name: "Ver as 8 fotos" });
    await userEvent.click(botao);
    expect(contador()).toHaveTextContent("1 / 8");
    expect(telaCheia()).toContainElement(document.activeElement as HTMLElement);

    await userEvent.keyboard("{ArrowRight}");
    expect(contador()).toHaveTextContent("2 / 8");
    await userEvent.keyboard("{ArrowLeft}{ArrowLeft}");
    expect(contador()).toHaveTextContent("8 / 8");
    await userEvent.click(within(telaCheia()).getByRole("button", { name: "Próxima foto" }));
    expect(contador()).toHaveTextContent("1 / 8");

    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(botao).toHaveFocus();

    // Clicar numa foto do mosaico abre nela.
    const terceira = screen.getByRole("button", { name: /^Abrir foto 3 de 8:\s*Ambiente 3$/ });
    await userEvent.click(terceira);
    expect(contador()).toHaveTextContent("3 / 8");
    expect(within(telaCheia()).getByAltText("Ambiente 3")).toBeVisible();
    await userEvent.click(within(telaCheia()).getByRole("button", { name: "Fechar fotos" }));
    expect(terceira).toHaveFocus();
  });

  test("deslizar (pointer events) para a esquerda avança e para a direita volta", async () => {
    montar(8);
    await userEvent.click(screen.getByRole("button", { name: "Ver as 8 fotos" }));
    deslizar(300, 120);
    expect(contador()).toHaveTextContent("2 / 8");
    deslizar(120, 300);
    expect(contador()).toHaveTextContent("1 / 8");
    // Um toque curto não troca de foto.
    deslizar(200, 215);
    expect(contador()).toHaveTextContent("1 / 8");
  });

  test("toda foto da galeria e da tela cheia tem MarcaDagua", async () => {
    montar(8);
    for (const item of mosaico().querySelectorAll(".im-mos-item")) {
      const marca = item.querySelector(".cz-marca-dagua");
      expect(marca).not.toBeNull();
      expect(marca).toHaveAttribute("aria-hidden", "true");
    }
    await userEvent.click(screen.getByRole("button", { name: "Ver as 8 fotos" }));
    expect(telaCheia().querySelector(".im-luz-foto .cz-marca-dagua")).toHaveAttribute("aria-hidden", "true");
  });

  test("uma foto: abre a tela cheia sem setas nem contador", async () => {
    montar(1);
    await userEvent.click(screen.getByRole("button", { name: /^Ampliar a foto:\s*Ambiente 1$/ }));
    expect(within(telaCheia()).queryByRole("button", { name: "Próxima foto" })).toBeNull();
    expect(contador()).toBeNull();
  });

  test("só as fotos vizinhas são carregadas com a atual", async () => {
    montar(8);
    await userEvent.click(screen.getByRole("button", { name: /^Abrir foto 3 de 8:\s*Ambiente 3$/ }));
    const srcs = [...telaCheia().querySelectorAll("img")].map((i) => decodeURIComponent(i.getAttribute("src") ?? ""));
    expect(srcs).toHaveLength(3);
    for (const f of ["/f2.jpg", "/f3.jpg", "/f4.jpg"]) expect(srcs.some((s) => s.includes(f))).toBe(true);
  });
});
