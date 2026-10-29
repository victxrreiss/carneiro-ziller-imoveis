CREATE TABLE "importacao_loft" (
	"referencia" text PRIMARY KEY NOT NULL,
	"imovel_id" text,
	"valores" jsonb NOT NULL,
	"fotos_origem" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"foto_ids" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"importado_em" timestamp with time zone NOT NULL
);
--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "banheiros" integer;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "suites" integer;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "area_total" integer;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "condominio" bigint;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "iptu" bigint;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "valor_locacao" bigint;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "caracteristicas" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "andar" integer;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "ano_construcao" integer;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "empreendimento" text;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "endereco" text;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "numero" text;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "complemento" text;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "cep" text;--> statement-breakpoint
ALTER TABLE "imoveis" ADD COLUMN "referencia_loft" text;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "trocar_senha" boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "senha_provisoria_expira_em" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "importacao_loft" ADD CONSTRAINT "importacao_loft_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imoveis" ADD CONSTRAINT "imoveis_referencia_loft_unique" UNIQUE("referencia_loft");