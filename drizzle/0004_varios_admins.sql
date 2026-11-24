DROP INDEX "usuarios_um_admin";--> statement-breakpoint
ALTER TABLE "usuarios" ADD COLUMN "recebe_contatos" boolean DEFAULT true NOT NULL;