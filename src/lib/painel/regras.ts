// Regras do painel que não dependem de sessão nem de banco: permissões por
// papel e validação do cadastro de imóvel. Mensagens iguais às do design.
import type { Finalidade, Papel, SituacaoImovel } from "@/lib/dados/tipos";
import { TIPOS } from "@/lib/imoveis/filtros";
import { SENHA_MINIMO } from "@/lib/seguranca/politica";

export const UFS = [
  "AC", "AL", "AP", "AM", "BA", "CE", "DF", "ES", "GO", "MA", "MT", "MS", "MG", "PA",
  "PB", "PR", "PE", "PI", "RJ", "RN", "RS", "RO", "RR", "SC", "SP", "SE", "TO",
] as const;

export const LIMITES = { titulo: 90, alt: 140, nome: 120, fotos: 60, fotoMB: 15 } as const;
export const TIPOS_FOTO = ["image/jpeg", "image/png", "image/webp"] as const;

export type UsuarioLogado = { id: string; nome: string; email: string; papel: Papel };

export const ehAdmin = (u: Pick<UsuarioLogado, "papel">) => u.papel === "admin";

/** ADMIN edita qualquer imóvel; Corretor só os que tem como responsável. */
export function podeEditar(u: UsuarioLogado, imovel: { responsavelId: string }): boolean {
  return ehAdmin(u) || imovel.responsavelId === u.id;
}

// ---------- Cadastro de imóvel ----------

export type EntradaImovel = {
  finalidade: Finalidade | "";
  lancamento: boolean;
  tipo: string;
  titulo: string;
  bairro: string;
  cidade: string;
  uf: string;
  /** Só dígitos (a máscara de milhar é da tela). */
  valor: string;
  area: string;
  quartos: string;
  vagas: string;
  descricao: string;
  /** Em ordem; a primeira é a capa. */
  fotos: { id: string; alt: string }[];
  /** Situação escolhida no campo Situação (imóvel já publicado). */
  situacao: SituacaoImovel;
  /** Só ADMIN. */
  responsavelId?: string;
  /** Só ADMIN: usar na Oportunidade de hoje da Home. */
  oportunidade?: boolean;
};

/** Salvar rascunho · Publicar · Salvar alterações (situação do campo). */
export type Intencao = "rascunho" | "publicar" | "salvar";

export type CampoImovel = "finalidade" | "tipo" | "titulo" | "bairro" | "cidade" | "uf" | "valor" | "area" | "quartos" | "vagas" | "descricao" | "fotos";

export type ErrosImovel = Partial<Record<CampoImovel, string>>;

/** Ordem do resumo de erros no topo. */
export const ORDEM_CAMPOS: { campo: CampoImovel; rotulo: string }[] = [
  { campo: "finalidade", rotulo: "Finalidade" },
  { campo: "tipo", rotulo: "Tipo" },
  { campo: "titulo", rotulo: "Título" },
  { campo: "bairro", rotulo: "Bairro" },
  { campo: "cidade", rotulo: "Cidade" },
  { campo: "uf", rotulo: "UF" },
  { campo: "valor", rotulo: "Valor" },
  { campo: "area", rotulo: "Área" },
  { campo: "quartos", rotulo: "Quartos" },
  { campo: "vagas", rotulo: "Vagas" },
  { campo: "descricao", rotulo: "Descrição" },
  { campo: "fotos", rotulo: "Fotos" },
];

export function situacaoDestino(intencao: Intencao, escolhida: SituacaoImovel): SituacaoImovel {
  if (intencao === "rascunho") return "rascunho";
  if (intencao === "publicar") return "publicado";
  return escolhida;
}

const inteiro = (s: string) => (/^\d{1,12}$/.test(s.trim()) ? Number(s.trim()) : NaN);

export type ImovelValidado = {
  finalidade: Finalidade | null;
  lancamento: boolean;
  tipo: string | null;
  titulo: string;
  bairro: string;
  cidade: string;
  uf: string;
  valor: number | null;
  area: number | null;
  quartos: number | null;
  vagas: number | null;
  descricao: string;
};

/**
 * Rascunho salva incompleto; publicado e indisponível exigem os obrigatórios
 * (o que o site exibe). Formato errado é erro em qualquer caso.
 */
export function validarImovel(e: EntradaImovel, destino: SituacaoImovel): { erros: ErrosImovel; dados: ImovelValidado } {
  const erros: ErrosImovel = {};
  const exige = destino !== "rascunho";
  const texto = (s: string) => s.replace(/\s+/g, " ").trim();
  const numero = (campo: "valor" | "area" | "quartos" | "vagas", bruto: string, max: number, msgVazio?: string) => {
    if (!bruto.trim()) {
      if (exige && msgVazio) erros[campo] = msgVazio;
      return null;
    }
    const n = inteiro(bruto);
    if (!Number.isFinite(n) || n > max) {
      erros[campo] = "Use só números.";
      return null;
    }
    if (n === 0 && (campo === "valor" || campo === "area")) {
      if (exige && msgVazio) erros[campo] = msgVazio;
      return null;
    }
    return n === 0 ? null : n;
  };

  const finalidade = e.finalidade === "venda" || e.finalidade === "locacao" ? e.finalidade : null;
  if (exige && !finalidade) erros.finalidade = "Escolha a finalidade.";
  const tipo = (TIPOS as readonly string[]).includes(e.tipo) ? e.tipo : null;
  if (exige && !tipo) erros.tipo = "Escolha o tipo de imóvel.";
  const titulo = texto(e.titulo);
  if (titulo.length > LIMITES.titulo) erros.titulo = `Use até ${LIMITES.titulo} caracteres.`;
  else if (exige && !titulo) erros.titulo = "Informe o título.";
  const bairro = texto(e.bairro);
  if (exige && !bairro) erros.bairro = "Informe o bairro.";
  const cidade = texto(e.cidade);
  if (exige && !cidade) erros.cidade = "Informe a cidade.";
  const uf = (UFS as readonly string[]).includes(e.uf) ? e.uf : "";
  if (exige && !uf) erros.uf = "Escolha a UF.";
  const valor = numero("valor", e.valor, 999_999_999_999, finalidade === "locacao" ? "Informe o valor mensal." : "Informe o valor.");
  const area = numero("area", e.area, 9_999_999, "Informe a área em m².");
  const quartos = numero("quartos", e.quartos, 99);
  const vagas = numero("vagas", e.vagas, 99);
  const descricao = e.descricao.replace(/\r\n/g, "\n").trim();
  if (exige && !descricao) erros.descricao = "Escreva a descrição do imóvel.";
  if (e.fotos.length > LIMITES.fotos) erros.fotos = `Use até ${LIMITES.fotos} fotos.`;
  else if (e.fotos.some((f) => f.alt.length > LIMITES.alt)) erros.fotos = `O texto alternativo tem até ${LIMITES.alt} caracteres.`;

  return {
    erros,
    dados: { finalidade, lancamento: Boolean(e.lancamento), tipo, titulo, bairro, cidade, uf, valor, area, quartos, vagas, descricao },
  };
}

// ---------- Senhas e e-mails ----------

export const emailValido = (v: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v.trim());

export function erroNovaSenha(nova: string): string | null {
  if (!nova) return "Crie uma senha.";
  if (nova.length < SENHA_MINIMO) return `A senha precisa ter pelo menos ${SENHA_MINIMO} caracteres.`;
  return null;
}

export function erroConfirmacao(nova: string, confirmacao: string): string | null {
  if (!confirmacao) return "Repita a nova senha.";
  if (confirmacao !== nova) return "As senhas não são iguais. Digite a mesma senha nos dois campos.";
  return null;
}
