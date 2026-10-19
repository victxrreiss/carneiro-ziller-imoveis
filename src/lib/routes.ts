// Rotas do site.
const imoveis = "/imoveis";
const imovel = (id: string) => `/imovel/${encodeURIComponent(id)}`;

/** Âncora que abre o formulário de interesse ao chegar na tela do imóvel. */
export const ANCORA_AGENDAR = "agendar";

export const routes = {
  home: "/",
  /** Grid de imóveis com filtros e paginação. */
  imoveis,
  /** O mesmo grid, já filtrado por lançamentos (decisão do usuário, 2026-10-16). */
  lancamentos: `${imoveis}?finalidade=lancamentos`,
  contato: "/contato",
  sobre: "/sobre",
  privacidade: "/politica-de-privacidade",
  /**
   * Tela do imóvel. `de` é a querystring do grid de onde a pessoa veio, para o
   * "Voltar aos resultados" manter os filtros.
   */
  imovel: (id: string, de?: string) => (de === undefined ? imovel(id) : `${imovel(id)}?de=${encodeURIComponent(de)}`),
  /** Tela do imóvel com o formulário de interesse já aberto. */
  agendarVisita: (id: string) => `${imovel(id)}#${ANCORA_AGENDAR}`,
  regiao: (nome: string) => `${imoveis}?q=${encodeURIComponent(nome)}`,
} as const;

export type NavKey = "home" | "lancamentos" | "imoveis" | "contato" | "sobre";

export const navItems: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: routes.home },
  { key: "lancamentos", label: "Lançamentos", href: routes.lancamentos },
  { key: "imoveis", label: "Imóveis", href: routes.imoveis },
  { key: "contato", label: "Contato", href: routes.contato },
  { key: "sobre", label: "Sobre nós", href: routes.sobre },
];
