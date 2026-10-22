"use client";

import { useState } from "react";
import { PropertyCard } from "@/components/ui/PropertyCard";
import { TabList } from "@/components/ui/TabList";
import type { ImovelCard } from "@/lib/imoveis";
import { propertyGridClass } from "./PropertyGrid";
import { SectionHeader } from "./SectionHeader";

type Listagem = "venda" | "locacao";

const ID_PREFIX = "sel";
const panelId = (id: Listagem) => `painel-${id}`;

export function SelectedTabs({ venda, locacao }: { venda: ImovelCard[]; locacao: ImovelCard[] }) {
  // Aba sem imóvel publicado fica oculta.
  const panels = (
    [
      { id: "venda", label: "VENDA", items: venda },
      { id: "locacao", label: "LOCAÇÃO", items: locacao },
    ] satisfies { id: Listagem; label: string; items: ImovelCard[] }[]
  ).filter((p) => p.items.length > 0);
  const [escolhida, setSelected] = useState<Listagem>(panels[0]?.id ?? "venda");
  const selected = panels.some((p) => p.id === escolhida) ? escolhida : (panels[0]?.id ?? "venda");

  return (
    <>
      <SectionHeader
        id="sel-titulo"
        label="MAIS RECENTES"
        title="Imóveis em destaque"
        gapClass="gap-5"
        aside={
          <TabList
            label="Venda ou locação"
            tabs={panels.map((p) => ({ id: p.id, label: p.label, controls: panelId(p.id) }))}
            selected={selected}
            onSelect={(id) => setSelected(id as Listagem)}
            variant="listagem"
            idPrefix={ID_PREFIX}
          />
        }
      />
      {panels.map((p) => (
        <div
          key={p.id}
          id={panelId(p.id)}
          role="tabpanel"
          aria-labelledby={`${ID_PREFIX}-tab-${p.id}`}
          hidden={p.id !== selected}
          className={propertyGridClass}
        >
          {p.items.map((item) => (
            <PropertyCard key={item.id} imovel={item} />
          ))}
        </div>
      ))}
    </>
  );
}
