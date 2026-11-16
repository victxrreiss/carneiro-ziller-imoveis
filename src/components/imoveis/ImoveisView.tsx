"use client";

import { useRouter } from "next/navigation";
import { useOptimistic, useTransition } from "react";
import type { PaginaImoveis } from "@/lib/imoveis";
import { urlGrid, type Filtros } from "@/lib/imoveis/filtros";
import { FiltrosImoveis } from "./FiltrosImoveis";
import { Resultados, type EstadoResultados } from "./Resultados";

type Props = {
  filtros: Filtros;
  /** null quando a busca falhou. */
  resultado: PaginaImoveis | null;
  localizacoes: { cidade: string; bairros: string[] }[];
  /** Tipos com imóvel na finalidade escolhida, para o select de tipo. */
  tipos: { tipo: string; total: number }[];
  temLancamentos: boolean;
  /** `?avancados=1`: o painel de filtros avançados já chega aberto. */
  avancados?: boolean;
  /** Primeira carga, antes de o servidor ler a URL (fallback do Suspense). */
  esqueleto?: boolean;
};

/**
 * Grid de imóveis. Os filtros vivem na URL: cada mudança navega para a nova
 * querystring e o servidor devolve os resultados. Enquanto isso, a tela já
 * mostra os filtros escolhidos e o skeleton.
 */
export function ImoveisView({ filtros, resultado, localizacoes, tipos, temLancamentos, avancados = false, esqueleto = false }: Props) {
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

  return (
    <main>
      <section className="pg-cab">
        <div className="wrap">
          <p className="pg-eyebrow">Belo Horizonte · Nova Lima</p>
          <h1 className="pg-titulo">{filtrosTela.finalidade === "lancamentos" ? "Lançamentos" : "Imóveis"}</h1>
        </div>
      </section>
      <FiltrosImoveis
        filtros={filtrosTela}
        onAplicar={(f) => aplicar(f)}
        localizacoes={localizacoes}
        tipos={tipos}
        temLancamentos={temLancamentos}
        avancados={avancados}
      />
      <Resultados
        estado={estado}
        filtros={filtros}
        escolhidos={filtrosTela}
        onAplicar={(f) => aplicar(f)}
        onPagina={(pagina) => aplicar({ ...filtros, pagina }, { rolar: true })}
        onLimpar={() => aplicar({ pagina: 1 })}
        onTentarDeNovo={() => iniciar(() => router.refresh())}
      />
    </main>
  );
}
