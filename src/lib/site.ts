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
  // Fotos de tela cheia: pelo menos 2560 px de largura (public/images/abertura/), senão ficam
  // borradas. Provisórias, do Unsplash (licença Unsplash: uso comercial livre, sem atribuição):
  // 1 Michael Brown (G48h926L2qo), 2 Retrato Inmobiliario (_ELoYrhi3ao), 3 Arthur Baudry (4vioYQ9Nn9Y).
  imagens: [
    { src: "/images/abertura/abertura-1.jpg", alt: "Casa contemporânea de vidro e pedra iluminada ao entardecer, com jardim na frente" },
    { src: "/images/abertura/abertura-2.jpg", alt: "Piscina e varanda com sala de estar ao anoitecer, entre árvores" },
    { src: "/images/abertura/abertura-3.jpg", alt: "Casa moderna branca com grandes janelas iluminadas ao anoitecer" },
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
