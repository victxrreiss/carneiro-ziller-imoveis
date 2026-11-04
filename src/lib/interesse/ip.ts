/**
 * IP do visitante para o limite de envios. Ordem de confiança:
 * - `x-real-ip`: o nginx grava `$remote_addr`, já resolvido pelo módulo real_ip
 *   só a partir das faixas da Cloudflare (deploy/nginx/). Quem chega direto na
 *   origem não consegue forjá-lo.
 * - `cf-connecting-ip`: sem o nginx na frente (ex.: local). Pode ser forjado por
 *   quem acessa a origem direto, por isso vem depois.
 * - o fim de `x-forwarded-for`, o valor que o último proxy acrescentou (os
 *   primeiros são escritos pelo cliente).
 */
export function ipDoVisitante(headers: Pick<Headers, "get">): string {
  const real = headers.get("x-real-ip")?.trim();
  if (real) return real;
  const cf = headers.get("cf-connecting-ip")?.trim();
  if (cf) return cf;
  const lista = headers.get("x-forwarded-for")?.split(",").map((v) => v.trim()).filter(Boolean);
  return lista?.at(-1) ?? "";
}
