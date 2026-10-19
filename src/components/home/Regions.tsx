import Image from "next/image";
import Link from "next/link";
import { ArrowIcon } from "@/components/ui/Icons";
import { getRegioes } from "@/lib/imoveis";
import { routes } from "@/lib/routes";
import { SectionHeader } from "./SectionHeader";

export async function Regions() {
  const regioes = await getRegioes();

  return (
    <section aria-labelledby="regioes-titulo" className="mx-auto box-content max-w-310 px-6 pt-26">
      <SectionHeader
        id="regioes-titulo"
        label="EXPLORE"
        title="Os endereços mais desejados"
        aside={
          <p className="m-0 max-w-95 text-[15px] leading-[1.7] text-texto-secundario">
            Dos bairros nobres da zona sul de BH aos condomínios de Nova Lima.
          </p>
        }
      />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(230px,1fr))] gap-5">
        {regioes.map((r) => (
          // Lacuna 2 do README: 280px de altura abaixo de 600px.
          <Link
            key={r.nome}
            href={routes.regiao(r.nome)}
            className="group relative block h-100 overflow-hidden text-white max-[600px]:h-70"
          >
            <Image
              src={r.img}
              alt=""
              fill
              sizes="(max-width: 600px) calc(100vw - 48px), 290px"
              className="object-cover transition-transform duration-700 ease-[ease] group-hover:scale-[1.06]"
            />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(15,29,36,0)_35%,rgba(15,29,36,0.86)_100%)]" />
            <div className="absolute right-6 bottom-6 left-6 flex flex-col gap-2">
              <div className="text-[11px] tracking-[0.28em] text-areia">{r.cidade}</div>
              <div className="font-serif text-[30px] leading-[1.05] text-white">{r.nome}</div>
              <div className="mt-1.5 flex items-center gap-2 text-[13px] font-medium text-white">
                Ver imóveis <ArrowIcon color="#FFFFFF" />
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
