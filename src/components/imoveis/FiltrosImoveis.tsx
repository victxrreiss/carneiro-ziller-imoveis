"use client";

import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { IcBusca, IcFiltros, IcX } from "@/components/ui/IconesSite";
import { useDialog } from "@/components/ui/useDialog";
import {
  comFinalidade,
  contarFiltrosPainel,
  FAIXAS_AREA,
  faixasPreco,
  FINALIDADES,
  filtrosParaQuery,
  MINIMOS_QUARTOS,
  MINIMOS_VAGAS,
  rotulosFiltros,
  semFiltro,
  TIPOS,
  type ChaveFiltro,
  type Filtros,
} from "@/lib/imoveis/filtros";
import { Dropdown } from "./Dropdown";

type Props = {
  filtros: Filtros;
  onAplicar: (filtros: Filtros) => void;
  /** Quantos imóveis a querystring de filtros traria (botão "VER N IMÓVEIS"). Server Action. */
  contar: (query: string) => Promise<number>;
  totalAtual: number;
};

const LIMPOS: Filtros = { pagina: 1 };
const opcoesFaixa = (lista: readonly (readonly [string, string, number, number])[]) =>
  lista.map(([valor, rotulo]) => ({ valor, rotulo }));
const opcoesMinimo = (lista: readonly string[]) => lista.map((v) => ({ valor: v, rotulo: `${v} ou mais` }));

export function FiltrosImoveis({ filtros, onAplicar, contar, totalAtual }: Props) {
  const [busca, setBusca] = useState(filtros.q ?? "");
  const [painelAberto, setPainelAberto] = useState(false);
  const [rascunho, setRascunho] = useState(filtros);
  const [contagem, setContagem] = useState(totalAtual);
  const painelRef = useRef<HTMLDivElement>(null);
  const botaoFiltrosRef = useRef<HTMLButtonElement>(null);
  const tituloPainelId = useId();

  // A URL é a fonte da verdade: quando ela muda, o campo de busca acompanha.
  const [qAnterior, setQAnterior] = useState(filtros.q);
  if (qAnterior !== filtros.q) {
    setQAnterior(filtros.q);
    setBusca(filtros.q ?? "");
  }

  useDialog({ aberto: painelAberto, onFechar: () => setPainelAberto(false), painelRef, retornoRef: botaoFiltrosRef });

  // Com o painel mobile aberto, as escolhas ficam num rascunho até "VER N IMÓVEIS".
  const ativos = painelAberto ? rascunho : filtros;
  function mudar(proximo: Filtros) {
    if (painelAberto) setRascunho(proximo);
    else onAplicar(proximo);
  }

  useEffect(() => {
    if (!painelAberto) return;
    let vigente = true;
    contar(filtrosParaQuery(rascunho)).then(
      (n) => vigente && setContagem(n),
      () => {},
    );
    return () => {
      vigente = false;
    };
  }, [painelAberto, rascunho, contar]);

  function abrirPainel() {
    setRascunho(filtros);
    setContagem(totalAtual);
    setPainelAberto(true);
  }

  function aplicarPainel() {
    setPainelAberto(false);
    onAplicar({ ...rascunho, pagina: 1 });
  }

  function enviarBusca(e: FormEvent) {
    e.preventDefault();
    onAplicar({ ...filtros, q: busca.trim() || undefined, pagina: 1 });
  }

  const set = (chave: ChaveFiltro) => (valor: string | undefined) => mudar({ ...ativos, [chave]: valor, pagina: 1 });
  const chips = rotulosFiltros(filtros);
  const noPainel = contarFiltrosPainel(filtros);
  const precos = faixasPreco(ativos.finalidade);

  const segmentado = (classe: string) => (
    <div className={classe} role="radiogroup" aria-label="Finalidade">
      {FINALIDADES.map((f) => (
        <button
          key={f.rotulo}
          type="button"
          role="radio"
          aria-checked={ativos.finalidade === f.valor}
          onClick={() => mudar(comFinalidade(ativos, f.valor))}
        >
          {f.rotulo}
        </button>
      ))}
    </div>
  );

  return (
    <>
      <section className="filters" aria-label="Filtros">
        <div className="wrap">
          <form
            className={ativos.finalidade ? "ff" : "ff has-hint"}
            role="search"
            aria-label="Filtrar imóveis"
            onSubmit={enviarBusca}
          >
            <div className="f-top">
              {segmentado("seg")}
              <div className="search">
                <label htmlFor="q" className="sr-only">
                  Buscar por bairro, cidade, condomínio ou código
                </label>
                <input
                  id="q"
                  type="search"
                  placeholder="Bairro, cidade, condomínio ou código"
                  autoComplete="off"
                  maxLength={80}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
                <button type="submit" aria-label="Buscar">
                  <IcBusca size={20} stroke="#FFFFFF" width={1.7} />
                </button>
              </div>
            </div>

            <div className="f-mobile-bar">
              <button
                ref={botaoFiltrosRef}
                type="button"
                className="btn-filters"
                aria-expanded={painelAberto}
                onClick={abrirPainel}
              >
                <IcFiltros size={18} width={1.6} />
                FILTROS
                {noPainel > 0 && (
                  <>
                    <span className="count">{noPainel}</span>
                    <span className="sr-only">filtros ativos</span>
                  </>
                )}
              </button>
            </div>

            <div
              ref={painelRef}
              className={painelAberto ? "f-panel open" : "f-panel"}
              {...(painelAberto ? { role: "dialog", "aria-modal": true, "aria-labelledby": tituloPainelId } : {})}
            >
              <div className="f-panel-head">
                <h2 id={tituloPainelId}>Filtros</h2>
                <button className="icon-btn" type="button" aria-label="Fechar filtros" onClick={() => setPainelAberto(false)}>
                  <IcX size={18} width={1.6} />
                </button>
              </div>
              <div className="f-panel-body">
                <div className="seg-m-wrap">
                  <span className="lbl">FINALIDADE</span>
                  {segmentado("seg seg-m")}
                </div>
                <div className="f-grid">
                  <Dropdown
                    rotulo="TIPO DE IMÓVEL"
                    vazio="Todos os tipos"
                    opcoes={TIPOS.map((t) => ({ valor: t, rotulo: t }))}
                    valor={ativos.tipo}
                    onChange={set("tipo")}
                    largo
                  />
                  <Dropdown
                    rotulo="FAIXA DE PREÇO"
                    vazio="Qualquer valor"
                    opcoes={opcoesFaixa(precos)}
                    valor={ativos.preco}
                    onChange={set("preco")}
                    largo
                    desabilitado={!ativos.finalidade}
                    dica={ativos.finalidade ? undefined : "Escolha a finalidade para filtrar por preço."}
                  />
                  <Dropdown
                    rotulo="ÁREA (M²)"
                    vazio="Qualquer área"
                    opcoes={opcoesFaixa(FAIXAS_AREA)}
                    valor={ativos.area}
                    onChange={set("area")}
                    largo
                  />
                  <Dropdown
                    rotulo="QUARTOS"
                    vazio="Qualquer"
                    opcoes={opcoesMinimo(MINIMOS_QUARTOS)}
                    valor={ativos.quartos}
                    onChange={set("quartos")}
                  />
                  <Dropdown
                    rotulo="VAGAS"
                    vazio="Qualquer"
                    opcoes={opcoesMinimo(MINIMOS_VAGAS)}
                    valor={ativos.vagas}
                    onChange={set("vagas")}
                  />
                  <button type="button" className="clear" disabled={chips.length === 0} onClick={() => onAplicar(LIMPOS)}>
                    <IcX size={14} stroke="currentColor" width={1.8} />
                    LIMPAR FILTROS
                  </button>
                </div>
              </div>
              <div className="f-panel-foot">
                <button type="button" className="btn btn-ghost" onClick={() => setRascunho(LIMPOS)}>
                  LIMPAR
                </button>
                <button type="button" className="btn" onClick={aplicarPainel}>
                  VER {contagem} IMÓVEIS
                </button>
              </div>
            </div>

            {chips.length > 0 && (
              <div className="chips" aria-label="Filtros ativos">
                <span className="chips-lbl">FILTROS ATIVOS</span>
                {chips.map((c) => (
                  <button
                    key={c.chave}
                    type="button"
                    className="chip"
                    aria-label={`Remover filtro ${c.rotulo}`}
                    onClick={() => onAplicar(semFiltro(filtros, c.chave))}
                  >
                    {c.rotulo}
                    <span className="x">
                      <IcX size={12} width={2} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </section>
      {painelAberto && <div className="scrim" onClick={() => setPainelAberto(false)} />}
    </>
  );
}
