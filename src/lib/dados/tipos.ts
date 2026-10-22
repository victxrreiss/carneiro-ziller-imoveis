// Registros da base de dados (hoje em memória, ver ./banco.ts). Site e painel
// leem daqui; o site só enxerga imóveis publicados ou indisponíveis.

export type Finalidade = "venda" | "locacao";

export type SituacaoImovel = "rascunho" | "publicado" | "indisponivel";

export type Papel = "admin" | "corretor";

export type SituacaoUsuario = "ativo" | "pendente" | "desativado";

export type FotoRegistro = {
  /** Id do arquivo (upload) ou nome do arquivo da semente. */
  id: string;
  src: string;
  alt: string;
  largura: number;
  altura: number;
};

export type RegistroImovel = {
  /** Código em minúsculas, usado na URL (`/imovel/cz1009`). */
  id: string;
  codigo: string;
  /** Rascunho pode ficar sem os campos obrigatórios. */
  finalidade: Finalidade | null;
  /** Marcação independente da finalidade (filtro Lançamentos do site). */
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
  /** Parágrafos separados por linha em branco. */
  descricao: string;
  /** Em ordem; a primeira é a capa. */
  fotos: FotoRegistro[];
  situacao: SituacaoImovel;
  responsavelId: string;
  criadoEm: string;
  alteradoEm: string;
  alteradoPorId: string;
  /** Primeira publicação. Não muda em edições: ordena as seções automáticas da Home. */
  publicadoEm: string | null;
};

export type RegistroUsuario = {
  id: string;
  nome: string;
  email: string;
  papel: Papel;
  situacao: SituacaoUsuario;
  /** `scrypt$<salt>$<hash>`; nulo enquanto o convite não for aceito. */
  senhaHash: string | null;
  ultimoAcesso: string | null;
  conviteEnviadoEm: string | null;
};

export type Sessao = { usuarioId: string; criadaEm: number; usadaEm: number };

export type TipoToken = "convite" | "redefinicao";

export type TokenSenha = { usuarioId: string; tipo: TipoToken; expiraEm: number; usado: boolean };

export type Tentativas = { falhas: number; bloqueadoAte: number };

export type ArquivoFoto = { bytes: Uint8Array; tipo: string; largura: number; altura: number; enviadoPorId: string };

/** Por que a Oportunidade de hoje ficou vazia (aviso ao ADMIN na lista de imóveis). */
export type AvisoOportunidade = {
  porId: string;
  codigo: string;
  titulo: string;
  motivo: "indisponivel" | "rascunho" | "excluido" | "desmarcado";
  em: string;
};

export type EmailEnviado = { para: string; assunto: string; html: string; texto: string; link: string; em: string };
