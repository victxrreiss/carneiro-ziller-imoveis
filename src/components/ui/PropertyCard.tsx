import Image from "next/image";
import Link from "next/link";
import type { ImovelCard } from "@/lib/imoveis";
import { routes } from "@/lib/routes";
import { AreaIcon, ArrowIcon, BedIcon, PinIcon } from "./Icons";

export function PropertyCard({ imovel }: { imovel: ImovelCard }) {
  const { id, badge, title, location, price, area, beds, img, alt } = imovel;

  return (
    <article className="group flex flex-col bg-white transition-[box-shadow,translate] duration-300 ease-[ease] hover:-translate-y-0.75 hover:shadow-[0_22px_44px_rgba(65,64,66,.14)]">
      <div className="relative h-57.5 overflow-hidden">
        <Image
          src={img}
          alt={alt}
          fill
          sizes="(max-width: 600px) calc(100vw - 48px), 300px"
          className="object-cover transition-transform duration-600 ease-[ease] group-hover:scale-105"
        />
        <span className="absolute top-3.5 left-3.5 bg-fundo px-2.75 py-1.5 text-[10px] font-semibold tracking-[0.22em] text-vinho">
          {badge}
        </span>
      </div>
      <div className="flex flex-1 flex-col gap-2 px-5.5 pt-5.5 pb-5">
        <div className="flex items-center gap-1.5 text-xs text-cinza">
          <PinIcon size={14} color="#78323D" />
          {location}
        </div>
        <h3 className="m-0 font-serif text-[23px] leading-[1.15] font-normal text-azul-noite">{title}</h3>
        <div className="mt-1 flex flex-wrap gap-x-4.5 gap-y-1.5 text-[13px] text-texto-secundario">
          <span className="flex items-center gap-1.5">
            <AreaIcon color="#6D6E71" />
            {area}
          </span>
          {beds && (
            <span className="flex items-center gap-1.5">
              <BedIcon color="#6D6E71" />
              {beds}
            </span>
          )}
        </div>
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-areia pt-4">
          <span className="text-lg font-semibold text-azul-noite tabular-nums">{price}</span>
          <Link
            href={routes.imovel(id)}
            aria-label={`Ver imóvel: ${title}`}
            className="box-content flex h-11 w-11 items-center justify-center border border-areia"
          >
            <ArrowIcon />
          </Link>
        </div>
      </div>
    </article>
  );
}
