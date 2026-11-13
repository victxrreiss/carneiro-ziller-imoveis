"use client";

import Link from "next/link";
import { useId, useState, type FormEvent, type MouseEvent, type ReactNode } from "react";
import {
  comFinalidade,
  FAIXAS_AREA,
  faixasPreco,
  FINALIDADES,
  MINIMOS_QUARTOS,
  MINIMOS_SUITES,
  MINIMOS_VAGAS,
  ORDENS,
  temFiltroAvancado,
  TIPOS,
  urlGrid,
  type Faixa,
  type Filtros,
} from "@/lib/imoveis/filtros";
import { CARACTERISTICAS_FILTRO, rotuloCaracteristica } from "@/lib/imoveis/caracteristicas";
import { naRegiao, REGIOES } from "@/lib/imoveis/regioes";
import { routes } from "@/lib/routes";

type Localizacoes = { cidade: string; bairros: string[] }[];

type Props = {
  filtros: Filtros;
  onAplicar: (filtros: Filtros) => void;
  /** Cidades e bairros com imóveis publicados (`getOpcoesLocalizacao`). */
  localizacoes: Localizacoes;
  /** Tipos com imóvel na finalidade escolhida (`getContagemPorTipo`); vazio enquanto carrega. */
  tipos: { tipo: string; total: number }[];
  /** Sem lançamentos publicados, a aba Lançamentos não é oferecida (a URL antiga continua valendo). */
  temLancamentos: boolean;
  /** `?avancados=1` (link "Filtros avançados" da Home): o painel já chega aberto. */
  avancados?: boolean;
};

const LIMPOS: Filtros = { pagina: 1 };
/** Valor das opções do grupo "Regiões" no select de Bairro (os bairros usam "<Bairro>, <Cidade>"). */
const PREFIXO_REGIAO = "regiao:";

function Campo({
  rotulo,
  name,
  valor,
  onChange,
  desabilitado,
  dica,
  children,
}: {
  rotulo: string;
  name: string;
  valor: string;
  onChange: (valor: string) => void;
  desabilitado?: boolean;
  /** Texto pequeno sob o campo (por que está desabilitado). */
  dica?: string;
  children: ReactNode;
}) {
  const id = useId();
  // Rótulo ao lado, e não em volta: o nome acessível do campo é só o rótulo, sem o texto das opções.
  return (
    <div className="campo">
      <label htmlFor={id}>{rotulo}</label>
      <select id={id} name={name} value={valor} disabled={desabilitado} aria-describedby={dica ? `${id}-dica` : undefined} onChange={(e) => onChange(e.target.value)}>
        {children}
      </select>
      {dica && (
        <span className="campo-dica" id={`${id}-dica`}>
          {dica}
        </span>
      )}
    </div>
  );
}

const opcoesFaixa = (lista: readonly Faixa[]) =>
  lista.map(([valor, rotulo]) => (
    <option key={valor} value={valor}>
      {rotulo}
    </option>
  ));
const opcoesMinimo = (lista: readonly string[]) =>
  lista.map((n) => (
    <option key={n} value={n}>
      {n}+
    </option>
  ));

/** Separa o `local` da URL em cidade e bairro ("<Bairro>, <Cidade>"); a cidade de um bairro vem junto. */
function lerLocal(local: string | undefined, localizacoes: Localizacoes): { cidade: string; bairro: string } {
  for (const { cidade, bairros } of localizacoes) {
    if (local === cidade) return { cidade, bairro: "" };
    if (bairros.some((b) => `${b}, ${cidade}` === local)) return { cidade, bairro: local! };
  }
  return { cidade: "", bairro: "" };
}

/**
 * Regiões oferecidas no select de Bairro: só os "pares", isto é, as que juntam pelo menos dois
 * bairros com imóvel publicado (com um só, a região repetiria a opção do próprio bairro). Com
 * cidade escolhida, as que passam por ela. A região que já está na URL aparece sempre.
 */
function regioesDoSelect(localizacoes: Localizacoes, cidade: string, atual: string | undefined) {
  return REGIOES.filter((r) => {
    if (r.slug === atual) return true;
    // Uma entrada por bairro da região com imóvel publicado, guardando a cidade dele.
    const cidadesDosBairros = localizacoes.flatMap((l) => l.bairros.filter((bairro) => naRegiao(r, { bairro, cidade: l.cidade })).map(() => l.cidade));
    return cidadesDosBairros.length > 1 && (!cidade || cidadesDosBairros.includes(cidade));
  });
}

/**
 * Filtros do grid, como na proposta: abas de finalidade, os quatro filtros principais (tipo,
 * cidade, bairro, quartos) sempre à vista e o resto recolhido em "Filtros avançados". Cada
 * escolha já aplica (a URL é a fonte da verdade); o texto vale ao enviar.
 *
 * Antes da hidratação já é HTML que funciona: as abas são links, o painel é um <details> e o
 * form é um GET para /imoveis com os mesmos nomes de parâmetro (cidade e bairro enviam `local`
 * os dois, e `lerFiltros` fica com o último preenchido; a região da URL vai num campo oculto).
 * Escolher outra região ou característica só funciona com JavaScript.
 */
export function FiltrosImoveis({ filtros, onAplicar, localizacoes, tipos, temLancamentos, avancados = false }: Props) {
  const [busca, setBusca] = useState(filtros.q ?? "");
  // A URL é a fonte da verdade: quando ela muda, o campo de texto acompanha.
  const [qAnterior, setQAnterior] = useState(filtros.q);
  if (qAnterior !== filtros.q) {
    setQAnterior(filtros.q);
    setBusca(filtros.q ?? "");
  }

  // O painel abre sozinho quando a URL traz um filtro avançado, mas nunca fecha sozinho.
  const pedeAberto = avancados || temFiltroAvancado(filtros);
  const [aberto, setAberto] = useState(pedeAberto);
  const [pediaAberto, setPediaAberto] = useState(pedeAberto);
  if (pediaAberto !== pedeAberto) {
    setPediaAberto(pedeAberto);
    if (pedeAberto) setAberto(true);
  }

  const mudar = (parte: Partial<Filtros>) => onAplicar({ ...filtros, ...parte, pagina: 1 });
  const { cidade, bairro } = lerLocal(filtros.local, localizacoes);
  const regioes = regioesDoSelect(localizacoes, cidade, filtros.regiao);
  const doBairro = localizacoes.filter((l) => !cidade || l.cidade === cidade);
  const precos = faixasPreco(filtros.finalidade);
  // O tipo escolhido continua na lista mesmo sem imóvel na finalidade atual.
  const tiposComImovel = tipos.length ? TIPOS.filter((t) => t === filtros.tipo || tipos.some((x) => x.tipo === t)) : TIPOS;
  // Se a URL já pede lançamentos, a aba fica para refletir o estado atual.
  const finalidades = FINALIDADES.filter((f) => f.valor !== "lancamentos" || temLancamentos || filtros.finalidade === "lancamentos");

  function trocarBairro(valor: string) {
    if (valor.startsWith(PREFIXO_REGIAO)) mudar({ regiao: valor.slice(PREFIXO_REGIAO.length), local: undefined });
    else mudar({ regiao: undefined, local: valor || cidade || undefined });
  }

  function enviar(e: FormEvent) {
    e.preventDefault();
    mudar({ q: busca.trim() || undefined });
  }

  function irParaAba(e: MouseEvent, proximos: Filtros) {
    // Ctrl/⌘ + clique e botão do meio abrem o link em outra aba, como qualquer link.
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onAplicar(proximos);
  }

  return (
    <section className="filtros" aria-label="Filtros">
      <div className="wrap">
        <form className="busca" role="search" aria-label="Filtrar imóveis" action={routes.imoveis} onSubmit={enviar}>
          <nav className="busca-abas" aria-label="Finalidade">
            {finalidades.map((f) => {
              const proximos = comFinalidade(filtros, f.valor);
              return (
                <Link
                  key={f.valor}
                  href={urlGrid(proximos)}
                  scroll={false}
                  aria-current={filtros.finalidade === f.valor ? "true" : undefined}
                  onClick={(e) => irParaAba(e, proximos)}
                >
                  {f.rotulo}
                </Link>
              );
            })}
          </nav>
          {filtros.finalidade && <input type="hidden" name="finalidade" value={filtros.finalidade} />}
          {/* Antes da hidratação, o select de Bairro enviaria `local=regiao:<slug>`, que `lerFiltros` descarta. */}
          {filtros.regiao && <input type="hidden" name="regiao" value={filtros.regiao} />}

          <div className="busca-bar">
            <Campo rotulo="Tipo de imóvel" name="tipo" valor={filtros.tipo ?? ""} onChange={(v) => mudar({ tipo: v || undefined })}>
              <option value="">Todos os tipos</option>
              {tiposComImovel.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </Campo>
            <Campo rotulo="Cidade" name="local" valor={cidade} onChange={(v) => mudar({ regiao: undefined, local: v || undefined })}>
              <option value="">Todas as cidades</option>
              {localizacoes.map((l) => (
                <option key={l.cidade} value={l.cidade}>
                  {l.cidade}
                </option>
              ))}
            </Campo>
            <Campo rotulo="Bairro" name="local" valor={filtros.regiao ? PREFIXO_REGIAO + filtros.regiao : bairro} onChange={trocarBairro}>
              <option value="">Todos os bairros</option>
              {regioes.length > 0 && (
                <optgroup label="Regiões">
                  {regioes.map((r) => (
                    <option key={r.slug} value={PREFIXO_REGIAO + r.slug}>
                      {r.nome}
                    </option>
                  ))}
                </optgroup>
              )}
              {doBairro.map((l) => (
                <optgroup key={l.cidade} label={l.cidade}>
                  {l.bairros.map((b) => (
                    <option key={b} value={`${b}, ${l.cidade}`}>
                      {b}
                    </option>
                  ))}
                </optgroup>
              ))}
            </Campo>
            <Campo rotulo="Quartos" name="quartos" valor={filtros.quartos ?? ""} onChange={(v) => mudar({ quartos: v || undefined })}>
              <option value="">Qualquer</option>
              {opcoesMinimo(MINIMOS_QUARTOS)}
            </Campo>
            <button type="submit" className="buscar">
              Buscar
            </button>
          </div>

          <details className="avancados" open={aberto} onToggle={(e) => setAberto(e.currentTarget.open)}>
            <summary>
              <span>Filtros avançados</span>
              <small>Preço, área, vagas, suítes, características, código e ordenação</small>
            </summary>
            <div className="avancados-in">
              <Campo
                rotulo="Preço"
                name="preco"
                valor={filtros.preco ?? ""}
                onChange={(v) => mudar({ preco: v || undefined })}
                desabilitado={!filtros.finalidade}
                // Sem finalidade não dá para saber se a faixa é de venda ou de aluguel.
                dica={filtros.finalidade ? undefined : "Escolha Comprar ou Alugar"}
              >
                <option value="">Qualquer valor</option>
                {opcoesFaixa(precos)}
              </Campo>
              <Campo rotulo="Área" name="area" valor={filtros.area ?? ""} onChange={(v) => mudar({ area: v || undefined })}>
                <option value="">Qualquer área</option>
                {opcoesFaixa(FAIXAS_AREA)}
              </Campo>
              <Campo rotulo="Vagas" name="vagas" valor={filtros.vagas ?? ""} onChange={(v) => mudar({ vagas: v || undefined })}>
                <option value="">Qualquer</option>
                {opcoesMinimo(MINIMOS_VAGAS)}
              </Campo>
              <Campo rotulo="Suítes" name="suites" valor={filtros.suites ?? ""} onChange={(v) => mudar({ suites: v || undefined })}>
                <option value="">Qualquer</option>
                {opcoesMinimo(MINIMOS_SUITES)}
              </Campo>
              <div className="campo">
                <label htmlFor="q">Código ou texto</label>
                <input
                  id="q"
                  name="q"
                  type="search"
                  placeholder="CZ1234"
                  autoComplete="off"
                  maxLength={80}
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                />
              </div>
              <Campo
                rotulo="Ordenar por"
                name="ordem"
                valor={filtros.ordem ?? ""}
                onChange={(v) => mudar({ ordem: ORDENS.find((o) => o.valor === v)?.valor })}
              >
                {ORDENS.map((o) => (
                  <option key={o.rotulo} value={o.valor ?? ""}>
                    {o.rotulo}
                  </option>
                ))}
              </Campo>
              <div className="carac" role="group" aria-label="Características">
                {CARACTERISTICAS_FILTRO.map((c) => {
                  const marcada = filtros.carac?.includes(c) ?? false;
                  return (
                    <button
                      key={c}
                      type="button"
                      aria-pressed={marcada}
                      onClick={() => mudar({ carac: marcada ? filtros.carac?.filter((x) => x !== c) : [...(filtros.carac ?? []), c] })}
                    >
                      {rotuloCaracteristica(c)}
                    </button>
                  );
                })}
                {/* Sem JavaScript, o Buscar mantém as características que já estavam na URL. */}
                {filtros.carac?.map((c) => <input key={c} type="hidden" name="carac" value={c} />)}
              </div>
              <div className="avancados-acoes">
                <button type="button" className="limpar" onClick={() => onAplicar(LIMPOS)}>
                  Limpar filtros
                </button>
              </div>
            </div>
          </details>
        </form>
      </div>
    </section>
  );
}
