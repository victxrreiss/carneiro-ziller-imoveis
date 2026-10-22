import Image from "next/image";
import Link from "next/link";
import { PinIcon } from "@/components/ui/Icons";
import { getDestaque } from "@/lib/imoveis";
import { routes } from "@/lib/routes";

const label = "text-[10px] tracking-[0.22em] text-cinza";

/** Oportunidade de hoje: o imóvel que o ADMIN escolhe no painel. Sem escolha, a seção não aparece. */
export async function FeaturedProperty() {
  const d = await getDestaque();
  if (!d) return null;
  const specs = [
    { label: "ÁREA", value: d.area },
    { label: "QUARTOS", value: d.quartos },
    { label: "VAGAS", value: d.vagas },
  ].filter((s): s is { label: string; value: string } => Boolean(s.value));

  return (
    <section aria-labelledby="destaque-titulo" className="mx-auto box-content max-w-310 px-6 pt-30">
      {/* Até 900px o card desce para baixo da foto, subindo 56px sobre ela. */}
      <div className="grid grid-cols-12 items-center">
        <div className="relative col-[1/9] row-start-1 h-140 overflow-hidden max-[901px]:col-[1/-1]">
          <Image src={d.img} alt={d.alt} fill sizes="(max-width: 900px) calc(100vw - 48px), 830px" className="object-cover" />
          <div className="absolute top-6 left-6 bg-azul-noite px-3.5 py-2 text-[11px] font-semibold tracking-[0.24em] text-white">
            OPORTUNIDADE DE HOJE
          </div>
        </div>

        <article className="relative z-2 col-[7/13] row-start-1 flex flex-col gap-4 border-t-3 border-vinho bg-white p-12 shadow-[0_30px_60px_rgba(65,64,66,0.12)] max-[901px]:col-[1/-1] max-[901px]:row-start-2 max-[901px]:mx-4 max-[901px]:-mt-14">
          <div className="text-[11px] tracking-[0.24em] text-cinza">
            CÓD. {d.codigo} · {d.tipo.toUpperCase()}
          </div>
          <h2 id="destaque-titulo" className="m-0 font-serif text-[40px] leading-[1.08] font-normal text-azul-noite">
            {d.titulo}
          </h2>
          <div className="flex items-center gap-2 text-sm text-cinza">
            <PinIcon color="#78323D" />
            {d.local}
          </div>
          <p className="m-0 text-[15px] leading-[1.75] text-texto-secundario">{d.descricao}</p>
          <div className="grid border-y border-areia" style={{ gridTemplateColumns: `repeat(${specs.length}, minmax(0, 1fr))` }}>
            {specs.map((s, i) => (
              <div key={s.label} className={`flex flex-col gap-1 py-4 ${i > 0 ? "border-l border-areia pl-4" : ""}`}>
                <span className={label}>{s.label}</span>
                <span className="text-[17px] font-medium">{s.value}</span>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap items-center justify-between gap-4 pt-1.5">
            <div className="flex flex-col gap-0.5">
              <span className={label}>VALOR</span>
              <span className="text-[26px] font-semibold text-azul-noite tabular-nums">{d.valor}</span>
            </div>
            <Link
              href={routes.agendarVisita(d.id)}
              className="bg-azul-noite px-6.5 py-4 text-xs font-semibold tracking-[0.2em] text-white transition-colors duration-200 hover:bg-azul-noite-hover"
            >
              AGENDAR VISITA
            </Link>
          </div>
        </article>
      </div>
    </section>
  );
}
