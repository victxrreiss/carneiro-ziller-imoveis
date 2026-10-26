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

/**
 * Painel interno. O site só leva ao login, pelo SOU CORRETOR do header.
 * Hoje sob /painel; um subdomínio próprio é configuração de hospedagem.
 */
export const painel = {
  inicio: "/painel",
  entrar: "/painel/entrar",
  /** Entrar e depois voltar à página pedida (sem sessão). */
  entrarVoltando: (voltar: string) => (voltar === "/painel/imoveis" ? "/painel/entrar" : `/painel/entrar?voltar=${encodeURIComponent(voltar)}`),
  entrarExpirada: (voltar?: string) =>
    `/painel/entrar?motivo=sessao-expirada${voltar ? `&voltar=${encodeURIComponent(voltar)}` : ""}`,
  esqueci: "/painel/esqueci-senha",
  definirSenha: "/painel/definir-senha",
  imoveis: "/painel/imoveis",
  novoImovel: "/painel/imoveis/novo",
  imovel: (id: string) => `/painel/imoveis/${encodeURIComponent(id)}`,
  usuarios: "/painel/usuarios",
  conta: "/painel/conta",
} as const;

/** Só caminhos do painel servem de destino depois de entrar (evita redirecionamento aberto). */
export function destinoSeguro(voltar: string | undefined): string {
  return voltar && /^\/painel\/(?!entrar|esqueci-senha|definir-senha)[\w\-/]*$/.test(voltar) ? voltar : painel.imoveis;
}

export type NavKey = "home" | "lancamentos" | "imoveis" | "contato" | "sobre";

export const navItems: { key: NavKey; label: string; href: string }[] = [
  { key: "home", label: "Home", href: routes.home },
  { key: "lancamentos", label: "Lançamentos", href: routes.lancamentos },
  { key: "imoveis", label: "Imóveis", href: routes.imoveis },
  { key: "contato", label: "Contato", href: routes.contato },
  { key: "sobre", label: "Sobre nós", href: routes.sobre },
];
