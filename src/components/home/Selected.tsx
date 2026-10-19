import { getImoveisLocacao, getImoveisVenda } from "@/lib/imoveis";
import { SelectedTabs } from "./SelectedTabs";

export async function Selected() {
  const [venda, locacao] = await Promise.all([getImoveisVenda(), getImoveisLocacao()]);

  return (
    // pb de 120px: o respiro que a seção CTA (removida) dava antes do rodapé.
    <section aria-labelledby="sel-titulo" className="mx-auto box-content max-w-310 px-6 pt-30 pb-30">
      <SelectedTabs venda={venda} locacao={locacao} />
    </section>
  );
}
