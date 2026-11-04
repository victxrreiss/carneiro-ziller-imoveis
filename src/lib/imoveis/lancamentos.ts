import { getTemLancamentos } from "@/lib/imoveis";

/**
 * `getTemLancamentos()` para a moldura do site (menu, rodapé e seletores de
 * finalidade). Se a leitura falhar sem cache, devolve `true` (menu completo)
 * em vez de derrubar a página inteira.
 */
export async function temLancamentosParaMenu(): Promise<boolean> {
  try {
    return await getTemLancamentos();
  } catch (erro) {
    console.error("Falha ao ler se há lançamentos", erro);
    return true;
  }
}
