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
  foto: Foto;
};

/** Ficha completa da tela do imóvel. */
export type Imovel = ImovelResumo & {
  uf: string;
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

export type RotuloFinalidade = "LANÇAMENTO" | "VENDA" | "LOCAÇÃO";

export type ImovelCard = {
  id: string;
  badge: RotuloFinalidade;
  title: string;
  location: string;
  price: string;
  area: string;
  beds?: string;
  img: string;
  alt: string;
};

export type Regiao = {
  nome: string;
  cidade: string;
  img: string;
};

/** Bloco "Oportunidade de hoje" da Home: o imóvel que o ADMIN escolhe no painel. */
export type Destaque = {
  /** Anúncio para onde o AGENDAR VISITA leva. */
  id: string;
  codigo: string;
  tipo: string;
  titulo: string;
  local: string;
  descricao: string;
  area: string;
  /** Só as especificações que existem (terreno e sala não têm quartos/vagas). */
  quartos?: string;
  vagas?: string;
  valor: string;
  img: string;
  alt: string;
};
