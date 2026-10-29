// Características do imóvel: lista fixa (chave gravada no banco + rótulo exibido)
// e o mapa das "Features" do feed VRSync da Loft para essas chaves.

export const CARACTERISTICAS: readonly { chave: string; rotulo: string }[] = [
  { chave: "piscina", rotulo: "Piscina" },
  { chave: "academia", rotulo: "Academia" },
  { chave: "area-gourmet", rotulo: "Área gourmet" },
  { chave: "varanda", rotulo: "Varanda" },
  { chave: "mobiliado", rotulo: "Mobiliado" },
  { chave: "condominio-fechado", rotulo: "Condomínio fechado" },
  { chave: "churrasqueira", rotulo: "Churrasqueira" },
  { chave: "elevador", rotulo: "Elevador" },
  { chave: "salao-de-festas", rotulo: "Salão de festas" },
  { chave: "salao-de-jogos", rotulo: "Salão de jogos" },
  { chave: "playground", rotulo: "Playground" },
  { chave: "quadra-de-tenis", rotulo: "Quadra de tênis" },
  { chave: "sauna", rotulo: "Sauna" },
  { chave: "spa", rotulo: "Spa" },
  { chave: "ar-condicionado", rotulo: "Ar-condicionado" },
  { chave: "aquecimento", rotulo: "Aquecimento" },
  { chave: "lareira", rotulo: "Lareira" },
  { chave: "cozinha", rotulo: "Cozinha" },
  { chave: "lavanderia", rotulo: "Lavanderia" },
  { chave: "escritorio", rotulo: "Escritório" },
  { chave: "dependencia-de-empregada", rotulo: "Dependência de empregada" },
  { chave: "jardim", rotulo: "Jardim" },
  { chave: "quintal", rotulo: "Quintal" },
  { chave: "vista-panoramica", rotulo: "Vista panorâmica" },
  { chave: "vista-para-o-mar", rotulo: "Vista para o mar" },
  { chave: "interfone", rotulo: "Interfone" },
  { chave: "circuito-de-tv", rotulo: "Circuito de TV" },
  { chave: "internet", rotulo: "Internet" },
  { chave: "recepcao", rotulo: "Recepção" },
  { chave: "deposito", rotulo: "Depósito" },
];

/** "Feature" do feed VRSync (em inglês) → chave. "Number of stories" não é característica. */
export const CARACTERISTICA_VRSYNC: Record<string, string> = {
  Gym: "academia",
  "Maids Quarters": "dependencia-de-empregada",
  "Party Room": "salao-de-festas",
  Kitchen: "cozinha",
  "Gourmet Area": "area-gourmet",
  Playground: "playground",
  Cooling: "ar-condicionado",
  Pool: "piscina",
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
  Sauna: "sauna",
  "TV Security": "circuito-de-tv",
  Backyard: "quintal",
  Fireplace: "lareira",
  Laundry: "lavanderia",
  "Internet Connection": "internet",
  Balcony: "varanda",
  "Reception room": "recepcao",
  Heating: "aquecimento",
  "Ocean View": "vista-para-o-mar",
  Warehouse: "deposito",
};

export function rotuloCaracteristica(chave: string): string | undefined {
  return CARACTERISTICAS.find((c) => c.chave === chave)?.rotulo;
}

/** Chaves que viram filtro rápido no grid. */
export const CARACTERISTICAS_FILTRO: readonly string[] = [
  "piscina",
  "academia",
  "area-gourmet",
  "varanda",
  "mobiliado",
  "condominio-fechado",
];
