CREATE TABLE "destaques_home" (
	"imovel_id" text PRIMARY KEY NOT NULL,
	"ordem" integer NOT NULL,
	"marcado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "destaques_home" ADD CONSTRAINT "destaques_home_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
-- O aviso antigo era o da Oportunidade de hoje (outro formato): a tela de destaques não deve mostrá-lo.
-- A coluna oportunidade_id fica (expand/contract): o container anterior ainda a lê durante o deploy.
UPDATE "configuracao_site" SET "aviso" = NULL;
