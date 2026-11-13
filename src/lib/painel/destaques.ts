// Destaques da página inicial: lista ordenada que o ADMIN escolhe. Só imóvel
// publicado entra; quando um destaque sai por causa do imóvel (rascunho,
// indisponível, excluído) ou porque o ADMIN o tirou, fica um aviso para ele.
// Todas as funções recebem o banco como último parâmetro opcional (testes).
import { asc, eq, inArray, sql } from "drizzle-orm";
import { conexao, type Db } from "@/lib/dados/conexao";
import { carregarImoveis } from "@/lib/dados/consultas";
import { configuracaoSite, destaquesHome, imoveis, usuarios } from "@/lib/dados/esquema";
import type { AvisoDestaque } from "@/lib/dados/tipos";
import { completo, MAX_DESTAQUES_HOME } from "@/lib/imoveis/catalogo";
import { ehAdmin, type UsuarioLogado } from "./regras";

export { MAX_DESTAQUES_HOME };

export type LinhaDestaque = { id: string; codigo: string; titulo: string; capa: string | null; naHome: boolean };
export type AvisoParaAdmin = { aviso: AvisoDestaque; porNome: string; foiVoce: boolean };
export type ResultadoDestaque = { ok: true } | { ok: false; erro: "permissao" | "nao-publicado" | "inexistente" };

export async function lerAviso(db: Db): Promise<AvisoDestaque | null> {
  const [c] = await db.select().from(configuracaoSite).where(eq(configuracaoSite.id, 1)).limit(1);
  return c?.aviso ?? null;
}

export async function gravarAviso(db: Db, aviso: AvisoDestaque | null) {
  await db.insert(configuracaoSite).values({ id: 1, aviso }).onConflictDoUpdate({ target: configuracaoSite.id, set: { aviso } });
}

/** Põe o imóvel no fim da lista. Só se ele entrou de fato (não estava) o aviso é apagado: salvar de novo um destaque não mexe nele. */
export async function marcarNoFim(db: Db, imovelId: string) {
  const [{ proxima }] = await db.select({ proxima: sql<number>`coalesce(max(${destaquesHome.ordem}), 0) + 1` }).from(destaquesHome);
  const entrou = await db.insert(destaquesHome).values({ imovelId, ordem: proxima }).onConflictDoNothing().returning({ id: destaquesHome.imovelId });
  if (entrou.length) await gravarAviso(db, null);
}

/** Sem aviso: para quem tira o imóvel de publicado sem ser uma ação de pessoa (a importação da Loft). */
export async function sairDosDestaques(db: Db, imovelId: string) {
  await db.delete(destaquesHome).where(eq(destaquesHome.imovelId, imovelId));
}

/** Tira o imóvel da lista e grava o aviso. Devolve `false` se ele não era destaque (nada muda). */
export async function tirarDosDestaques(db: Db, imovelId: string, aviso: AvisoDestaque): Promise<boolean> {
  const tirados = await db.delete(destaquesHome).where(eq(destaquesHome.imovelId, imovelId)).returning({ id: destaquesHome.imovelId });
  if (!tirados.length) return false;
  await gravarAviso(db, aviso);
  return true;
}

/** Destaques de imóveis publicados, na ordem escolhida. */
async function ordenados(db: Db) {
  const linhas = await db
    .select({ id: destaquesHome.imovelId, ordem: destaquesHome.ordem })
    .from(destaquesHome)
    .innerJoin(imoveis, eq(imoveis.id, destaquesHome.imovelId))
    .where(eq(imoveis.situacao, "publicado"))
    .orderBy(asc(destaquesHome.ordem));
  return linhas;
}

export async function listarDestaques(
  u: UsuarioLogado,
  db: Db = conexao(),
): Promise<{ itens: LinhaDestaque[]; aviso: AvisoParaAdmin | null }> {
  if (!ehAdmin(u)) return { itens: [], aviso: null };
  const ordem = await ordenados(db);
  const registros = ordem.length ? new Map((await carregarImoveis(db, inArray(imoveis.id, ordem.map((o) => o.id)))).map((r) => [r.id, r])) : new Map();
  // Mesma regra de `destaquesHome` (catálogo): só imóvel completo conta, e os 6 primeiros deles vão para a Home.
  let naHomeAteAgora = 0;
  const itens = ordem.flatMap((o) => {
    const r = registros.get(o.id);
    if (!r) return [];
    const naHome = completo(r) && naHomeAteAgora < MAX_DESTAQUES_HOME;
    if (naHome) naHomeAteAgora++;
    return [{ id: r.id, codigo: r.codigo, titulo: r.titulo, capa: r.fotos[0]?.src ?? null, naHome }];
  });
  const aviso = await lerAviso(db);
  let porNome = "—";
  if (aviso) {
    const [autor] = await db.select({ nome: usuarios.nome }).from(usuarios).where(eq(usuarios.id, aviso.porId)).limit(1);
    porNome = autor?.nome ?? "—";
  }
  return { itens, aviso: aviso ? { aviso, porNome, foiVoce: aviso.porId === u.id } : null };
}

export async function marcarDestaque(u: UsuarioLogado, imovelId: string, marcar: boolean, db: Db = conexao()): Promise<ResultadoDestaque> {
  if (!ehAdmin(u)) return { ok: false, erro: "permissao" };
  const [r] = await carregarImoveis(db, eq(imoveis.id, imovelId));
  if (!r) return { ok: false, erro: "inexistente" };
  if (marcar && r.situacao !== "publicado") return { ok: false, erro: "nao-publicado" };
  await db.transaction(async (tx) => {
    if (marcar) await marcarNoFim(tx, r.id);
    else await tirarDosDestaques(tx, r.id, { porId: u.id, codigo: r.codigo, titulo: r.titulo || "Imóvel sem título", motivo: "desmarcado", em: new Date().toISOString() });
  });
  return { ok: true };
}

/** Troca de lugar com o vizinho; nas pontas não faz nada. */
export async function moverDestaque(u: UsuarioLogado, imovelId: string, direcao: "subir" | "descer", db: Db = conexao()): Promise<ResultadoDestaque> {
  if (!ehAdmin(u)) return { ok: false, erro: "permissao" };
  const lista = await ordenados(db);
  const i = lista.findIndex((l) => l.id === imovelId);
  if (i < 0) return { ok: false, erro: "inexistente" };
  const j = direcao === "subir" ? i - 1 : i + 1;
  if (j < 0 || j >= lista.length) return { ok: true };
  await db.transaction(async (tx) => {
    await tx.update(destaquesHome).set({ ordem: lista[j].ordem }).where(eq(destaquesHome.imovelId, lista[i].id));
    await tx.update(destaquesHome).set({ ordem: lista[i].ordem }).where(eq(destaquesHome.imovelId, lista[j].id));
  });
  return { ok: true };
}
