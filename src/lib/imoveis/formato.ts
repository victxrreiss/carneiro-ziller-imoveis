import type { Finalidade } from "./types";

const milhar = (n: number) =>
  Math.round(n)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function formatarReais(valor: number): string {
  return `R$ ${milhar(valor)}`;
}

/** Preço como aparece no card do grid: locação leva "/mês". */
export function formatarPreco(valor: number, finalidade: Finalidade): string {
  return formatarReais(valor) + (finalidade === "locacao" ? "/mês" : "");
}

/** Valor mensal (locação, condomínio): "R$ 1.250/mês". */
export function formatarMensal(n: number): string {
  return `${formatarReais(n)}/mês`;
}

/** Valor anual (IPTU): "R$ 4.800/ano". */
export function formatarAnual(n: number): string {
  return `${formatarReais(n)}/ano`;
}

export function formatarArea(m2: number): string {
  return `${milhar(m2)} m²`;
}

export function formatarQuartos(n: number): string {
  return `${n} ${n === 1 ? "quarto" : "quartos"}`;
}

export const rotuloFinalidade: Record<Finalidade, string> = {
  venda: "VENDA",
  locacao: "LOCAÇÃO",
};

/** Etiqueta do card e da ficha: o lançamento prevalece sobre a finalidade. */
export function rotuloEtiqueta(i: { finalidade: Finalidade; lancamento: boolean }): "LANÇAMENTO" | "VENDA" | "LOCAÇÃO" {
  return i.lancamento ? "LANÇAMENTO" : i.finalidade === "locacao" ? "LOCAÇÃO" : "VENDA";
}
