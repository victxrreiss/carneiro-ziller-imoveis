"use client";

import Image from "next/image";
import Link from "next/link";
import { IcArea, IcCama, IcPin, IcSeta } from "@/components/ui/IconesSite";
import type { ImovelResumo } from "@/lib/imoveis";
import { formatarArea, formatarPreco, formatarQuartos, rotuloFinalidade } from "@/lib/imoveis/formato";
import { registrarSaidaDoGrid } from "@/lib/navegacao/retorno";
import { routes } from "@/lib/routes";

type Props = {
  imovel: ImovelResumo;
  /** Querystring do grid atual, levada para o "Voltar aos resultados". */
  de: string;
  /** URL do grid atual. */
  grid: string;
  /** Fotos acima da dobra carregam com prioridade. */
  prioridade?: boolean;
};

export function CardImovel({ imovel: i, de, grid, prioridade }: Props) {
  return (
    <article className="card">
      <div className="card-media">
        <Image
          className="card-img"
          src={i.foto.src}
          alt=""
          fill
          sizes="(max-width: 600px) calc(100vw - 48px), (max-width: 1080px) calc(50vw - 36px), 382px"
          loading={prioridade ? "eager" : "lazy"}
        />
        <span className="badge">{rotuloFinalidade[i.finalidade]}</span>
      </div>
      <div className="card-body">
        <div className="card-loc">
          <IcPin size={14} />
          {i.bairro}, {i.cidade}
        </div>
        <h3 className="card-title">
          <Link href={routes.imovel(i.id, de)} onClick={() => registrarSaidaDoGrid(grid, routes.imovel(i.id))}>
            {i.titulo}
          </Link>
        </h3>
        <div className="card-specs">
          <span>
            <IcArea />
            {formatarArea(i.area)}
          </span>
          {i.quartos && (
            <span>
              <IcCama />
              {formatarQuartos(i.quartos)}
            </span>
          )}
        </div>
        <div className="card-foot">
          <span className="card-price">{formatarPreco(i.valor, i.finalidade)}</span>
          <span className="card-arrow" aria-hidden="true">
            <IcSeta />
          </span>
        </div>
      </div>
    </article>
  );
}
