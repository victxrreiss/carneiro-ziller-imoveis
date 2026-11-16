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

/** Link `tel:` do telefone da empresa, com o código do país. */
export function linkTelefone(): string {
  return `tel:+55${empresa.telefone.replace(/\D/g, "")}`;
}

// Redes sociais: `null` até o cliente informar a URL; o ícone só aparece com URL real.
export const social: { instagram: string | null; linkedin: string | null } = {
  instagram: null,
  linkedin: null,
};

/**
 * Abertura da página inicial. Com `video` preenchido, a seção toca o vídeo (mudo, em loop)
 * por cima da primeira imagem; sem ele, as imagens se alternam.
 * Nas frases, a quebra de linha separa a parte em itálico (a segunda linha).
 */
export const abertura: {
  video: null | { mp4: string; poster: string };
  imagens: readonly { src: string; alt: string }[];
  frases: readonly string[];
} = {
  video: null,
  imagens: [
    { src: "/images/imoveis/a1843e848f2e8288905697ba4fc1dc0a.jpg", alt: "Casa envidraçada com piscina ao entardecer, com a serra ao fundo" },
    { src: "/images/venda-vila-da-serra.jpg", alt: "Varanda de madeira aberta para o jardim e a piscina, à noite" },
    { src: "/images/imoveis/f40a059ac95c00760f5ea57662eb9888.jpg", alt: "Duas torres residenciais entre jardins, sob céu azul" },
  ],
  frases: [
    "Morar bem começa\npela escolha do endereço.",
    "Entre a serra e a cidade,\no seu lugar.",
    "Casas que pedem silêncio,\nvistas que pedem tempo.",
    "Cada imóvel, uma história\nque começa com você.",
  ],
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
