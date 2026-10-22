// Base de dados em memória, compartilhada pelo site e pelo painel enquanto o
// backend não existe. Vive no processo do servidor: reiniciar o `next dev` ou o
// `next start` volta à semente. Trocar por um banco real muda só este módulo e
// as funções em lib/imoveis e lib/painel que o leem.
import { OPORTUNIDADE_INICIAL, sementeImoveis, sementeUsuarios } from "./semente";
import type {
  ArquivoFoto,
  AvisoOportunidade,
  EmailEnviado,
  RegistroImovel,
  RegistroUsuario,
  Sessao,
  Tentativas,
  TokenSenha,
} from "./tipos";

export type Banco = {
  imoveis: Map<string, RegistroImovel>;
  usuarios: Map<string, RegistroUsuario>;
  /** Chave: hash do token do cookie. */
  sessoes: Map<string, Sessao>;
  /** Chave: hash do token do link. */
  tokens: Map<string, TokenSenha>;
  /** Chave: e-mail em minúsculas. */
  tentativas: Map<string, Tentativas>;
  fotos: Map<string, ArquivoFoto>;
  /** Id do imóvel da Oportunidade de hoje (Home); só um por vez, escolhido pelo ADMIN. */
  oportunidadeId: string | null;
  avisoOportunidade: AvisoOportunidade | null;
  /** E-mails "enviados" (o envio real ainda não existe). */
  caixaSaida: EmailEnviado[];
};

function criar(): Banco {
  return {
    imoveis: new Map(sementeImoveis().map((i) => [i.id, i])),
    usuarios: new Map(sementeUsuarios().map((u) => [u.id, u])),
    sessoes: new Map(),
    tokens: new Map(),
    tentativas: new Map(),
    fotos: new Map(),
    oportunidadeId: OPORTUNIDADE_INICIAL,
    avisoOportunidade: null,
    caixaSaida: [],
  };
}

// No globalThis: sobrevive ao recarregamento de módulos do `next dev` e é o mesmo
// para todas as rotas do processo.
const CHAVE = Symbol.for("carneiro-ziller.banco");
type Global = typeof globalThis & { [CHAVE]?: Banco };

export function banco(): Banco {
  const g = globalThis as Global;
  g[CHAVE] ??= criar();
  return g[CHAVE];
}

/** Volta à semente. Usado pelos testes. */
export function reiniciarBanco(): Banco {
  const g = globalThis as Global;
  g[CHAVE] = criar();
  return g[CHAVE];
}
