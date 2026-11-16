"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { IcAlerta, IcBusca, IcSeta, IcVoltar } from "@/components/ui/IconesSite";
import type { PaginaImoveis } from "@/lib/imoveis";
import { filtrosParaQuery, rotulosFiltros, semFiltro, urlGrid, type Filtros } from "@/lib/imoveis/filtros";
import { routes } from "@/lib/routes";
import { CardImovel } from "./CardImovel";

export type EstadoResultados = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "ok"; resultado: PaginaImoveis };

type Props = {
  estado: EstadoResultados;
  /** Filtros da página que o servidor devolveu (paginação e o "Voltar aos resultados" dos cards). */
  filtros: Filtros;
  /** Filtros já escolhidos na tela, que podem estar à frente do servidor: são os chips. */
  escolhidos: Filtros;
  onPagina: (pagina: number) => void;
  onAplicar: (filtros: Filtros) => void;
  onLimpar: () => void;
  onTentarDeNovo: () => void;
};

export function Resultados({ estado, filtros, escolhidos, onPagina, onAplicar, onLimpar, onTentarDeNovo }: Props) {
  const total = estado.tipo === "ok" ? estado.resultado.total : null;
  return (
    <section className="resultados" aria-label="Resultados" id="resultados">
      <div className="wrap">
        <Topo escolhidos={escolhidos} onAplicar={onAplicar}>
          {estado.tipo === "carregando" && "Carregando imóveis…"}
          {total !== null && (
            <>
              {total} {total === 1 ? "imóvel" : "imóveis"}
              <span className="sr-only"> {total === 1 ? "encontrado" : "encontrados"}</span>
            </>
          )}
        </Topo>
        {estado.tipo === "carregando" && <Carregando />}
        {estado.tipo === "erro" && (
          <div className="notice" role="alert">
            <div className="notice-icon">
              <IcAlerta size={28} width={1.3} />
            </div>
            <h2>Não foi possível carregar os imóveis</h2>
            <p>Houve uma falha de conexão ao buscar os anúncios. Seus filtros foram mantidos.</p>
            <div className="notice-actions">
              <button type="button" className="btn" onClick={onTentarDeNovo}>
                TENTAR NOVAMENTE
              </button>
              <Link className="link-arrow" href={routes.contato}>
                Falar com um consultor →
              </Link>
            </div>
          </div>
        )}
        {total === 0 && (
          <div className="notice">
            <div className="notice-icon">
              <IcBusca size={28} width={1.3} />
            </div>
            <h2>Nenhum imóvel encontrado</h2>
            <p>
              Não há anúncios com essa combinação de filtros. Remova algum filtro ou limpe todos para ver o portfólio
              completo.
            </p>
            <div className="notice-actions">
              <button type="button" className="btn" onClick={onLimpar}>
                LIMPAR FILTROS
              </button>
              <Link className="link-arrow" href={routes.contato}>
                Falar com um consultor →
              </Link>
            </div>
          </div>
        )}
        {estado.tipo === "ok" && estado.resultado.total > 0 && <Lista resultado={estado.resultado} filtros={filtros} onPagina={onPagina} />}
      </div>
    </section>
  );
}

/** Linha acima do grid: os filtros ativos (cada chip remove o seu) e a contagem. */
function Topo({ escolhidos, onAplicar, children }: { escolhidos: Filtros; onAplicar: (f: Filtros) => void; children: ReactNode }) {
  const chips = rotulosFiltros(escolhidos);
  return (
    <div className="res-top">
      {chips.length > 0 && (
        <ul className="res-chips" aria-label="Filtros ativos">
          {chips.map((c) => (
            <li key={`${c.chave}${c.valor ?? ""}`}>
              <button type="button" aria-label={`Remover filtro ${c.rotulo}`} onClick={() => onAplicar(semFiltro(escolhidos, c.chave, c.valor))}>
                {c.rotulo} <span aria-hidden="true">×</span>
              </button>
            </li>
          ))}
        </ul>
      )}
      <h2 className="res-total" aria-live="polite">
        {children}
      </h2>
    </div>
  );
}

function Carregando() {
  return (
    <ul className="cards" aria-busy="true">
      {[1, 2, 3, 4, 5, 6].map((n) => (
        <li key={n} aria-hidden="true" className="sk">
          <div className="sk-foto shimmer" />
          <div className="sk-linha shimmer" style={{ width: "45%" }} />
          <div className="sk-linha shimmer" style={{ height: 26, width: "80%" }} />
          <div className="sk-linha shimmer" style={{ width: "55%" }} />
          <div className="sk-linha shimmer" style={{ height: 24, width: "40%" }} />
        </li>
      ))}
    </ul>
  );
}

/** 1 … p-1 p p+1 … N */
export function numerosPaginacao(pagina: number, paginas: number): (number | "gap")[] {
  const nums = [...new Set([1, paginas, pagina - 1, pagina, pagina + 1])]
    .filter((n) => n >= 1 && n <= paginas)
    .sort((a, b) => a - b);
  const out: (number | "gap")[] = [];
  let anterior = 0;
  for (const n of nums) {
    if (n - anterior > 1) out.push("gap");
    out.push(n);
    anterior = n;
  }
  return out;
}

function Lista({ resultado, filtros, onPagina }: { resultado: PaginaImoveis; filtros: Filtros; onPagina: (p: number) => void }) {
  const { itens, pagina, paginas } = resultado;
  const de = filtrosParaQuery({ ...filtros, pagina });
  const grid = urlGrid({ ...filtros, pagina });
  return (
    <>
      <ul className="cards">
        {itens.map((i, k) => (
          <li key={i.id}>
            <CardImovel imovel={i} de={de} grid={grid} prioridade={k < 3} />
          </li>
        ))}
      </ul>
      {paginas > 1 && (
        // No celular, com Anterior e Próxima juntos, os rótulos somem para caber em uma linha.
        <nav className={pagina > 1 && pagina < paginas ? "pag pag-meio" : "pag"} aria-label="Paginação">
          <ol>
            {pagina > 1 && (
              <li>
                <button type="button" className="pag-texto" aria-label="Página anterior" onClick={() => onPagina(pagina - 1)}>
                  <IcVoltar stroke="currentColor" />
                  <span>Anterior</span>
                </button>
              </li>
            )}
            {numerosPaginacao(pagina, paginas).map((n, k) =>
              n === "gap" ? (
                <li key={`gap-${k}`} className="pag-gap" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={n}>
                  <button type="button" aria-current={n === pagina ? "page" : undefined} aria-label={`Página ${n}`} onClick={() => n !== pagina && onPagina(n)}>
                    {n}
                  </button>
                </li>
              ),
            )}
            {pagina < paginas && (
              <li>
                <button type="button" className="pag-texto" aria-label="Próxima página" onClick={() => onPagina(pagina + 1)}>
                  <span>Próxima</span>
                  <IcSeta stroke="currentColor" />
                </button>
              </li>
            )}
          </ol>
        </nav>
      )}
    </>
  );
}
