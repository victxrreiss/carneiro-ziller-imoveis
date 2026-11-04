// Dados institucionais exibidos no site (marca única, um só contato).
export const empresa = {
  nome: "Carneiro & Ziller Imóveis",
  creci: "CRECI 7904",
  telefone: "(31) 99539-5988",
  whatsapp: "5531995395988",
  email: "contato@carneiroinvestimoveis.com.br",
  endereco: ["Alameda Oscar Niemeyer, 288", "Vale do Sereno, Nova Lima - MG"],
} as const satisfies {
  nome: string;
  creci: string;
  telefone: string;
  whatsapp: string;
  email: string;
  endereco: readonly [string, string];
};

/** Link do WhatsApp da empresa, com mensagem pré-preenchida opcional. */
export function linkWhatsApp(mensagem?: string): string {
  const base = `https://wa.me/${empresa.whatsapp}`;
  return mensagem ? `${base}?text=${encodeURIComponent(mensagem)}` : base;
}

// Redes sociais: `null` até o cliente informar a URL; o ícone só aparece com URL real.
export const social: { instagram: string | null; linkedin: string | null } = {
  instagram: null,
  linkedin: null,
};
