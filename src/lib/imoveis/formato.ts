import type { Finalidade } from "./types";

const milhar = (n: number) => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");

export function formatarReais(valor: number): string {
  return `R$ ${milhar(valor)}`;
}

/** Preço como aparece no card do grid: locação leva "/mês". */
export function formatarPreco(valor: number, finalidade: Finalidade): string {
  return formatarReais(valor) + (finalidade === "locacao" ? "/mês" : "");
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
  lancamento: "LANÇAMENTO",
};
