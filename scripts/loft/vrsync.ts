// Leitura do feed XML no formato VRSync (Viva Real), gerado pelo CRM da Loft.
// Só extrai o que a ficha usa. ContactInfo (e-mail e nome da imobiliária) é ignorado de propósito.
import { XMLParser } from "fast-xml-parser";

export type AnuncioVrsync = {
  referencia: string;
  titulo: string;
  transacao: "venda" | "locacao" | "venda-locacao";
  /** Como vem no feed, ex.: "Residential / Apartment". */
  tipoVrsync: string;
  descricao: string;
  precoVenda: number | null;
  precoLocacao: number | null;
  condominio: number | null;
  iptu: number | null;
  areaUtil: number | null;
  areaTerreno: number | null;
  quartos: number | null;
  suites: number | null;
  banheiros: number | null;
  vagas: number | null;
  andar: number | null;
  ano: number | null;
  features: string[];
  endereco: string;
  numero: string;
  complemento: string;
  cep: string;
  bairro: string;
  cidade: string;
  uf: string;
  /** Em ordem do feed, com a capa (`primary="true"`) primeiro. */
  fotos: string[];
};

type No = Record<string, unknown>;

const parser = new XMLParser({
  removeNSPrefix: true,
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  // Sem conversão: a referência e o CEP são texto (zeros à esquerda importam).
  parseTagValue: false,
  parseAttributeValue: false,
  trimValues: true,
  isArray: (nome) => nome === "Listing" || nome === "Item" || nome === "Feature",
});

const texto = (v: unknown): string => {
  if (v == null) return "";
  if (typeof v === "object") return texto((v as No)["#text"]);
  return String(v).trim();
};

/** Zero significa "não informado" no feed. */
function inteiro(v: unknown): number | null {
  const n = Number(texto(v));
  return Number.isFinite(n) && n > 0 ? Math.round(n) : null;
}

function transacao(v: string): AnuncioVrsync["transacao"] {
  if (v === "Sale/Rent") return "venda-locacao";
  if (v === "For Rent") return "locacao";
  return "venda";
}

export function lerVrsync(xml: string): AnuncioVrsync[] {
  const raiz = parser.parse(xml) as No;
  const listings = ((raiz.ListingDataFeed as No | undefined)?.Listings as No | undefined)?.Listing as No[] | undefined;
  if (!listings) throw new Error("Feed VRSync inválido: nenhum <Listing> encontrado.");

  return listings.map((l) => {
    const d = (l.Details ?? {}) as No;
    const loc = (l.Location ?? {}) as No;
    const itens = ((l.Media as No | undefined)?.Item ?? []) as No[];
    const fotos = [...itens.filter((i) => i["@_primary"] === "true"), ...itens.filter((i) => i["@_primary"] !== "true")].map(texto).filter(Boolean);
    const features = (((d.Features as No | undefined)?.Feature ?? []) as unknown[]).map(texto).filter(Boolean);
    const estado = loc.State as No | string | undefined;
    return {
      referencia: texto(l.ListingID),
      titulo: texto(l.Title),
      transacao: transacao(texto(l.TransactionType)),
      tipoVrsync: texto(d.PropertyType),
      descricao: texto(d.Description),
      precoVenda: inteiro(d.ListPrice),
      precoLocacao: inteiro(d.RentalPrice),
      condominio: inteiro(d.PropertyAdministrationFee),
      iptu: inteiro(d.YearlyTax),
      areaUtil: inteiro(d.LivingArea),
      areaTerreno: inteiro(d.LotArea),
      quartos: inteiro(d.Bedrooms),
      suites: inteiro(d.Suites),
      banheiros: inteiro(d.Bathrooms),
      vagas: inteiro(d.Garage),
      andar: inteiro(d.UnitFloor),
      ano: inteiro(d.YearBuilt),
      features,
      endereco: texto(loc.Address),
      numero: texto(loc.StreetNumber),
      complemento: texto(loc.Complement),
      cep: texto(loc.PostalCode),
      bairro: texto(loc.Neighborhood),
      cidade: texto(loc.City),
      uf: typeof estado === "object" && estado ? String(estado["@_abbreviation"] ?? "").trim() : "",
      fotos,
    };
  });
}
