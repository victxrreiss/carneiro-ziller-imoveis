import { getDestaquesHome } from "@/lib/imoveis";
import { PropertyGrid } from "./PropertyGrid";
import { SectionHeader } from "./SectionHeader";

export async function Selected() {
  const items = await getDestaquesHome();
  // Escolhidos pelo ADMIN no painel. Sem nenhum, a seção não aparece.
  if (!items.length) return null;

  return (
    // pb de 120px: o respiro que a seção CTA (removida) dava antes do rodapé.
    <section aria-labelledby="sel-titulo" className="mx-auto box-content max-w-310 px-6 pt-30 pb-30">
      <SectionHeader id="sel-titulo" label="SELECIONADOS" title="Imóveis em destaque" gapClass="gap-5" />
      <PropertyGrid items={items} />
    </section>
  );
}
