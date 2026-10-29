// Importa a semente de imóveis para um banco e um armazenamento (dev, e2e e testes).
// Todas as fotos passam pelo mesmo caminho do painel: objeto no armazenamento +
// linha em `fotos` confirmada. O responsável de todos os anúncios é `responsavelId`.
import { count, sql } from "drizzle-orm";
import { createHash } from "node:crypto";
import type { ArmazenamentoFotos } from "../src/lib/armazenamento";
import type { Db } from "../src/lib/dados/criar-conexao";
import { configuracaoSite, fotos, imovelFotos, imoveis } from "../src/lib/dados/esquema";
import { OPORTUNIDADE_INICIAL, sementeImoveis } from "./semente-imoveis";

/** UUID estável por imóvel e posição: semear de novo gera as mesmas URLs de foto (o HTML pré-renderizado continua válido). */
function idDaFoto(imovelId: string, ordem: number): string {
  const h = createHash("sha1").update(`semente:${imovelId}:${ordem}`).digest("hex");
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-4${h.slice(13, 16)}-a${h.slice(17, 20)}-${h.slice(20, 32)}`;
}

export type OpcoesImportacao = {
  responsavelId: string;
  armazenamento: ArmazenamentoFotos;
  /** Bytes do arquivo de foto da semente (em `public/images/imoveis`). */
  lerArquivo: (arquivo: string) => Promise<Uint8Array>;
  /** Só estes imóveis da semente (ex.: os exemplos de produção). Sem isto, todos. */
  ids?: string[];
};

export async function importarImoveis(db: Db, o: OpcoesImportacao): Promise<{ imoveis: number; fotos: number }> {
  const [{ n }] = await db.select({ n: count() }).from(imoveis);
  if (n > 0) throw new Error("O banco já tem imóveis. A semente só roda em banco vazio.");

  let totalFotos = 0;
  const semente = sementeImoveis();
  const desconhecidos = (o.ids ?? []).filter((id) => !semente.some((s) => s.id === id));
  if (desconhecidos.length) throw new Error(`Imóveis fora da semente: ${desconhecidos.join(", ")}.`);
  const lista = o.ids ? semente.filter((s) => o.ids!.includes(s.id)) : semente;
  for (const s of lista) {
    const ligacoes: { fotoId: string; ordem: number; alt: string }[] = [];
    for (const [ordem, f] of s.fotos.entries()) {
      const id = idDaFoto(s.id, ordem);
      const chave = `fotos/${id}.jpg`;
      const bytes = await o.lerArquivo(f.arquivo);
      await o.armazenamento.enviar(chave, bytes, "image/jpeg");
      await db.insert(fotos).values({ id, chave, tipo: "image/jpeg", tamanho: bytes.byteLength, largura: f.largura, altura: f.altura, enviadoPorId: o.responsavelId, confirmada: true });
      ligacoes.push({ fotoId: id, ordem, alt: f.alt });
      totalFotos++;
    }
    await db.insert(imoveis).values({
      id: s.id,
      codigo: s.codigo,
      finalidade: s.finalidade,
      lancamento: s.lancamento,
      tipo: s.tipo,
      titulo: s.titulo,
      bairro: s.bairro,
      cidade: s.cidade,
      uf: s.uf,
      valor: s.valor,
      area: s.area,
      quartos: s.quartos,
      vagas: s.vagas,
      descricao: s.descricao,
      situacao: s.situacao,
      responsavelId: o.responsavelId,
      criadoEm: s.criadoEm,
      alteradoEm: s.publicadoEm,
      alteradoPorId: o.responsavelId,
      publicadoEm: s.publicadoEm,
    });
    await db.insert(imovelFotos).values(ligacoes.map((l) => ({ imovelId: s.id, ...l })));
  }
  // Os códigos entraram explícitos: o próximo gerado pela sequence continua depois do maior.
  const maior = Math.max(...lista.map((s) => Number(s.codigo.replace(/\D/g, ""))));
  await db.execute(sql`select setval('imovel_codigo_seq', ${maior})`);
  if (!lista.some((s) => s.id === OPORTUNIDADE_INICIAL)) return { imoveis: lista.length, fotos: totalFotos };
  await db.insert(configuracaoSite).values({ id: 1, oportunidadeId: OPORTUNIDADE_INICIAL, aviso: null }).onConflictDoUpdate({ target: configuracaoSite.id, set: { oportunidadeId: OPORTUNIDADE_INICIAL, aviso: null } });
  return { imoveis: lista.length, fotos: totalFotos };
}
