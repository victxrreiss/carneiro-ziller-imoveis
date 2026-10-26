CREATE TYPE "public"."finalidade" AS ENUM('venda', 'locacao');--> statement-breakpoint
CREATE TYPE "public"."papel" AS ENUM('admin', 'corretor');--> statement-breakpoint
CREATE TYPE "public"."situacao_imovel" AS ENUM('rascunho', 'publicado', 'indisponivel');--> statement-breakpoint
CREATE TYPE "public"."situacao_usuario" AS ENUM('ativo', 'pendente', 'desativado');--> statement-breakpoint
CREATE TYPE "public"."tipo_token" AS ENUM('convite', 'redefinicao');--> statement-breakpoint
CREATE SEQUENCE "public"."imovel_codigo_seq" INCREMENT BY 1 MINVALUE 1 MAXVALUE 9223372036854775807 START WITH 1001 CACHE 1;--> statement-breakpoint
CREATE TABLE "configuracao_site" (
	"id" integer PRIMARY KEY DEFAULT 1 NOT NULL,
	"oportunidade_id" text,
	"aviso" jsonb,
	CONSTRAINT "configuracao_site_unica" CHECK ("configuracao_site"."id" = 1)
);
--> statement-breakpoint
CREATE TABLE "fotos" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"chave" text NOT NULL,
	"tipo" text NOT NULL,
	"tamanho" integer NOT NULL,
	"largura" integer NOT NULL,
	"altura" integer NOT NULL,
	"enviado_por_id" uuid NOT NULL,
	"confirmada" boolean DEFAULT false NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "fotos_chave_unique" UNIQUE("chave")
);
--> statement-breakpoint
CREATE TABLE "imoveis" (
	"id" text PRIMARY KEY NOT NULL,
	"codigo" text NOT NULL,
	"finalidade" "finalidade",
	"lancamento" boolean DEFAULT false NOT NULL,
	"tipo" text,
	"titulo" text DEFAULT '' NOT NULL,
	"bairro" text DEFAULT '' NOT NULL,
	"cidade" text DEFAULT '' NOT NULL,
	"uf" text DEFAULT 'MG' NOT NULL,
	"valor" bigint,
	"area" integer,
	"quartos" integer,
	"vagas" integer,
	"descricao" text DEFAULT '' NOT NULL,
	"situacao" "situacao_imovel" DEFAULT 'rascunho' NOT NULL,
	"responsavel_id" uuid NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_por_id" uuid NOT NULL,
	"publicado_em" timestamp with time zone,
	CONSTRAINT "imoveis_codigo_unique" UNIQUE("codigo")
);
--> statement-breakpoint
CREATE TABLE "imovel_fotos" (
	"imovel_id" text NOT NULL,
	"foto_id" uuid NOT NULL,
	"ordem" integer NOT NULL,
	"alt" text DEFAULT '' NOT NULL,
	CONSTRAINT "imovel_fotos_imovel_id_foto_id_pk" PRIMARY KEY("imovel_id","foto_id"),
	CONSTRAINT "imovel_fotos_foto_id_unique" UNIQUE("foto_id")
);
--> statement-breakpoint
CREATE TABLE "interesses" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"imovel_id" text,
	"codigo" text NOT NULL,
	"nome" text NOT NULL,
	"telefone" text NOT NULL,
	"email" text NOT NULL,
	"observacoes" text DEFAULT '' NOT NULL,
	"origem" text DEFAULT 'site' NOT NULL,
	"url" text DEFAULT '' NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "limites_envio" (
	"chave" text PRIMARY KEY NOT NULL,
	"contagem" integer DEFAULT 0 NOT NULL,
	"janela_ate" timestamp with time zone NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sessoes" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"criada_em" timestamp with time zone DEFAULT now() NOT NULL,
	"usada_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tentativas_login" (
	"email" text PRIMARY KEY NOT NULL,
	"falhas" integer DEFAULT 0 NOT NULL,
	"bloqueado_ate" timestamp with time zone
);
--> statement-breakpoint
CREATE TABLE "tokens_senha" (
	"token_hash" text PRIMARY KEY NOT NULL,
	"usuario_id" uuid NOT NULL,
	"tipo" "tipo_token" NOT NULL,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"expira_em" timestamp with time zone NOT NULL,
	"usado" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "usuarios" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"nome" text NOT NULL,
	"email" text NOT NULL,
	"papel" "papel" DEFAULT 'corretor' NOT NULL,
	"situacao" "situacao_usuario" DEFAULT 'pendente' NOT NULL,
	"senha_hash" text,
	"ultimo_acesso" timestamp with time zone,
	"convite_enviado_em" timestamp with time zone,
	"criado_em" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "usuarios_email_unique" UNIQUE("email"),
	CONSTRAINT "usuarios_email_minusculo" CHECK ("usuarios"."email" = lower("usuarios"."email"))
);
--> statement-breakpoint
ALTER TABLE "configuracao_site" ADD CONSTRAINT "configuracao_site_oportunidade_id_imoveis_id_fk" FOREIGN KEY ("oportunidade_id") REFERENCES "public"."imoveis"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "fotos" ADD CONSTRAINT "fotos_enviado_por_id_usuarios_id_fk" FOREIGN KEY ("enviado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_responsavel_id_usuarios_id_fk" FOREIGN KEY ("responsavel_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_alterado_por_id_usuarios_id_fk" FOREIGN KEY ("alterado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imovel_fotos" ADD CONSTRAINT "imovel_fotos_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imovel_fotos" ADD CONSTRAINT "imovel_fotos_foto_id_fotos_id_fk" FOREIGN KEY ("foto_id") REFERENCES "public"."fotos"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "interesses" ADD CONSTRAINT "interesses_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "sessoes" ADD CONSTRAINT "sessoes_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tokens_senha" ADD CONSTRAINT "tokens_senha_usuario_id_usuarios_id_fk" FOREIGN KEY ("usuario_id") REFERENCES "public"."usuarios"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "fotos_limpeza" ON "fotos" USING btree ("confirmada","criado_em");--> statement-breakpoint
CREATE INDEX "imoveis_situacao" ON "imoveis" USING btree ("situacao");--> statement-breakpoint
CREATE INDEX "imoveis_responsavel" ON "imoveis" USING btree ("responsavel_id");--> statement-breakpoint
CREATE INDEX "imovel_fotos_ordem" ON "imovel_fotos" USING btree ("imovel_id","ordem");--> statement-breakpoint
CREATE INDEX "interesses_imovel" ON "interesses" USING btree ("imovel_id");--> statement-breakpoint
CREATE INDEX "interesses_criado_em" ON "interesses" USING btree ("criado_em");--> statement-breakpoint
CREATE INDEX "tokens_senha_usuario" ON "tokens_senha" USING btree ("usuario_id");--> statement-breakpoint
CREATE UNIQUE INDEX "usuarios_um_admin" ON "usuarios" USING btree ("papel") WHERE "usuarios"."papel" = 'admin';