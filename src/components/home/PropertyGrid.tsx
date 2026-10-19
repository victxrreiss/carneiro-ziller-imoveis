import { PropertyCard } from "@/components/ui/PropertyCard";
import type { ImovelCard } from "@/lib/imoveis";

export const propertyGridClass = "grid grid-cols-[repeat(auto-fill,minmax(260px,1fr))] gap-6";

export function PropertyGrid({ items }: { items: ImovelCard[] }) {
  return (
    <div className={propertyGridClass}>
      {items.map((item) => (
        <PropertyCard key={item.id} imovel={item} />
      ))}
    </div>
  );
}
