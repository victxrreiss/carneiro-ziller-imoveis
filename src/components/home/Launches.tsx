import Link from "next/link";
import { ArrowIcon } from "@/components/ui/Icons";
import { getLancamentos } from "@/lib/imoveis";
import { routes } from "@/lib/routes";
import { PropertyGrid } from "./PropertyGrid";
import { SectionHeader } from "./SectionHeader";

export async function Launches() {
  const items = await getLancamentos();

  return (
    <section aria-labelledby="lanc-titulo" className="mx-auto box-content max-w-310 px-6 pt-30">
      <SectionHeader
        id="lanc-titulo"
        label="LANÇAMENTOS"
        title="Para investir com visão de futuro"
        aside={
          <Link href={routes.lancamentos} className="flex items-center gap-2.5 text-[13px] font-semibold tracking-[0.18em]">
            VER TODOS <ArrowIcon />
          </Link>
        }
      />
      <PropertyGrid items={items} />
    </section>
  );
}
