"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { PaginaImoveis } from "@/lib/imoveis";
import { tituloGrid, urlGrid, type Filtros } from "@/lib/imoveis/filtros";
import { routes } from "@/lib/routes";
import { FiltrosImoveis } from "./FiltrosImoveis";
import { Resultados, type EstadoResultados } from "./Resultados";

type Props = {
  filtros: Filtros;
  /** null quando a busca falhou. */
  resultado: PaginaImoveis | null;
  contar: (query: string) => Promise<number>;
  /** Primeira carga, antes de o servidor ler a URL (fallback do Suspense). */
  esqueleto?: boolean;
};

/**
 * Grid de imóveis. Os filtros vivem na URL: cada mudança navega para a nova
 * querystring e o servidor devolve os resultados. Enquanto isso, a tela já
 * mostra os filtros escolhidos e o skeleton.
 */
export function ImoveisView({ filtros, resultado, contar, esqueleto = false }: Props) {
  const router = useRouter();
  const [carregando, iniciar] = useTransition();
  const [filtrosTela, setFiltrosTela] = useOptimistic(filtros);

  function aplicar(proximos: Filtros, { rolar = false } = {}) {
    iniciar(() => {
      setFiltrosTela(proximos);
      router.push(urlGrid(proximos), { scroll: false });
    });
    if (rolar) document.getElementById("resultados")?.scrollIntoView();
  }

  const estado: EstadoResultados = carregando || esqueleto
    ? { tipo: "carregando" }
    : resultado
      ? { tipo: "ok", resultado }
      : { tipo: "erro" };
  const lancamentos = filtrosTela.finalidade === "lancamentos";

  return (
    <main>
      <section className="page-head">
        <div className="wrap">
          <nav className="crumbs" aria-label="Você está em">
            <Link href={routes.home}>Home</Link>
            <span className="sep" aria-hidden="true">
              /
            </span>
            <span>{lancamentos ? "Lançamentos" : "Imóveis"}</span>
          </nav>
          <div className="eyebrow">{lancamentos ? "LANÇAMENTOS" : "IMÓVEIS"}</div>
          <h1 className="page-title">{tituloGrid(filtrosTela.finalidade)}</h1>
          <p className="page-sub">
            Apartamentos, coberturas, casas em condomínio, lançamentos e imóveis comerciais em Belo Horizonte e Nova Lima.
          </p>
        </div>
      </section>
      <FiltrosImoveis
        filtros={filtrosTela}
        onAplicar={(f) => aplicar(f)}
        contar={contar}
        totalAtual={resultado?.total ?? 0}
      />
      <Resultados
        estado={estado}
        filtros={filtros}
        onPagina={(pagina) => aplicar({ ...filtros, pagina }, { rolar: true })}
        onLimpar={() => aplicar({ pagina: 1 })}
        onTentarDeNovo={() => iniciar(() => router.refresh())}
      />
    </main>
  );
}
