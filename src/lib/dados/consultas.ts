// Leitura de imóveis com as fotos, compartilhada pelo site (lib/imoveis) e pelo
// painel (lib/painel). Converte linhas do banco em RegistroImovel.
import { asc, eq, inArray, type SQL } from "drizzle-orm";
import { armazenamento } from "@/lib/armazenamento";
import type { Db } from "./criar-conexao";
import { fotos as tabFotos, imovelFotos, imoveis } from "./esquema";
import type { FotoRegistro, RegistroImovel } from "./tipos";

type LinhaImovel = typeof imoveis.$inferSelect;

async function fotosDe(db: Db, ids: string[]): Promise<Map<string, FotoRegistro[]>> {
  const mapa = new Map<string, FotoRegistro[]>();
  if (!ids.length) return mapa;
  const linhas = await db
    .select({ imovelId: imovelFotos.imovelId, alt: imovelFotos.alt, foto: tabFotos })
    .from(imovelFotos)
    .innerJoin(tabFotos, eq(tabFotos.id, imovelFotos.fotoId))
    .where(inArray(imovelFotos.imovelId, ids))
    .orderBy(asc(imovelFotos.imovelId), asc(imovelFotos.ordem));
  const a = armazenamento();
  for (const l of linhas) {
    const lista = mapa.get(l.imovelId) ?? [];
    lista.push({ id: l.foto.id, src: a.urlPublica(l.foto.chave), alt: l.alt, largura: l.foto.largura, altura: l.foto.altura });
    mapa.set(l.imovelId, lista);
  }
  return mapa;
}

function paraRegistro(r: LinhaImovel, fotos: FotoRegistro[]): RegistroImovel {
  return {
    id: r.id,
    codigo: r.codigo,
    finalidade: r.finalidade,
    lancamento: r.lancamento,
    tipo: r.tipo,
    titulo: r.titulo,
    bairro: r.bairro,
    cidade: r.cidade,
    uf: r.uf,
    valor: r.valor,
    area: r.area,
    quartos: r.quartos,
    vagas: r.vagas,
    banheiros: r.banheiros,
    suites: r.suites,
    areaTotal: r.areaTotal,
    condominio: r.condominio,
    iptu: r.iptu,
    valorLocacao: r.valorLocacao,
    caracteristicas: r.caracteristicas,
    andar: r.andar,
    anoConstrucao: r.anoConstrucao,
    empreendimento: r.empreendimento,
    endereco: r.endereco,
    numero: r.numero,
    complemento: r.complemento,
    cep: r.cep,
    referenciaLoft: r.referenciaLoft,
    descricao: r.descricao,
    fotos,
    situacao: r.situacao,
    responsavelId: r.responsavelId,
    criadoEm: r.criadoEm.toISOString(),
    alteradoEm: r.alteradoEm.toISOString(),
    alteradoPorId: r.alteradoPorId,
    publicadoEm: r.publicadoEm ? r.publicadoEm.toISOString() : null,
  };
}

/** Imóveis (todos, ou os que passam em `onde`), na ordem do código. */
export async function carregarImoveis(db: Db, onde?: SQL): Promise<RegistroImovel[]> {
  const linhas = await db.select().from(imoveis).where(onde).orderBy(asc(imoveis.codigo));
  const fotos = await fotosDe(db, linhas.map((l) => l.id));
  return linhas.map((l) => paraRegistro(l, fotos.get(l.id) ?? []));
}

export async function carregarImovel(db: Db, id: string): Promise<RegistroImovel | null> {
  const [linha] = await db.select().from(imoveis).where(eq(imoveis.id, id)).limit(1);
  if (!linha) return null;
  return paraRegistro(linha, (await fotosDe(db, [id])).get(id) ?? []);
}
