// Manutenção de fotos: apaga do armazenamento e do banco o que nunca virou parte
// de um imóvel. Roda por `npm run fotos:limpar` (agendar é do ambiente).
import { and, eq, lt, or, sql } from "drizzle-orm";
import type { ArmazenamentoFotos } from "@/lib/armazenamento";
import type { Db } from "@/lib/dados/criar-conexao";
import { fotos } from "@/lib/dados/esquema";

const HORA = 3600_000;
export const IDADE_MINIMA_H = 24;

/**
 * Remove fotos com mais de 24 h que não foram confirmadas ou não estão ligadas a
 * nenhum imóvel (foto tirada na edição, upload não salvo, remoção que falhou).
 */
export async function limparFotosOrfas(db: Db, armazenamento: ArmazenamentoFotos, agora = Date.now()): Promise<number> {
  const antigas = and(
    lt(fotos.criadoEm, new Date(agora - IDADE_MINIMA_H * HORA)),
    or(eq(fotos.confirmada, false), sql`not exists (select 1 from imovel_fotos where imovel_fotos.foto_id = ${fotos.id})`),
  );
  const orfas = await db.select({ id: fotos.id, chave: fotos.chave }).from(fotos).where(antigas);
  if (!orfas.length) return 0;
  // Objeto primeiro: se falhar, a linha fica e a próxima execução tenta de novo.
  await armazenamento.remover(orfas.map((f) => f.chave));
  const apagadas = await db.delete(fotos).where(and(antigas, sql`${fotos.id} in ${orfas.map((f) => f.id)}`)).returning({ id: fotos.id });
  return apagadas.length;
}

/** Rotina diária: fotos órfãs, sessões e links vencidos, bloqueios e limites antigos. */
export async function executarLimpeza(db: Db, armazenamento: ArmazenamentoFotos, agora = Date.now()) {
  const { limparExpirados } = await import("./contas");
  const { limparLimitesVencidos } = await import("@/lib/interesse/servidor");
  const fotosRemovidas = await limparFotosOrfas(db, armazenamento, agora);
  const expirados = await limparExpirados(agora, db);
  const limites = await limparLimitesVencidos(agora, db);
  return { fotos: fotosRemovidas, ...expirados, limites };
}
