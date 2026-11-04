"use client";

import Link from "next/link";
import { IcAlerta, IcBusca, IcSeta, IcVoltar } from "@/components/ui/IconesSite";
import type { PaginaImoveis } from "@/lib/imoveis";
import { filtrosParaQuery, ORDENS, urlGrid, type Filtros } from "@/lib/imoveis/filtros";
import { routes } from "@/lib/routes";
import { CardImovel } from "./CardImovel";
import { Dropdown } from "./Dropdown";

export type EstadoResultados = { tipo: "carregando" } | { tipo: "erro" } | { tipo: "ok"; resultado: PaginaImoveis };

type Props = {
  estado: EstadoResultados;
  filtros: Filtros;
  /** Tipos com imóveis na finalidade escolhida, para os atalhos por categoria. */
  tipos: { tipo: string; total: number }[];
  onPagina: (pagina: number) => void;
  /** Aplica novos filtros (mudar a ordem volta para a página 1). */
  onAplicar: (filtros: Filtros) => void;
  onLimpar: () => void;
  onTentarDeNovo: () => void;
};

export function Resultados({ estado, filtros, tipos, onPagina, onAplicar, onLimpar, onTentarDeNovo }: Props) {
  return (
    <section className="results" aria-label="Resultados" id="resultados">
      <div className="wrap">
        {estado.tipo === "ok" && <AtalhosTipo filtros={filtros} tipos={tipos} />}
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
        {estado.tipo === "ok" && estado.resultado.total === 0 && (
          <>
            <div className="r-bar">
              <h2 className="r-count" aria-live="polite">
                <strong>0</strong> imóveis encontrados
              </h2>
            </div>
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
          </>
        )}
        {estado.tipo === "ok" && estado.resultado.total > 0 && (
          <Lista resultado={estado.resultado} filtros={filtros} onPagina={onPagina} onAplicar={onAplicar} />
        )}
      </div>
    </section>
  );
}

function Carregando() {
  return (
    <>
      <div className="r-bar">
        <h2 className="r-count" aria-live="polite">
          Carregando imóveis…
        </h2>
      </div>
      <ul className="grid" aria-busy="true">
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <li key={n} aria-hidden="true">
            <div className="sk">
              <div className="sk-media shimmer" />
              <div className="sk-body">
                <div className="sk-line shimmer" style={{ width: "55%" }} />
                <div className="sk-line shimmer" style={{ height: 22, width: "80%" }} />
                <div className="sk-line shimmer" style={{ width: "40%" }} />
                <div style={{ height: 1, background: "#E7E4DC", margin: "8px 0 4px" }} />
                <div className="sk-line shimmer" style={{ height: 18, width: "45%" }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </>
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

/** Atalhos por categoria: links para o grid com o tipo escolhido (ou sem tipo, em "Todos"). */
function AtalhosTipo({ filtros, tipos }: { filtros: Filtros; tipos: { tipo: string; total: number }[] }) {
  if (tipos.length === 0) return null;
  const link = (tipo: string | undefined, texto: string) => (
    <li key={tipo ?? "todos"}>
      <Link
        className="cat"
        href={urlGrid({ ...filtros, tipo, pagina: 1 })}
        scroll={false}
        aria-current={filtros.tipo === tipo ? "true" : undefined}
      >
        {texto}
      </Link>
    </li>
  );
  return (
    <nav className="cats" aria-label="Categorias">
      <ul>
        {link(undefined, "Todos")}
        {tipos.map((t) => link(t.tipo, `${t.tipo} (${t.total})`))}
      </ul>
    </nav>
  );
}

function Lista({
  resultado,
  filtros,
  onPagina,
  onAplicar,
}: {
  resultado: PaginaImoveis;
  filtros: Filtros;
  onPagina: (p: number) => void;
  onAplicar: (f: Filtros) => void;
}) {
  const { itens, total, pagina, paginas } = resultado;
  const de = filtrosParaQuery({ ...filtros, pagina });
  const grid = urlGrid({ ...filtros, pagina });
  return (
    <>
      <div className="r-bar">
        <h2 className="r-count" aria-live="polite">
          <strong>{total}</strong> {total === 1 ? "imóvel encontrado" : "imóveis encontrados"}
        </h2>
        <Dropdown
          rotulo="ORDENAR POR"
          vazio={ORDENS[0].rotulo}
          opcoes={ORDENS.flatMap((o) => (o.valor ? [{ valor: o.valor, rotulo: o.rotulo }] : []))}
          valor={filtros.ordem}
          onChange={(valor) => onAplicar({ ...filtros, ordem: ORDENS.find((o) => o.valor === valor)?.valor, pagina: 1 })}
        />
        <div className="r-page">{paginas > 1 ? `PÁGINA ${pagina} DE ${paginas}` : ""}</div>
      </div>
      <ul className="grid">
        {itens.map((i, k) => (
          <li key={i.id}>
            <CardImovel imovel={i} de={de} grid={grid} prioridade={k < 3} />
          </li>
        ))}
      </ul>
      {paginas > 1 && (
        <nav className="pager" aria-label="Paginação">
          <ol>
            <li>
              <button
                type="button"
                className="pg pg-text"
                aria-disabled={pagina === 1}
                aria-label="Página anterior"
                onClick={() => pagina > 1 && onPagina(pagina - 1)}
              >
                <IcVoltar stroke="currentColor" />
                <span className="pg-label">ANTERIOR</span>
              </button>
            </li>
            {numerosPaginacao(pagina, paginas).map((n, k) =>
              n === "gap" ? (
                <li key={`gap-${k}`} className="pg-gap" aria-hidden="true">
                  …
                </li>
              ) : (
                <li key={n}>
                  <button
                    type="button"
                    className="pg"
                    aria-current={n === pagina ? "page" : undefined}
                    aria-label={`Página ${n}`}
                    onClick={() => n !== pagina && onPagina(n)}
                  >
                    {n}
                  </button>
                </li>
              ),
            )}
            <li>
              <button
                type="button"
                className="pg pg-text"
                aria-disabled={pagina === paginas}
                aria-label="Próxima página"
                onClick={() => pagina < paginas && onPagina(pagina + 1)}
              >
                <span className="pg-label">PRÓXIMA</span>
                <IcSeta stroke="currentColor" />
              </button>
            </li>
          </ol>
        </nav>
      )}
    </>
  );
}
