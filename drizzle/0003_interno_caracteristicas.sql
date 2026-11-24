CREATE TABLE "imovel_interno" (
	"imovel_id" text PRIMARY KEY NOT NULL,
	"captador_id" uuid,
	"captador_nome" text,
	"proprietario_nome" text,
	"proprietario_telefone" text,
	"proprietario_email" text,
	"proprietario_obs" text,
	"alterado_em" timestamp with time zone DEFAULT now() NOT NULL,
	"alterado_por_id" uuid
);
--> statement-breakpoint
ALTER TABLE "imovel_interno" ADD CONSTRAINT "imovel_interno_imovel_id_imoveis_id_fk" FOREIGN KEY ("imovel_id") REFERENCES "public"."imoveis"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imovel_interno" ADD CONSTRAINT "imovel_interno_captador_id_usuarios_id_fk" FOREIGN KEY ("captador_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "imovel_interno" ADD CONSTRAINT "imovel_interno_alterado_por_id_usuarios_id_fk" FOREIGN KEY ("alterado_por_id") REFERENCES "public"."usuarios"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
-- Características em dois grupos (imóvel e condomínio). Chaves antigas que mudaram de sentido:
-- recepcao → portaria; lavanderia (era a área de serviço) → area-de-servico; piscina e sauna sem
-- dono → do condomínio, menos em casa (aí são privativas). A ordem passa a ser a de CARACTERISTICAS.
-- O snapshot da importação da Loft recebe a mesma conversão, para a próxima rodada seguir valendo.
CREATE FUNCTION cz_caracteristicas_0003(chaves text[], tipo text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT coalesce(array_agg(n ORDER BY array_position(ARRAY['aceita-pet','adega','agua-quente','alarme','ar-central','ar-condicionado','area-de-servico','armarios-embutidos','banheiro-de-empregada','banheiro-social','bar','churrasqueira','closet','copa','copa-cozinha','cozinha','cozinha-americana','cozinha-com-armarios','cozinha-planejada','deck','dependencia-de-empregada','despensa','edicula','escritorio','espera-para-split','estar-intimo','frente-mar','gradeado','hall','hidromassagem','home-theater','horta','internet','jardim-de-inverno','lareira','lavabo','mobiliado','piscina','piso-elevado','quartos-com-armarios','quintal','reformado','sala-com-armarios','sala-de-jantar','sala-de-tv','sauna','semimobiliado','split','suite-master','terraco','varanda','varanda-com-churrasqueira','vista-panoramica','vista-para-o-mar','academia','acessibilidade','aquecedor-solar','aquecimento','bicicletario','brinquedoteca','churrasqueira-coletiva','circuito-de-tv','condominio-fechado','coworking','deposito','elevador','elevador-de-servico','empresa-de-monitoramento','entrada-de-servico','area-gourmet','espaco-zen','estacionamento','estacionamento-visitantes','gas-central','guarita','heliponto','home-market','horta-coletiva','interfone','jardim','lavanderia','painel-solar','parque','pet-place','pilotis','piscina-coletiva','piscina-aquecida','piscina-infantil','playground','portao-eletronico','portaria','portaria-24h','porteiro-eletronico','quadra-de-esportes','quadra-de-tenis','quiosque','salao-de-festas','salao-de-jogos','sauna-coletiva','seguranca','spa','terraco-coletivo','vigilancia-24h','zelador']::text[], n)), '{}'::text[])
  FROM (
    SELECT DISTINCT CASE k
      WHEN 'recepcao' THEN 'portaria'
      WHEN 'lavanderia' THEN 'area-de-servico'
      WHEN 'piscina' THEN CASE WHEN tipo IN ('Casa', 'Casa em condomínio', 'Casa comercial') THEN 'piscina' ELSE 'piscina-coletiva' END
      WHEN 'sauna' THEN CASE WHEN tipo IN ('Casa', 'Casa em condomínio', 'Casa comercial') THEN 'sauna' ELSE 'sauna-coletiva' END
      ELSE k
    END AS n
    FROM unnest(chaves) AS k
  ) AS m
$$;
--> statement-breakpoint
UPDATE "imoveis" SET "caracteristicas" = cz_caracteristicas_0003("caracteristicas", "tipo") WHERE cardinality("caracteristicas") > 0;
--> statement-breakpoint
UPDATE "importacao_loft"
SET "valores" = jsonb_set("valores", '{caracteristicas}', to_jsonb(cz_caracteristicas_0003(ARRAY(SELECT jsonb_array_elements_text("valores"->'caracteristicas')), "valores"->>'tipo')))
WHERE jsonb_typeof("valores"->'caracteristicas') = 'array';
--> statement-breakpoint
DROP FUNCTION cz_caracteristicas_0003(text[], text);
