// Volta do imóvel para o grid preservando página e rolagem (Lacuna 13 do
// README do Imóvel). Quem veio do grid volta pelo histórico, e o navegador
// restaura a posição; quem chegou direto (busca, link) navega normalmente.

const CHAVE = "cz:saida-do-grid";

type Saida = { grid: string; imovel: string };

export function registrarSaidaDoGrid(grid: string, imovel: string) {
  try {
    sessionStorage.setItem(CHAVE, JSON.stringify({ grid, imovel } satisfies Saida));
  } catch {
    // Sem sessionStorage (modo privado, bloqueio): a volta vira navegação comum.
  }
}

/** true se a página anterior do histórico é o grid de `destino`. */
export function podeVoltarPeloHistorico(destino: string, imovelAtual: string): boolean {
  try {
    const saida = JSON.parse(sessionStorage.getItem(CHAVE) ?? "null") as Saida | null;
    return !!saida && saida.grid === destino && saida.imovel === imovelAtual && window.history.length > 1;
  } catch {
    return false;
  }
}
