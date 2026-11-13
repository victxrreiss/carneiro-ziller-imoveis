CREATE TABLE "destaques_home" (
	"imovel_id" text PRIMARY KEY NOT NULL,
	"ordem" integer NOT NULL,
	"marcado_em" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "configuracao_site" DROP CONSTRAINT "configuracao_site_oportunidade_id_imoveis_id_fk";
--> statement-breakpoint
ALTER TABLE "destaques_home" ADD CONSTRAINT "destaques_home_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "configuracao_site" DROP COLUMN "oportunidade_id";