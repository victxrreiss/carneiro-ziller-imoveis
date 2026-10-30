"use server";

// Server Actions dos imóveis do painel. A permissão é conferida de novo em cada
// chamada (lib/painel/imoveis) e o site é atualizado na hora (updateTag).
import { updateTag } from "next/cache";
import type { SituacaoImovel } from "@/lib/dados/tipos";
import { TAG_IMOVEIS } from "@/lib/imoveis";
import { excluirImovel, obterParaEdicao, salvarImovel, type ImovelEdicao } from "@/lib/painel/imoveis";
import type { EntradaImovel, ErrosImovel, Intencao } from "@/lib/painel/regras";
import { usuarioDaAcao } from "@/lib/painel/sessao";

const SITUACOES: SituacaoImovel[] = ["rascunho", "publicado", "indisponivel"];
const INTENCOES: Intencao[] = ["rascunho", "publicar", "salvar"];

const str = (v: unknown, max = 20_000) => (typeof v === "string" ? v.slice(0, max) : "");

/** A entrada vem do cliente: só os campos e tipos esperados passam. */
function sanear(e: unknown): EntradaImovel {
  const o = (e && typeof e === "object" ? e : {}) as Record<string, unknown>;
  const fotos = Array.isArray(o.fotos) ? o.fotos.slice(0, 200) : [];
  return {
    finalidade: o.finalidade === "venda" || o.finalidade === "locacao" ? o.finalidade : "",
    lancamento: o.lancamento === true,
    tipo: str(o.tipo, 100),
    titulo: str(o.titulo, 500),
    bairro: str(o.bairro, 200),
    cidade: str(o.cidade, 200),
    uf: str(o.uf, 2),
    valor: str(o.valor, 20).replace(/\D/g, ""),
    area: str(o.area, 20).replace(/\D/g, ""),
    quartos: str(o.quartos, 4).replace(/\D/g, ""),
    vagas: str(o.vagas, 4).replace(/\D/g, ""),
    banheiros: str(o.banheiros, 4).replace(/\D/g, ""),
    suites: str(o.suites, 4).replace(/\D/g, ""),
    areaTotal: str(o.areaTotal, 20).replace(/\D/g, ""),
    condominio: str(o.condominio, 20).replace(/\D/g, ""),
    iptu: str(o.iptu, 20).replace(/\D/g, ""),
    valorLocacao: str(o.valorLocacao, 20).replace(/\D/g, ""),
    andar: str(o.andar, 4).replace(/\D/g, ""),
    anoConstrucao: str(o.anoConstrucao, 4).replace(/\D/g, ""),
    empreendimento: str(o.empreendimento, 500),
    endereco: str(o.endereco, 500),
    numero: str(o.numero, 500),
    complemento: str(o.complemento, 500),
    cep: str(o.cep, 20).trim(),
    caracteristicas: Array.isArray(o.caracteristicas) ? o.caracteristicas.filter((c): c is string => typeof c === "string").slice(0, 200) : [],
    descricao: str(o.descricao),
    fotos: fotos
      .filter((f): f is Record<string, unknown> => !!f && typeof f === "object")
      .map((f) => ({ id: str(f.id, 100), alt: str(f.alt, 500) })),
    situacao: SITUACOES.includes(o.situacao as SituacaoImovel) ? (o.situacao as SituacaoImovel) : "rascunho",
    responsavelId: typeof o.responsavelId === "string" ? o.responsavelId : undefined,
    oportunidade: typeof o.oportunidade === "boolean" ? o.oportunidade : undefined,
  };
}

export type RespostaSalvar =
  | { ok: true; novo: boolean; codigo: string; situacao: SituacaoImovel; oportunidadeSaiu: boolean; imovel: ImovelEdicao }
  | { ok: false; erros: ErrosImovel }
  | { ok: false; falha: "proibido" | "inexistente" };

export async function salvarImovelAction(id: string | null, entrada: unknown, intencao: unknown): Promise<RespostaSalvar> {
  const u = await usuarioDaAcao();
  const acao = INTENCOES.includes(intencao as Intencao) ? (intencao as Intencao) : "rascunho";
  const r = await salvarImovel(u, typeof id === "string" ? id : null, sanear(entrada), acao);
  if (!r.ok) {
    if ("erros" in r) return { ok: false, erros: r.erros };
    return { ok: false, falha: "proibido" in r ? "proibido" : "inexistente" };
  }
  updateTag(TAG_IMOVEIS);
  return { ok: true, novo: r.novo, codigo: r.codigo, situacao: r.situacao, oportunidadeSaiu: r.oportunidadeSaiu, imovel: (await obterParaEdicao(u, r.id))! };
}

export async function excluirImovelAction(id: unknown): Promise<{ ok: true; codigo: string; titulo: string; oportunidadeSaiu: boolean } | { ok: false }> {
  const u = await usuarioDaAcao();
  if (typeof id !== "string") return { ok: false };
  const r = await excluirImovel(u, id);
  if (r.ok) updateTag(TAG_IMOVEIS);
  return r;
}
