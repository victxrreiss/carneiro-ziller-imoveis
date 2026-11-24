import type { GrupoCaracteristica } from "./caracteristicas";
export type { Finalidade } from "@/lib/dados/tipos";
import type { Finalidade } from "@/lib/dados/tipos";

export type Foto = {
  src: string;
  alt: string;
  largura: number;
  altura: number;
};

/** O que o grid precisa de cada anúncio. */
export type ImovelResumo = {
  /** Código em minúsculas, usado na URL (`/imovel/cz1009`). */
  id: string;
  codigo: string;
  finalidade: Finalidade;
  /** Marcação do imóvel, independente da finalidade: filtro Lançamentos e etiqueta LANÇAMENTO. */
  lancamento: boolean;
  tipo: string;
  titulo: string;
  bairro: string;
  cidade: string;
  valor: number;
  area: number;
  quartos: number | null;
  vagas: number | null;
  suites: number | null;
  /** Valor de locação de um imóvel à venda (o card mostra "ou R$ X/mês"). */
  valorLocacao: number | null;
  foto: Foto;
};

/** Ficha completa da tela do imóvel. */
export type Imovel = ImovelResumo & {
  uf: string;
  banheiros: number | null;
  /** Só interessa quando maior que a área útil. */
  areaTotal: number | null;
  /** Mensal. */
  condominio: number | null;
  /** Anual. */
  iptu: number | null;
  andar: number | null;
  anoConstrucao: number | null;
  empreendimento: string | null;
  /** Só as características conhecidas, na ordem gravada, cada uma com o grupo (imóvel ou condomínio). */
  caracteristicas: { chave: string; rotulo: string; grupo: GrupoCaracteristica }[];
  /** Parágrafos. */
  descricao: string[];
  /** Em ordem; a primeira é a capa. Pode ser vazia ("FOTOS EM BREVE"). */
  fotos: Foto[];
};

export type ResultadoImovel =
  | { situacao: "disponivel"; imovel: Imovel }
  | { situacao: "indisponivel"; codigo: string }
  | { situacao: "inexistente" };

export type PaginaImoveis = {
  itens: ImovelResumo[];
  total: number;
  pagina: number;
  paginas: number;
};

/**
 * Card de imóvel fora do grid (destaques da Home, semelhantes): os mesmos dados do grid,
 * para o `CardImovel` servir aos três lugares.
 */
export type ImovelCard = ImovelResumo;

export type { Regiao } from "./regioes";
