"use server";

// Server Actions dos destaques da página inicial. Só o ADMIN muda a lista
// (conferido de novo em lib/painel/destaques) e o site é atualizado na hora (updateTag).
import { updateTag } from "next/cache";
import { TAG_IMOVEIS } from "@/lib/imoveis";
import { marcarDestaque, moverDestaque, type ResultadoDestaque } from "@/lib/painel/destaques";
import { usuarioDaAcao } from "@/lib/painel/sessao";

const invalido: ResultadoDestaque = { ok: false, erro: "inexistente" };

export async function marcarDestaqueAction(imovelId: unknown, marcar: unknown): Promise<ResultadoDestaque> {
  const u = await usuarioDaAcao();
  if (typeof imovelId !== "string" || typeof marcar !== "boolean") return invalido;
  const r = await marcarDestaque(u, imovelId, marcar);
  if (r.ok) updateTag(TAG_IMOVEIS);
  return r;
}

export async function moverDestaqueAction(imovelId: unknown, direcao: unknown): Promise<ResultadoDestaque> {
  const u = await usuarioDaAcao();
  if (typeof imovelId !== "string" || (direcao !== "subir" && direcao !== "descer")) return invalido;
  const r = await moverDestaque(u, imovelId, direcao);
  if (r.ok) updateTag(TAG_IMOVEIS);
  return r;
}
