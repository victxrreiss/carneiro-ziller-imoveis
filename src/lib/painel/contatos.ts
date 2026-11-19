// Contatos (leads) no painel: lista paginada, mais recentes primeiro. Todo
// usuário do painel vê todos, inclusive o contato geral e o lead de imóvel
// excluído (decisão do usuário, 19/11/2026; ver `podeEditar` em regras.ts).
import { desc, eq, sql } from "drizzle-orm";
import { conexao, type Db } from "@/lib/dados/conexao";
import { imoveis, interesses } from "@/lib/dados/esquema";
import { podeEditar, type UsuarioLogado } from "./regras";

export const CONTATOS_POR_PAGINA = 30;

export type LinhaContato = {
  id: string;
  criadoEm: Date;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  origem: string;
  /** Código do imóvel na hora do envio; vazio no contato geral. Fica mesmo se o imóvel for excluído. */
  codigo: string;
  /** Caminho + query da página de onde veio o contato. */
  pagina: string;
  imovel: { id: string; codigo: string; titulo: string } | null;
};

export async function listarContatos(
  u: UsuarioLogado,
  pagina: number,
  db: Db = conexao(),
): Promise<{ itens: LinhaContato[]; total: number; pagina: number; paginas: number }> {
  // Regra de visibilidade (vive aqui): quem pode editar imóveis vê todo contato.
  const filtro = podeEditar(u) ? undefined : sql`false`;

  const [{ total }] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(interesses)
    .leftJoin(imoveis, eq(interesses.imovelId, imoveis.id))
    .where(filtro);

  const paginas = Math.max(1, Math.ceil(total / CONTATOS_POR_PAGINA));
  const atual = Math.min(Math.max(1, Number.isFinite(pagina) ? Math.trunc(pagina) : 1), paginas);

  const linhas = await db
    .select({
      id: interesses.id,
      criadoEm: interesses.criadoEm,
      nome: interesses.nome,
      telefone: interesses.telefone,
      email: interesses.email,
      observacoes: interesses.observacoes,
      origem: interesses.origem,
      codigo: interesses.codigo,
      pagina: interesses.url,
      imovelId: imoveis.id,
      imovelCodigo: imoveis.codigo,
      imovelTitulo: imoveis.titulo,
    })
    .from(interesses)
    .leftJoin(imoveis, eq(interesses.imovelId, imoveis.id))
    .where(filtro)
    .orderBy(desc(interesses.criadoEm), desc(interesses.id))
    .limit(CONTATOS_POR_PAGINA)
    .offset((atual - 1) * CONTATOS_POR_PAGINA);

  const itens = linhas.map(({ imovelId, imovelCodigo, imovelTitulo, ...l }) => ({
    ...l,
    imovel: imovelId === null ? null : { id: imovelId, codigo: imovelCodigo ?? "", titulo: imovelTitulo ?? "" },
  }));
  return { itens, total, pagina: atual, paginas };
}
