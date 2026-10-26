// Tabelas do banco (PostgreSQL). Espelha src/lib/dados/tipos.ts; as migrations
// SQL em drizzle/ são geradas daqui com `npm run db:gerar`.
import { sql } from "drizzle-orm";
import {
  bigint,
  boolean,
  check,
  index,
  integer,
  jsonb,
  pgEnum,
  pgSequence,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";
import type { AvisoOportunidade } from "./tipos";

const momento = (nome: string) => timestamp(nome, { withTimezone: true, mode: "date" });

export const papelEnum = pgEnum("papel", ["admin", "corretor"]);
export const situacaoUsuarioEnum = pgEnum("situacao_usuario", ["ativo", "pendente", "desativado"]);
export const situacaoImovelEnum = pgEnum("situacao_imovel", ["rascunho", "publicado", "indisponivel"]);
export const finalidadeEnum = pgEnum("finalidade", ["venda", "locacao"]);
export const tipoTokenEnum = pgEnum("tipo_token", ["convite", "redefinicao"]);

/** Código dos imóveis: `CZ` + número, a partir de 1001. Sem corrida, ao contrário de `max + 1`. */
export const codigoImovelSeq = pgSequence("imovel_codigo_seq", { startWith: 1001, minValue: 1 });

export const usuarios = pgTable(
  "usuarios",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    nome: text("nome").notNull(),
    email: text("email").notNull().unique(),
    papel: papelEnum("papel").notNull().default("corretor"),
    situacao: situacaoUsuarioEnum("situacao").notNull().default("pendente"),
    /** Nulo até o convite ser aceito. */
    senhaHash: text("senha_hash"),
    ultimoAcesso: momento("ultimo_acesso"),
    conviteEnviadoEm: momento("convite_enviado_em"),
    criadoEm: momento("criado_em").notNull().defaultNow(),
  },
  (t) => [
    // Um só ADMIN.
    uniqueIndex("usuarios_um_admin").on(t.papel).where(sql`${t.papel} = 'admin'`),
    check("usuarios_email_minusculo", sql`${t.email} = lower(${t.email})`),
  ],
);

export const imoveis = pgTable(
  "imoveis",
  {
    /** Código em minúsculas, usado na URL (`/imovel/cz1009`). */
    id: text("id").primaryKey(),
    codigo: text("codigo").notNull().unique(),
    finalidade: finalidadeEnum("finalidade"),
    lancamento: boolean("lancamento").notNull().default(false),
    tipo: text("tipo"),
    titulo: text("titulo").notNull().default(""),
    bairro: text("bairro").notNull().default(""),
    cidade: text("cidade").notNull().default(""),
    uf: text("uf").notNull().default("MG"),
    valor: bigint("valor", { mode: "number" }),
    area: integer("area"),
    quartos: integer("quartos"),
    vagas: integer("vagas"),
    descricao: text("descricao").notNull().default(""),
    situacao: situacaoImovelEnum("situacao").notNull().default("rascunho"),
    responsavelId: uuid("responsavel_id")
      .notNull()
      .references(() => usuarios.id),
    criadoEm: momento("criado_em").notNull().defaultNow(),
    alteradoEm: momento("alterado_em").notNull().defaultNow(),
    alteradoPorId: uuid("alterado_por_id")
      .notNull()
      .references(() => usuarios.id),
    /** Primeira publicação; não muda em edições. */
    publicadoEm: momento("publicado_em"),
  },
  (t) => [index("imoveis_situacao").on(t.situacao), index("imoveis_responsavel").on(t.responsavelId)],
);

export const fotos = pgTable(
  "fotos",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Chave do objeto no bucket. */
    chave: text("chave").notNull().unique(),
    tipo: text("tipo").notNull(),
    tamanho: integer("tamanho").notNull(),
    largura: integer("largura").notNull(),
    altura: integer("altura").notNull(),
    enviadoPorId: uuid("enviado_por_id")
      .notNull()
      .references(() => usuarios.id),
    confirmada: boolean("confirmada").notNull().default(false),
    criadoEm: momento("criado_em").notNull().defaultNow(),
  },
  (t) => [index("fotos_limpeza").on(t.confirmada, t.criadoEm)],
);

export const imovelFotos = pgTable(
  "imovel_fotos",
  {
    imovelId: text("imovel_id")
      .notNull()
      .references(() => imoveis.id, { onDelete: "cascade" }),
    fotoId: uuid("foto_id")
      .notNull()
      .unique()
      .references(() => fotos.id),
    /** 0 é a capa. */
    ordem: integer("ordem").notNull(),
    alt: text("alt").notNull().default(""),
  },
  (t) => [primaryKey({ columns: [t.imovelId, t.fotoId] }), index("imovel_fotos_ordem").on(t.imovelId, t.ordem)],
);

export const sessoes = pgTable("sessoes", {
  /** SHA-256 do token do cookie; o token nunca é gravado. */
  tokenHash: text("token_hash").primaryKey(),
  usuarioId: uuid("usuario_id")
    .notNull()
    .references(() => usuarios.id, { onDelete: "cascade" }),
  criadaEm: momento("criada_em").notNull().defaultNow(),
  usadaEm: momento("usada_em").notNull().defaultNow(),
});

export const tokensSenha = pgTable(
  "tokens_senha",
  {
    tokenHash: text("token_hash").primaryKey(),
    usuarioId: uuid("usuario_id")
      .notNull()
      .references(() => usuarios.id, { onDelete: "cascade" }),
    tipo: tipoTokenEnum("tipo").notNull(),
    criadoEm: momento("criado_em").notNull().defaultNow(),
    expiraEm: momento("expira_em").notNull(),
    usado: boolean("usado").notNull().default(false),
  },
  (t) => [index("tokens_senha_usuario").on(t.usuarioId)],
);

export const tentativasLogin = pgTable("tentativas_login", {
  email: text("email").primaryKey(),
  falhas: integer("falhas").notNull().default(0),
  bloqueadoAte: momento("bloqueado_ate"),
});

/** Linha única (`id = 1`): Oportunidade de hoje da Home e o aviso ao ADMIN. */
export const configuracaoSite = pgTable(
  "configuracao_site",
  {
    id: integer("id").primaryKey().default(1),
    oportunidadeId: text("oportunidade_id").references(() => imoveis.id, { onDelete: "set null" }),
    aviso: jsonb("aviso").$type<AvisoOportunidade>(),
  },
  (t) => [check("configuracao_site_unica", sql`${t.id} = 1`)],
);

/** Interesses (leads) enviados pelo formulário do imóvel no site. */
export const interesses = pgTable(
  "interesses",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    /** Nulo se o imóvel for excluído depois; o código fica para referência. */
    imovelId: text("imovel_id").references(() => imoveis.id, { onDelete: "set null" }),
    codigo: text("codigo").notNull(),
    nome: text("nome").notNull(),
    telefone: text("telefone").notNull(),
    email: text("email").notNull(),
    observacoes: text("observacoes").notNull().default(""),
    origem: text("origem").notNull().default("site"),
    url: text("url").notNull().default(""),
    criadoEm: momento("criado_em").notNull().defaultNow(),
  },
  (t) => [index("interesses_imovel").on(t.imovelId), index("interesses_criado_em").on(t.criadoEm)],
);

/** Limite de envios por janela (ex.: formulário público por IP). A chave guarda só o hash do IP. */
export const limitesEnvio = pgTable("limites_envio", {
  chave: text("chave").primaryKey(),
  contagem: integer("contagem").notNull().default(0),
  janelaAte: momento("janela_ate").notNull(),
});
