/**
 * IP do visitante para o limite de envios. `x-forwarded-for` pode ser forjado
 * pelo cliente, que escreve os primeiros valores; o confiável é o último, o
 * que o nosso proxy acrescentou. Ordem: `cf-connecting-ip` (Cloudflare),
 * `x-real-ip` (nginx) e, por último, o fim de `x-forwarded-for`.
 */
export function ipDoVisitante(headers: Pick<Headers, "get">): string {
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const lista = headers.get("x-forwarded-for")?.split(",").map((v) => v.trim()).filter(Boolean);
  return lista?.at(-1) ?? "";
}
