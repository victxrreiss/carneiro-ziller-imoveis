import { crecis, unidades } from "@/lib/site";

export function UtilityBar() {
  return (
    <div data-section="utility" className="bg-azul-noite text-xs text-areia">
      <div className="mx-auto flex box-content max-w-310 flex-wrap justify-between gap-x-6 gap-y-1.5 px-6 py-[9px]">
        <div className="flex flex-wrap gap-x-6 gap-y-1.5">
          <span>
            {unidades.carneiro.nome} · {unidades.carneiro.telefone}
          </span>
          <span>
            {unidades.ziller.nome} · {unidades.ziller.telefone}
          </span>
        </div>
        <div className="tracking-[0.08em] text-prata">{crecis}</div>
      </div>
    </div>
  );
}
