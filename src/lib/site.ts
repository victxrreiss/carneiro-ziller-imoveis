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

/** Descrição padrão do site (metadados e Open Graph). */
export const descricaoSite =
  "Imóveis de alto padrão em Belo Horizonte e Nova Lima. Apartamentos, coberturas, casas em condomínio e terrenos selecionados pela Carneiro & Ziller Imóveis.";

/** Open Graph padrão: o layout o aplica; páginas que definem o próprio openGraph o espalham. */
export const ogPadrao = {
  type: "website" as const,
  siteName: empresa.nome,
  locale: "pt_BR",
  title: empresa.nome,
  description: descricaoSite,
  images: [{ url: "/images/hero-predio.png", width: 1240, height: 1160, alt: "Fachada de edifício residencial moderno" }],
};

/**
 * Rastreamento enviado pelo gestor de tráfego do cliente: Google Tag Manager (o Analytics é
 * configurado dentro dele) e Meta Pixel. Só roda no domínio de produção, para testes e
 * ambientes locais não poluírem as métricas.
 */
export const rastreamento = {
  gtm: "GTM-TM8VNT4Q",
  metaPixel: "1482398396141820",
  dominio: "carneiroziller.com.br",
} as const;

export function rastreamentoAtivo(siteUrl: string | undefined): boolean {
  if (!siteUrl) return false;
  try {
    return new URL(siteUrl).hostname === rastreamento.dominio;
  } catch {
    return false;
  }
}
