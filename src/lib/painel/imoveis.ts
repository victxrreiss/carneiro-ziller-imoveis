// Imóveis no painel: lista, edição, publicação, exclusão e a Oportunidade de
// hoje da Home. Toda permissão é conferida aqui, não só na tela.
import { banco } from "@/lib/dados/banco";
import type { AvisoOportunidade, FotoRegistro, RegistroImovel, SituacaoImovel } from "@/lib/dados/tipos";
import {
  LIMITES,
  TIPOS_FOTO,
  ehAdmin,
  podeEditar,
  situacaoDestino,
  validarImovel,
  type EntradaImovel,
  type ErrosImovel,
  type Intencao,
  type UsuarioLogado,
} from "./regras";

export type LinhaImovel = {
  id: string;
  codigo: string;
  titulo: string;
  finalidade: RegistroImovel["finalidade"];
  lancamento: boolean;
  tipo: string | null;
  bairro: string;
  cidade: string;
  valor: number | null;
  situacao: SituacaoImovel;
  responsavelId: string;
  responsavelNome: string;
  alteradoEm: string;
  capa: string | null;
  podeEditar: boolean;
  oportunidade: boolean;
};

const nomeDe = (id: string) => banco().usuarios.get(id)?.nome ?? "—";

/** Todos veem todos; o Corretor edita só os próprios. Ordem: última alteração primeiro. */
export function listarImoveis(u: UsuarioLogado): LinhaImovel[] {
  const oportunidade = banco().oportunidadeId;
  return [...banco().imoveis.values()]
    .sort((a, b) => b.alteradoEm.localeCompare(a.alteradoEm))
    .map((r) => ({
      id: r.id,
      codigo: r.codigo,
      titulo: r.titulo,
      finalidade: r.finalidade,
      lancamento: r.lancamento,
      tipo: r.tipo,
      bairro: r.bairro,
      cidade: r.cidade,
      valor: r.valor,
      situacao: r.situacao,
      responsavelId: r.responsavelId,
      responsavelNome: nomeDe(r.responsavelId),
      alteradoEm: r.alteradoEm,
      capa: r.fotos[0]?.src ?? null,
      podeEditar: podeEditar(u, r),
      oportunidade: r.id === oportunidade && r.situacao === "publicado",
    }));
}

export type ImovelEdicao = {
  id: string;
  codigo: string;
  entrada: EntradaImovel;
  fotos: (FotoRegistro & { alt: string })[];
  situacao: SituacaoImovel;
  responsavelId: string;
  responsavelNome: string;
  criadoEm: string;
  alteradoEm: string;
  alteradoPorNome: string;
  podeEditar: boolean;
  oportunidade: boolean;
};

const digitos = (n: number | null) => (n === null ? "" : String(n));

export function obterParaEdicao(u: UsuarioLogado, id: string): ImovelEdicao | null {
  const r = banco().imoveis.get(id);
  if (!r) return null;
  return {
    id: r.id,
    codigo: r.codigo,
    entrada: {
      finalidade: r.finalidade ?? "",
      lancamento: r.lancamento,
      tipo: r.tipo ?? "",
      titulo: r.titulo,
      bairro: r.bairro,
      cidade: r.cidade,
      uf: r.uf,
      valor: digitos(r.valor),
      area: digitos(r.area),
      quartos: digitos(r.quartos),
      vagas: digitos(r.vagas),
      descricao: r.descricao,
      fotos: r.fotos.map((f) => ({ id: f.id, alt: f.alt })),
      situacao: r.situacao,
      responsavelId: r.responsavelId,
      oportunidade: banco().oportunidadeId === r.id,
    },
    fotos: r.fotos,
    situacao: r.situacao,
    responsavelId: r.responsavelId,
    responsavelNome: nomeDe(r.responsavelId),
    criadoEm: r.criadoEm,
    alteradoEm: r.alteradoEm,
    alteradoPorNome: nomeDe(r.alteradoPorId),
    podeEditar: podeEditar(u, r),
    oportunidade: banco().oportunidadeId === r.id,
  };
}

/** Usuários que podem ser responsáveis (ativos), mais o atual se tiver sido desativado. */
export function opcoesResponsavel(atualId?: string): { id: string; nome: string; desativado: boolean }[] {
  return [...banco().usuarios.values()]
    .filter((u) => u.situacao === "ativo" || u.id === atualId)
    .map((u) => ({ id: u.id, nome: u.nome, desativado: u.situacao !== "ativo" }))
    .sort((a, b) => a.nome.localeCompare(b.nome));
}

export function oportunidadeAtual(): { id: string; codigo: string; titulo: string } | null {
  const id = banco().oportunidadeId;
  const r = id ? banco().imoveis.get(id) : undefined;
  return r && r.situacao === "publicado" ? { id: r.id, codigo: r.codigo, titulo: r.titulo } : null;
}

export type AvisoParaAdmin = { aviso: AvisoOportunidade | null; porNome: string | null; foiVoce: boolean };

/** Só para o ADMIN: Oportunidade de hoje vazia e, se houver, quem tirou o imóvel do ar. */
export function avisoOportunidadeVazia(u: UsuarioLogado): AvisoParaAdmin | null {
  if (!ehAdmin(u) || oportunidadeAtual()) return null;
  const aviso = banco().avisoOportunidade;
  return { aviso, porNome: aviso ? nomeDe(aviso.porId) : null, foiVoce: aviso?.porId === u.id };
}

function esvaziarOportunidade(u: UsuarioLogado, r: RegistroImovel, motivo: AvisoOportunidade["motivo"]) {
  banco().oportunidadeId = null;
  banco().avisoOportunidade = { porId: u.id, codigo: r.codigo, titulo: r.titulo || "Imóvel sem título", motivo, em: new Date().toISOString() };
}

function proximoCodigo(): string {
  const maior = Math.max(1000, ...[...banco().imoveis.values()].map((r) => Number(r.codigo.replace(/\D/g, "")) || 0));
  return `CZ${maior + 1}`;
}

// ---------- Fotos ----------

export type ErroUpload = "tipo" | "tamanho" | "dimensoes";

export function guardarFoto(u: UsuarioLogado, bytes: Uint8Array, tipo: string, largura: number, altura: number): { ok: true; id: string; src: string } | { ok: false; erro: ErroUpload } {
  if (!(TIPOS_FOTO as readonly string[]).includes(tipo)) return { ok: false, erro: "tipo" };
  if (bytes.byteLength > LIMITES.fotoMB * 1024 * 1024) return { ok: false, erro: "tamanho" };
  if (!(largura > 0 && altura > 0 && largura <= 20000 && altura <= 20000)) return { ok: false, erro: "dimensoes" };
  const id = crypto.randomUUID();
  banco().fotos.set(id, { bytes, tipo, largura: Math.round(largura), altura: Math.round(altura), enviadoPorId: u.id });
  return { ok: true, id, src: `/fotos/${id}` };
}

export function lerFoto(id: string) {
  return banco().fotos.get(id) ?? null;
}

// ---------- Salvar ----------

export type ResultadoSalvar =
  | { ok: true; id: string; codigo: string; situacao: SituacaoImovel; novo: boolean; oportunidadeSaiu: boolean }
  | { ok: false; erros: ErrosImovel }
  | { ok: false; proibido: true }
  | { ok: false; inexistente: true };

export function salvarImovel(u: UsuarioLogado, id: string | null, e: EntradaImovel, intencao: Intencao, agora = new Date()): ResultadoSalvar {
  const existente = id ? banco().imoveis.get(id) : undefined;
  if (id && !existente) return { ok: false, inexistente: true };
  if (existente && !podeEditar(u, existente)) return { ok: false, proibido: true };

  // Rascunho só existe antes da primeira publicação; depois a situação vem do campo.
  const destino = situacaoDestino(intencao, e.situacao);
  const { erros, dados } = validarImovel(e, destino);

  const fotos: FotoRegistro[] = [];
  for (const f of e.fotos) {
    const anterior = existente?.fotos.find((x) => x.id === f.id);
    const enviada = banco().fotos.get(f.id);
    if (anterior) fotos.push({ ...anterior, alt: f.alt.trim() });
    else if (enviada) fotos.push({ id: f.id, src: `/fotos/${f.id}`, alt: f.alt.trim(), largura: enviada.largura, altura: enviada.altura });
    else erros.fotos ??= "Uma das fotos não terminou de enviar. Remova-a ou envie de novo.";
  }
  if (Object.keys(erros).length) return { ok: false, erros };

  const responsavelId =
    ehAdmin(u) && e.responsavelId && banco().usuarios.get(e.responsavelId) ? e.responsavelId : (existente?.responsavelId ?? u.id);
  const quando = agora.toISOString();
  const r: RegistroImovel = existente ?? {
    id: "",
    codigo: "",
    finalidade: null,
    lancamento: false,
    tipo: null,
    titulo: "",
    bairro: "",
    cidade: "",
    uf: "MG",
    valor: null,
    area: null,
    quartos: null,
    vagas: null,
    descricao: "",
    fotos: [],
    situacao: "rascunho",
    responsavelId,
    criadoEm: quando,
    alteradoEm: quando,
    alteradoPorId: u.id,
    publicadoEm: null,
  };
  if (!existente) {
    r.codigo = proximoCodigo();
    r.id = r.codigo.toLowerCase();
    banco().imoveis.set(r.id, r);
  }
  Object.assign(r, dados, { fotos, situacao: destino, responsavelId, alteradoEm: quando, alteradoPorId: u.id });
  if (destino === "publicado" && !r.publicadoEm) r.publicadoEm = quando;

  // Oportunidade de hoje: só publicado; marcar substitui o atual; só o ADMIN escolhe.
  let oportunidadeSaiu = false;
  const ehAtual = banco().oportunidadeId === r.id;
  if (ehAtual && destino !== "publicado") {
    esvaziarOportunidade(u, r, destino === "indisponivel" ? "indisponivel" : "rascunho");
    oportunidadeSaiu = true;
  } else if (ehAdmin(u) && e.oportunidade !== undefined) {
    if (e.oportunidade && destino === "publicado") {
      banco().oportunidadeId = r.id;
      banco().avisoOportunidade = null;
    } else if (!e.oportunidade && ehAtual) {
      esvaziarOportunidade(u, r, "desmarcado");
      oportunidadeSaiu = true;
    }
  }

  return { ok: true, id: r.id, codigo: r.codigo, situacao: destino, novo: !existente, oportunidadeSaiu };
}

/** Só ADMIN. Se for o imóvel da Oportunidade de hoje, a seção fica vazia. */
export function excluirImovel(u: UsuarioLogado, id: string): { ok: true; codigo: string; titulo: string; oportunidadeSaiu: boolean } | { ok: false } {
  if (!ehAdmin(u)) return { ok: false };
  const r = banco().imoveis.get(id);
  if (!r) return { ok: false };
  const eraOportunidade = banco().oportunidadeId === id;
  if (eraOportunidade) esvaziarOportunidade(u, r, "excluido");
  banco().imoveis.delete(id);
  return { ok: true, codigo: r.codigo, titulo: r.titulo, oportunidadeSaiu: eraOportunidade };
}
