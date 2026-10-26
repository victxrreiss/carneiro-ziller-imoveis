// Recebimento do interesse (lead) do formulário do imóvel: valida de novo no
// servidor, limita envios por IP, grava no banco e monta os avisos por e-mail
// (corretor responsável, ADMIN e LEADS_EMAIL). O envio dos e-mails fica com
// quem chama, depois da resposta: o lead já está salvo mesmo se o e-mail falhar.
import "server-only";
import { createHash } from "node:crypto";
import { and, eq, lt, sql } from "drizzle-orm";
import { emailsDeLeads } from "@/lib/config";
import { conexao, type Db } from "@/lib/dados/conexao";
import { imoveis, interesses, limitesEnvio, usuarios } from "@/lib/dados/esquema";
import { emailInteresse, type Mensagem } from "@/lib/painel/emails";
import { LIMITES } from "./validacao";

export const LIMITE_POR_IP = { envios: 10, janelaMin: 60 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONE = /^\+55\d{10,11}$/;

export type ErroInteresse = "dados" | "imovel" | "limite";

type Entrada = Record<string, unknown>;
const texto = (v: unknown) => (typeof v === "string" ? v.trim() : "");

function validar(o: Entrada) {
  const d = {
    imovelId: texto(o.imovelId).toLowerCase(),
    nome: texto(o.nome).replace(/\s+/g, " "),
    telefone: texto(o.telefone),
    email: texto(o.email).toLowerCase(),
    observacoes: texto(o.observacoes),
    origem: texto(o.origem) || "site",
    url: texto(o.url),
  };
  const ok =
    /^[a-z0-9-]{1,40}$/.test(d.imovelId) &&
    d.nome.length >= 2 &&
    d.nome.length <= LIMITES.nome &&
    TELEFONE.test(d.telefone) &&
    d.email.length <= LIMITES.email &&
    EMAIL.test(d.email) &&
    d.observacoes.length <= LIMITES.observacoes &&
    d.origem.length <= 40 &&
    d.url.length <= 500;
  return ok ? d : null;
}

/** Conta um envio na janela do IP; `false` se passou do limite. Atômico. */
async function dentroDoLimite(db: Db, ip: string, agora: number): Promise<boolean> {
  const chave = `interesse:${createHash("sha256").update(ip).digest("hex")}`;
  const fim = new Date(agora + LIMITE_POR_IP.janelaMin * 60_000);
  // Em `sql` cru o driver postgres-js não serializa Date: vai como ISO + cast.
  const agoraSql = sql`${new Date(agora).toISOString()}::timestamptz`;
  const fimSql = sql`${fim.toISOString()}::timestamptz`;
  const [r] = await db
    .insert(limitesEnvio)
    .values({ chave, contagem: 1, janelaAte: fim })
    .onConflictDoUpdate({
      target: limitesEnvio.chave,
      set: {
        contagem: sql`case when ${limitesEnvio.janelaAte} < ${agoraSql} then 1 else ${limitesEnvio.contagem} + 1 end`,
        janelaAte: sql`case when ${limitesEnvio.janelaAte} < ${agoraSql} then ${fimSql} else ${limitesEnvio.janelaAte} end`,
      },
    })
    .returning({ contagem: limitesEnvio.contagem });
  return r.contagem <= LIMITE_POR_IP.envios;
}

export async function registrarInteresse(
  entrada: Entrada,
  ip: string,
  agora = Date.now(),
  db: Db = conexao(),
): Promise<{ ok: true; id: string; avisos: Mensagem[] } | { ok: false; erro: ErroInteresse }> {
  const d = validar(entrada);
  if (!d) return { ok: false, erro: "dados" };

  const [imovel] = await db
    .select({ id: imoveis.id, codigo: imoveis.codigo, titulo: imoveis.titulo, responsavelId: imoveis.responsavelId })
    .from(imoveis)
    .where(and(eq(imoveis.id, d.imovelId), eq(imoveis.situacao, "publicado")))
    .limit(1);
  if (!imovel) return { ok: false, erro: "imovel" };

  if (!(await dentroDoLimite(db, ip || "desconhecido", agora))) return { ok: false, erro: "limite" };

  const [{ id }] = await db
    .insert(interesses)
    .values({ imovelId: imovel.id, codigo: imovel.codigo, nome: d.nome, telefone: d.telefone, email: d.email, observacoes: d.observacoes, origem: d.origem, url: d.url, criadoEm: new Date(agora) })
    .returning({ id: interesses.id });

  const destinos = new Set(emailsDeLeads());
  const equipe = await db
    .select({ id: usuarios.id, email: usuarios.email, papel: usuarios.papel })
    .from(usuarios)
    .where(eq(usuarios.situacao, "ativo"));
  for (const u of equipe) if (u.id === imovel.responsavelId || u.papel === "admin") destinos.add(u.email);

  const avisos = [...destinos].map((para) =>
    emailInteresse({ para, imovel, codigo: imovel.codigo, nome: d.nome, telefone: d.telefone, email: d.email, observacoes: d.observacoes, agora }),
  );
  return { ok: true, id, avisos };
}

/** Apaga janelas de limite vencidas (chamado pelo `fotos:limpar`). */
export async function limparLimitesVencidos(agora = Date.now(), db: Db = conexao()): Promise<number> {
  const r = await db.delete(limitesEnvio).where(lt(limitesEnvio.janelaAte, new Date(agora))).returning({ c: limitesEnvio.chave });
  return r.length;
}
