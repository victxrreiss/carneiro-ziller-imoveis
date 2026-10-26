// Datas do painel no fuso de Belo Horizonte. Sem dependência de servidor:
// usadas tanto nas páginas quanto nos componentes de cliente.
const FUSO = "America/Sao_Paulo";

const fmt = (iso: string, o: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat("pt-BR", { timeZone: FUSO, ...o }).format(new Date(iso));

/** 21/10/2026 */
export function data(iso: string): string {
  return fmt(iso, { day: "2-digit", month: "2-digit", year: "numeric" });
}

/** 10h30 */
export function hora(iso: string): string {
  return fmt(iso, { hour: "2-digit", minute: "2-digit" }).replace(":", "h");
}

/** 21/10/2026, 10h30 */
export function dataHora(iso: string): string {
  return `${data(iso)}, ${hora(iso)}`;
}

/** 21/10/2026, às 10h30 */
export function dataAsHora(iso: string): string {
  return `${data(iso)}, às ${hora(iso)}`;
}
