// Características do imóvel: lista fixa (chave gravada no banco + rótulo exibido), em dois
// grupos — o que é da unidade e o que é do condomínio (pedido do cliente, 2026-11-24) — com os
// itens das abas "Características" e "Infraestrutura" do CRM da Loft. Chaves antigas foram
// mantidas quando o item é o mesmo (a migração 0003 converte as que mudaram de sentido).

export type GrupoCaracteristica = "imovel" | "condominio";

export const GRUPOS_CARACTERISTICA: readonly { grupo: GrupoCaracteristica; rotulo: string }[] = [
  { grupo: "imovel", rotulo: "No imóvel" },
  { grupo: "condominio", rotulo: "No condomínio" },
];

const doImovel = (chave: string, rotulo: string) => ({ chave, rotulo, grupo: "imovel" as const });
const doCondominio = (chave: string, rotulo: string) => ({ chave, rotulo, grupo: "condominio" as const });

export const CARACTERISTICAS: readonly { chave: string; rotulo: string; grupo: GrupoCaracteristica }[] = [
  // Aba "Características" do CRM: a unidade.
  doImovel("aceita-pet", "Aceita pet"),
  doImovel("adega", "Adega"),
  doImovel("agua-quente", "Água quente"),
  doImovel("alarme", "Alarme"),
  doImovel("ar-central", "Ar central"),
  doImovel("ar-condicionado", "Ar-condicionado"),
  doImovel("area-de-servico", "Área de serviço"),
  doImovel("armarios-embutidos", "Armários embutidos"),
  doImovel("banheiro-de-empregada", "Banheiro de empregada"),
  doImovel("banheiro-social", "Banheiro social"),
  doImovel("bar", "Bar"),
  doImovel("churrasqueira", "Churrasqueira"),
  doImovel("closet", "Closet"),
  doImovel("copa", "Copa"),
  doImovel("copa-cozinha", "Copa-cozinha"),
  doImovel("cozinha", "Cozinha"),
  doImovel("cozinha-americana", "Cozinha americana"),
  doImovel("cozinha-com-armarios", "Cozinha com armários"),
  doImovel("cozinha-planejada", "Cozinha planejada"),
  doImovel("deck", "Deck"),
  doImovel("dependencia-de-empregada", "Dependência de empregada"),
  doImovel("despensa", "Despensa"),
  doImovel("edicula", "Edícula"),
  doImovel("escritorio", "Escritório"),
  doImovel("espera-para-split", "Espera para split"),
  doImovel("estar-intimo", "Estar íntimo"),
  doImovel("frente-mar", "Frente mar"),
  doImovel("gradeado", "Gradeado"),
  doImovel("hall", "Hall"),
  doImovel("hidromassagem", "Hidromassagem"),
  doImovel("home-theater", "Home theater"),
  doImovel("horta", "Horta"),
  doImovel("internet", "Internet"),
  doImovel("jardim-de-inverno", "Jardim de inverno"),
  doImovel("lareira", "Lareira"),
  doImovel("lavabo", "Lavabo"),
  doImovel("mobiliado", "Mobiliado"),
  doImovel("piscina", "Piscina privativa"),
  doImovel("piso-elevado", "Piso elevado"),
  doImovel("quartos-com-armarios", "Quartos com armários"),
  doImovel("quintal", "Quintal"),
  doImovel("reformado", "Reformado"),
  doImovel("sala-com-armarios", "Sala com armários"),
  doImovel("sala-de-jantar", "Sala de jantar"),
  doImovel("sala-de-tv", "Sala de TV"),
  doImovel("sauna", "Sauna privativa"),
  doImovel("semimobiliado", "Semimobiliado"),
  doImovel("split", "Split"),
  doImovel("suite-master", "Suíte master"),
  doImovel("terraco", "Terraço"),
  doImovel("varanda", "Varanda"),
  doImovel("varanda-com-churrasqueira", "Varanda com churrasqueira"),
  doImovel("vista-panoramica", "Vista panorâmica"),
  doImovel("vista-para-o-mar", "Vista para o mar"),
  // Aba "Infraestrutura" do CRM: o condomínio.
  doCondominio("academia", "Academia"),
  doCondominio("acessibilidade", "Acessibilidade"),
  doCondominio("aquecedor-solar", "Aquecedor solar"),
  doCondominio("aquecimento", "Aquecimento central"),
  doCondominio("bicicletario", "Bicicletário"),
  doCondominio("brinquedoteca", "Brinquedoteca"),
  doCondominio("churrasqueira-coletiva", "Churrasqueira coletiva"),
  doCondominio("circuito-de-tv", "Circuito de TV"),
  doCondominio("condominio-fechado", "Condomínio fechado"),
  doCondominio("coworking", "Coworking"),
  doCondominio("deposito", "Depósito"),
  doCondominio("elevador", "Elevador"),
  doCondominio("elevador-de-servico", "Elevador de serviço"),
  doCondominio("empresa-de-monitoramento", "Empresa de monitoramento"),
  doCondominio("entrada-de-servico", "Entrada de serviço"),
  doCondominio("area-gourmet", "Espaço gourmet"),
  doCondominio("espaco-zen", "Espaço zen"),
  doCondominio("estacionamento", "Estacionamento"),
  doCondominio("estacionamento-visitantes", "Estacionamento para visitantes"),
  doCondominio("gas-central", "Gás central"),
  doCondominio("guarita", "Guarita"),
  doCondominio("heliponto", "Heliponto"),
  doCondominio("home-market", "Home market"),
  doCondominio("horta-coletiva", "Horta coletiva"),
  doCondominio("interfone", "Interfone"),
  doCondominio("jardim", "Jardim"),
  doCondominio("lavanderia", "Lavanderia"),
  doCondominio("painel-solar", "Painel solar"),
  doCondominio("parque", "Parque"),
  doCondominio("pet-place", "Pet place"),
  doCondominio("pilotis", "Pilotis"),
  doCondominio("piscina-coletiva", "Piscina"),
  doCondominio("piscina-aquecida", "Piscina aquecida"),
  doCondominio("piscina-infantil", "Piscina infantil"),
  doCondominio("playground", "Playground"),
  doCondominio("portao-eletronico", "Portão eletrônico"),
  doCondominio("portaria", "Portaria"),
  doCondominio("portaria-24h", "Portaria 24h"),
  doCondominio("porteiro-eletronico", "Porteiro eletrônico"),
  doCondominio("quadra-de-esportes", "Quadra de esportes"),
  doCondominio("quadra-de-tenis", "Quadra de tênis"),
  doCondominio("quiosque", "Quiosque"),
  doCondominio("salao-de-festas", "Salão de festas"),
  doCondominio("salao-de-jogos", "Salão de jogos"),
  doCondominio("sauna-coletiva", "Sauna"),
  doCondominio("seguranca", "Segurança"),
  doCondominio("spa", "Spa"),
  doCondominio("terraco-coletivo", "Terraço coletivo"),
  doCondominio("vigilancia-24h", "Vigilância 24h"),
  doCondominio("zelador", "Zelador"),
];

/** Tipos de casa: piscina e sauna do feed são da própria casa; a página mostra a área do terreno em destaque. */
export const TIPOS_CASA: readonly string[] = ["Casa", "Casa em condomínio", "Casa comercial"];

/** Piscina e sauna sem dizer de quem são (feed VRSync): na casa são privativas; no resto, do condomínio. */
export function chaveParaTipo(chave: string, tipo: string | null): string {
  const casa = !!tipo && TIPOS_CASA.includes(tipo);
  if (casa && chave === "piscina-coletiva") return "piscina";
  if (casa && chave === "sauna-coletiva") return "sauna";
  return chave;
}

/**
 * "Feature" do feed VRSync (em inglês) → chave. "Number of stories" não é característica. Piscina e
 * sauna saem como do condomínio; `chaveParaTipo` as passa para a casa quando o tipo é casa.
 */
export const CARACTERISTICA_VRSYNC: Record<string, string> = {
  Gym: "academia",
  "Maids Quarters": "dependencia-de-empregada",
  "Party Room": "salao-de-festas",
  Kitchen: "cozinha",
  "Gourmet Area": "area-gourmet",
  Playground: "playground",
  Cooling: "ar-condicionado",
  Pool: "piscina-coletiva",
  Intercom: "interfone",
  "Fenced Yard": "condominio-fechado",
  "Game room": "salao-de-jogos",
  "Tennis court": "quadra-de-tenis",
  BBQ: "churrasqueira",
  "Garden Area": "jardim",
  "Exterior View": "vista-panoramica",
  Spa: "spa",
  "Home Office": "escritorio",
  Elevator: "elevador",
  Furnished: "mobiliado",
  Sauna: "sauna-coletiva",
  "TV Security": "circuito-de-tv",
  Backyard: "quintal",
  Fireplace: "lareira",
  Laundry: "area-de-servico",
  "Internet Connection": "internet",
  Balcony: "varanda",
  "Reception room": "portaria",
  Heating: "aquecimento",
  "Ocean View": "vista-para-o-mar",
  Warehouse: "deposito",
};

/**
 * Campos marcados na ficha do CRM da Loft (abas "Características" e "Infraestrutura", nome do
 * campo sem o "imo.") → chave. Um campo por item; o que não está aqui é ignorado.
 */
export const CARACTERISTICA_CRM: Record<string, string> = {
  ACEITA_PET: "aceita-pet",
  ADEGA: "adega",
  AGUA_QUENTE: "agua-quente",
  ALARME: "alarme",
  AR_CENTRAL: "ar-central",
  AR_CONDICIONADO: "ar-condicionado",
  AREA_SERVICO: "area-de-servico",
  ARMARIOS_EMBUTIDOS: "armarios-embutidos",
  WC_EMPREGADA: "banheiro-de-empregada",
  BANHO_SOCIAL: "banheiro-social",
  SUP_COB_BAR: "bar",
  CAMPO_7: "churrasqueira",
  CLOSETS: "closet",
  COPA: "copa",
  COPA_COZINHA: "copa-cozinha",
  COZINHA: "cozinha",
  COZINHA_AMERICANA: "cozinha-americana",
  COZINHA_ARMARIO: "cozinha-com-armarios",
  COZINHA_PLANEJADA: "cozinha-planejada",
  DECK: "deck",
  DEPENDENCIA: "dependencia-de-empregada",
  DESPENSA: "despensa",
  EDICULA: "edicula",
  ESCRITORIO: "escritorio",
  SPLIT_ESPERA: "espera-para-split",
  ESTAR_INTIMO: "estar-intimo",
  FRENTE_MAR: "frente-mar",
  GRADEADO: "gradeado",
  LIVING_HALL: "hall",
  HIDRO: "hidromassagem",
  HOME_THEATER: "home-theater",
  HORTA: "horta",
  INTERNET: "internet",
  JARDIM_INVERNO: "jardim-de-inverno",
  LIVING_LAREIRA: "lareira",
  LIVING_LAVABO: "lavabo",
  MOBILIADO: "mobiliado",
  LIVING_PISCINA: "piscina",
  PISO_ELEVADO: "piso-elevado",
  DORMITORIO_ARMARIO: "quartos-com-armarios",
  QUINTAL: "quintal",
  REFORMADO: "reformado",
  SALA_ARMARIO: "sala-com-armarios",
  SALA_JANTAR: "sala-de-jantar",
  SALA_TV: "sala-de-tv",
  SAUNA: "sauna",
  SEMI_MOBILIADO: "semimobiliado",
  SPLIT: "split",
  LIVING_SUITE_MASTER: "suite-master",
  TERRACO: "terraco",
  LIVING_SACADA: "varanda",
  SACADA_CHU: "varanda-com-churrasqueira",
  VISTA: "vista-panoramica",
  VISTA_MAR: "vista-para-o-mar",
  SALA_GINASTICA: "academia",
  ACESSO_DEFICIENTES: "acessibilidade",
  AQUECEDOR_SOLAR: "aquecedor-solar",
  AQUECIMENTO_CENTRAL: "aquecimento",
  ESPACO_GOURMET: "area-gourmet",
  BICICLETARIO: "bicicletario",
  SALAO_BRINQUEDOS: "brinquedoteca",
  CHURRASQUEIRA_COLETIVA: "churrasqueira-coletiva",
  CIRCUITO_INTERNO_TV: "circuito-de-tv",
  CONDOMINIO_FECHADO: "condominio-fechado",
  COWORKING: "coworking",
  DEPOSITO: "deposito",
  ELEVADOR_COM: "elevador",
  ELEVADOR_SERVICO: "elevador-de-servico",
  EMPRESA_MONITORAMENTO: "empresa-de-monitoramento",
  ENTRADA_SERVICO: "entrada-de-servico",
  ESPACO_ZEN: "espaco-zen",
  ESTACIONAMENTO: "estacionamento",
  ESTAC_VISI: "estacionamento-visitantes",
  GAS_CENTRAL: "gas-central",
  GUARITA: "guarita",
  HELIPONTO: "heliponto",
  HOME_MARKET: "home-market",
  HORTA_COLETIVA: "horta-coletiva",
  INTERFONE: "interfone",
  JARDIM: "jardim",
  LIVING_LAVANDERIA: "lavanderia",
  PAINEL_SOLAR: "painel-solar",
  PARQUE: "parque",
  PET_PLACE: "pet-place",
  PILOTIS: "pilotis",
  PISCINA_AQUECIDA: "piscina-aquecida",
  PISCINA_COLETIVA: "piscina-coletiva",
  PISCINA_INFANTIL: "piscina-infantil",
  PLAYGROUD: "playground",
  PORTAO_ELETRONICO: "portao-eletronico",
  PORTARIA: "portaria",
  PORTARIA_24HS: "portaria-24h",
  PORTEIRO_EL: "porteiro-eletronico",
  QUADRA_ESPORTES: "quadra-de-esportes",
  QUADRA_TENIS: "quadra-de-tenis",
  QUIOSQUE: "quiosque",
  SALAO_FESTAS: "salao-de-festas",
  SALA_JOGOS: "salao-de-jogos",
  SAUNA_COL: "sauna-coletiva",
  SEGURANCA: "seguranca",
  SPA: "spa",
  TERRACO_COL: "terraco-coletivo",
  VIGILANCIA_24H: "vigilancia-24h",
  ZELADOR: "zelador",
};

export function rotuloCaracteristica(chave: string): string | undefined {
  return CARACTERISTICAS.find((c) => c.chave === chave)?.rotulo;
}

export const grupoCaracteristica = (chave: string): GrupoCaracteristica | undefined => CARACTERISTICAS.find((c) => c.chave === chave)?.grupo;

/** Chaves que viram filtro rápido no grid (o valor do parâmetro `carac` na URL). */
export const CARACTERISTICAS_FILTRO: readonly string[] = [
  "piscina",
  "academia",
  "area-gourmet",
  "varanda",
  "mobiliado",
  "condominio-fechado",
];

/** Rótulo do filtro rápido (o da chave pode ser mais específico, como "Piscina privativa"). */
const ROTULO_FILTRO: Record<string, string> = { piscina: "Piscina", "area-gourmet": "Área gourmet" };

export const rotuloFiltroCaracteristica = (chave: string) => ROTULO_FILTRO[chave] ?? rotuloCaracteristica(chave);

/** O filtro rápido aceita qualquer uma destas chaves (piscina do imóvel ou do condomínio, etc.). */
const FILTRO_ACEITA: Record<string, readonly string[]> = {
  piscina: ["piscina", "piscina-coletiva", "piscina-aquecida", "piscina-infantil"],
  "area-gourmet": ["area-gourmet", "varanda-com-churrasqueira"],
  varanda: ["varanda", "varanda-com-churrasqueira"],
};

/** O imóvel com estas chaves passa no filtro rápido `filtro`? */
export const atendeFiltroCaracteristica = (filtro: string, chaves: readonly string[]) =>
  (FILTRO_ACEITA[filtro] ?? [filtro]).some((c) => chaves.includes(c));
