"use client";

import Image from "next/image";
import Link from "next/link";
import { MarcaDagua } from "@/components/layout/MarcaDagua";
import type { ImovelResumo } from "@/lib/imoveis";
import { formatarArea, formatarMensal, formatarPreco, formatarQuartos, formatarVagas, rotuloEtiqueta } from "@/lib/imoveis/formato";
import { registrarSaidaDoGrid } from "@/lib/navegacao/retorno";
import { routes } from "@/lib/routes";

type Props = {
  imovel: ImovelResumo;
  /** Querystring do grid atual, levada para o "Voltar aos resultados". Fora do grid (Home, semelhantes), não se passa. */
  de?: string;
  /** URL do grid atual (junto com `de`). */
  grid?: string;
  /** Fotos acima da dobra carregam com prioridade. */
  prioridade?: boolean;
};

/**
 * Card de imóvel do site (grid, destaques da Home e semelhantes): foto 4:3 com etiqueta pequena e
 * marca d'água, bairro · cidade, título, "área · quartos · vagas" e preço. Só o que decide uma
 * visita: sem ícones, sem borda, sem código. Estilos: `.cz-card` em cz-site.css.
 */
export function CardImovel({ imovel: i, de, grid, prioridade }: Props) {
  return (
    <article className="cz-card">
      <div className="cz-card-foto">
        <Image
          src={i.foto.src}
          alt=""
          fill
          sizes="(max-width: 899px) calc(100vw - 32px), (max-width: 1149px) 50vw, 400px"
          loading={prioridade ? "eager" : "lazy"}
        />
        <span className="cz-card-tag">{rotuloEtiqueta(i)}</span>
        <MarcaDagua />
      </div>
      <div className="cz-card-meta">
        {i.bairro} · {i.cidade}
      </div>
      <h3 className="cz-card-titulo">
        <Link href={routes.imovel(i.id, de)} onClick={grid === undefined ? undefined : () => registrarSaidaDoGrid(grid, routes.imovel(i.id))}>
          {i.titulo}
        </Link>
      </h3>
      <div className="cz-card-dados">
        <span>{formatarArea(i.area)}</span>
        {i.quartos ? <span>{formatarQuartos(i.quartos)}</span> : null}
        {i.vagas ? <span>{formatarVagas(i.vagas)}</span> : null}
      </div>
      <div className="cz-card-preco">
        {formatarPreco(i.valor, i.finalidade)}
        {i.finalidade === "venda" && i.valorLocacao !== null && <small> ou {formatarMensal(i.valorLocacao)}</small>}
      </div>
    </article>
  );
}
