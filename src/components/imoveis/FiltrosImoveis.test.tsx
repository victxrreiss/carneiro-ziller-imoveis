import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Filtros } from "@/lib/imoveis/filtros";
import { FiltrosImoveis } from "./FiltrosImoveis";

const localizacoes = [
  { cidade: "Belo Horizonte", bairros: ["Savassi"] },
  { cidade: "Nova Lima", bairros: ["Vila da Serra", "Vale do Sereno"] },
];

function montar(filtros: Filtros = { pagina: 1 }, temLancamentos = true) {
  const onAplicar = vi.fn();
  render(
    <FiltrosImoveis
      filtros={filtros}
      onAplicar={onAplicar}
      contar={vi.fn().mockResolvedValue(0)}
      totalAtual={0}
      localizacoes={localizacoes}
      temLancamentos={temLancamentos}
    />,
  );
  return { onAplicar };
}

describe("FiltrosImoveis > Localização", () => {
  it("agrupa por cidade: Toda a cidade primeiro, depois os bairros", async () => {
    montar();
    await userEvent.click(screen.getByRole("button", { name: /LOCALIZAÇÃO/ }));
    const grupo = screen.getByRole("group", { name: "Nova Lima" });
    expect(within(grupo).getAllByRole("option").map((o) => o.textContent)).toEqual(["Toda a cidade", "Vila da Serra", "Vale do Sereno"]);
  });

  it("escolher um bairro aplica local como Bairro, Cidade", async () => {
    const { onAplicar } = montar();
    await userEvent.click(screen.getByRole("button", { name: /LOCALIZAÇÃO/ }));
    await userEvent.click(within(screen.getByRole("group", { name: "Nova Lima" })).getByRole("option", { name: "Vila da Serra" }));
    expect(onAplicar).toHaveBeenCalledWith({ local: "Vila da Serra, Nova Lima", pagina: 1 });
  });

  it("Toda a cidade aplica só a cidade", async () => {
    const { onAplicar } = montar();
    await userEvent.click(screen.getByRole("button", { name: /LOCALIZAÇÃO/ }));
    await userEvent.click(within(screen.getByRole("group", { name: "Nova Lima" })).getByRole("option", { name: "Toda a cidade" }));
    expect(onAplicar).toHaveBeenCalledWith({ local: "Nova Lima", pagina: 1 });
  });
});

describe("FiltrosImoveis > Finalidade", () => {
  const rotulos = () => within(screen.getAllByRole("radiogroup", { name: "Finalidade" })[0]).getAllByRole("radio").map((r) => r.textContent);

  it("oferece LANÇAMENTOS quando há lançamentos", () => {
    montar({ pagina: 1 }, true);
    expect(rotulos()).toEqual(["TODOS", "COMPRAR", "ALUGAR", "LANÇAMENTOS"]);
  });

  it("oculta LANÇAMENTOS quando não há", () => {
    montar({ pagina: 1 }, false);
    expect(rotulos()).toEqual(["TODOS", "COMPRAR", "ALUGAR"]);
  });

  it("URL antiga com finalidade=lancamentos continua refletida na tela", () => {
    montar({ finalidade: "lancamentos", pagina: 1 }, false);
    expect(rotulos()).toContain("LANÇAMENTOS");
  });
});
