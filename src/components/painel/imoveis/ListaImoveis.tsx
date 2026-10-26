"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import { excluirImovelAction } from "@/app/painel/_acoes/imoveis";
import type { SituacaoImovel } from "@/lib/dados/tipos";
import { formatarReais } from "@/lib/imoveis/formato";
import type { LinhaImovel } from "@/lib/painel/imoveis";
import { painel, routes } from "@/lib/routes";
import { IcBusca, IcCheck, IcEditar, IcEstrela, IcExterno, IcFechar, IcLixeira, IcMais, IcOlho, IcReticencias } from "../Icones";
import { Aviso, Confirmacao, Selecao, type Opcao } from "../ui";

export type LinhaLista = LinhaImovel & { data: string; hora: string };
type Usuario = { id: string; nome: string; admin: boolean };

const POR_PAGINA = 20;

const SITUACAO: Record<SituacaoImovel, { rotulo: string; cls: string }> = {
  publicado: { rotulo: "PUBLICADO", cls: "pn-status is-pub" },
  rascunho: { rotulo: "RASCUNHO", cls: "pn-status is-draft" },
  indisponivel: { rotulo: "INDISPONÍVEL", cls: "pn-status is-off" },
};
const FINALIDADE = { venda: "Venda", locacao: "Locação" } as const;

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

const finalidadeTexto = (l: LinhaLista) => (l.finalidade ? FINALIDADE[l.finalidade] : "Sem finalidade") + (l.lancamento ? " · Lançamento" : "");
const preco = (l: LinhaLista) => (l.valor === null ? { v: "—", s: "" } : { v: formatarReais(l.valor), s: l.finalidade === "locacao" ? "/mês" : "" });

function Capa({ l, grande }: { l: LinhaLista; grande?: boolean }) {
  const w = grande ? 96 : 72;
  const h = grande ? 72 : 54;
  if (!l.capa)
    return (
      <span className="pn-thumb-empty" style={grande ? { width: w, height: h } : undefined}>
        SEM
        <br />
        FOTO
      </span>
    );
  return <Image className="pn-thumb" src={l.capa} alt="" width={w} height={h} sizes={`${w}px`} style={grande ? { width: w, height: h } : undefined} />;
}

function Toggle({ ativo, onClick, children }: { ativo: boolean; onClick: () => void; children: string }) {
  return (
    <button type="button" className="pn-toggle" aria-pressed={ativo} onClick={onClick}>
      <span className="pn-box" aria-hidden="true">
        {ativo && <IcCheck size={12} width={3} stroke="#FFFFFF" />}
      </span>
      {children}
    </button>
  );
}

export function ListaImoveis({ linhas, usuario, avisoOportunidade }: { linhas: LinhaLista[]; usuario: Usuario; avisoOportunidade: string | null }) {
  const router = useRouter();
  const [removidos, setRemovidos] = useState<Set<string>>(() => new Set());
  const [q, setQ] = useState("");
  const [sit, setSit] = useState("");
  const [fin, setFin] = useState("");
  const [resp, setResp] = useState("");
  const [lanc, setLanc] = useState(false);
  const [pagina, setPagina] = useState(1);
  const [excluir, setExcluir] = useState<LinhaLista | null>(null);
  const [excluindo, iniciar] = useTransition();
  const [erroExcluir, setErroExcluir] = useState(false);
  const [aviso, setAviso] = useState<{ titulo: string; texto: string } | null>(null);

  const todas = useMemo(() => linhas.filter((l) => !removidos.has(l.id)), [linhas, removidos]);

  const responsaveis: Opcao[] = useMemo(() => {
    const m = new Map<string, string>([[usuario.id, usuario.nome]]);
    for (const l of todas) m.set(l.responsavelId, l.responsavelNome);
    return [
      { valor: "", rotulo: "Todos os responsáveis" },
      ...[...m]
        .sort((a, b) => a[1].localeCompare(b[1]))
        .map(([id, nome]) => ({ valor: id, rotulo: id === usuario.id ? `${nome} (você)` : nome })),
    ];
  }, [todas, usuario]);

  const filtradas = useMemo(() => {
    const termo = normalizar(q);
    return todas.filter(
      (l) =>
        (!termo || normalizar(`${l.codigo} ${l.titulo}`).includes(termo)) &&
        (!sit || l.situacao === sit) &&
        (!fin || l.finalidade === fin) &&
        (!resp || l.responsavelId === resp) &&
        (!lanc || l.lancamento),
    );
  }, [todas, q, sit, fin, resp, lanc]);

  const paginas = Math.max(1, Math.ceil(filtradas.length / POR_PAGINA));
  const atual = Math.min(pagina, paginas);
  const inicio = (atual - 1) * POR_PAGINA;
  const visiveis = filtradas.slice(inicio, inicio + POR_PAGINA);
  const temFiltro = Boolean(q || sit || fin || resp || lanc);

  const contagem = { publicado: 0, rascunho: 0, indisponivel: 0 };
  for (const l of todas) contagem[l.situacao]++;
  const n = (q: number, um: string, varios: string) => `${q} ${q === 1 ? um : varios}`;
  const resumo = todas.length
    ? [
        n(todas.length, "imóvel", "imóveis"),
        n(contagem.publicado, "publicado", "publicados"),
        n(contagem.rascunho, "rascunho", "rascunhos"),
        n(contagem.indisponivel, "indisponível", "indisponíveis"),
      ].join(" · ")
    : "Nenhum imóvel cadastrado.";

  const mudar = <T,>(set: (v: T) => void) => (v: T) => {
    set(v);
    setPagina(1);
  };
  const limpar = () => {
    setQ("");
    setSit("");
    setFin("");
    setResp("");
    setLanc(false);
    setPagina(1);
  };

  function confirmarExclusao() {
    const alvo = excluir;
    if (!alvo) return;
    setErroExcluir(false);
    iniciar(async () => {
      let r: Awaited<ReturnType<typeof excluirImovelAction>>;
      try {
        r = await excluirImovelAction(alvo.id);
      } catch {
        setErroExcluir(true);
        return;
      }
      if (!r.ok) {
        setErroExcluir(true);
        return;
      }
      setRemovidos((s) => new Set(s).add(alvo.id));
      setExcluir(null);
      setAviso({ titulo: "Imóvel excluído.", texto: `${r.codigo} · ${r.titulo || "Imóvel sem título"} saiu do painel e do site.` });
      router.refresh();
    });
  }

  const textoBusca = q ? ` a “${q}”` : "";
  const textoSemResultado = `Nenhum imóvel corresponde${textoBusca}${sit || fin || resp || lanc ? (q ? " com os filtros atuais" : " aos filtros atuais") : ""}. Confira o código ou limpe a busca.`;

  const acoes = (l: LinhaLista, cards: boolean) => {
    const publicado = l.situacao === "publicado";
    const temMenu = publicado || usuario.admin;
    return (
      <div className="pn-actions">
        {l.podeEditar ? (
          <Link className="pn-ibtn" href={painel.imovel(l.id)} aria-label={`Editar ${l.codigo}`} title="Editar">
            <IcEditar />
          </Link>
        ) : (
          <Link className="pn-ibtn" href={painel.imovel(l.id)} aria-label={`Ver ${l.codigo} (somente leitura)`} title="Ver (somente leitura)">
            <IcOlho />
          </Link>
        )}
        {cards ? (
          <>
            {publicado && (
              <a className="pn-ibtn" href={routes.imovel(l.id)} target="_blank" rel="noopener" aria-label={`Ver ${l.codigo} no site (abre em nova aba)`}>
                <IcExterno />
              </a>
            )}
            {usuario.admin && (
              <button type="button" className="pn-ibtn is-danger" aria-label={`Excluir ${l.codigo}`} onClick={() => setExcluir(l)}>
                <IcLixeira stroke="#78323D" />
              </button>
            )}
          </>
        ) : temMenu ? (
          <Menu as="div" className="pn-menu-wrap">
            <MenuButton className="pn-ibtn" aria-label={`Mais ações para ${l.codigo}`}>
              <IcReticencias />
            </MenuButton>
            <MenuItems as="ul" className="pn-menu-flutuante" anchor="bottom end" modal={false}>
              {publicado && (
                <MenuItem as="li">
                  <a href={routes.imovel(l.id)} target="_blank" rel="noopener">
                    <IcExterno size={16} />
                    Ver no site<span className="sr-only"> (abre em nova aba)</span>
                  </a>
                </MenuItem>
              )}
              {usuario.admin && (
                <MenuItem as="li">
                  <button type="button" className="is-danger" onClick={() => setExcluir(l)}>
                    <IcLixeira size={16} />
                    Excluir imóvel
                  </button>
                </MenuItem>
              )}
            </MenuItems>
          </Menu>
        ) : (
          <span className="pn-ibtn" aria-hidden="true" style={{ cursor: "default" }} />
        )}
      </div>
    );
  };

  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Imóveis</h1>
          <p className="pn-sub">{resumo}</p>
        </div>
        <div className="pn-head-actions">
          <Link className="btn" href={painel.novoImovel}>
            <IcMais stroke="#FFFFFF" />
            CADASTRAR IMÓVEL
          </Link>
        </div>
      </div>

      {avisoOportunidade && (
        <div className="pn-alert is-error" role="status" style={{ marginBottom: 20 }}>
          <IcEstrela size={20} />
          <div>
            <strong>A Oportunidade de hoje está vazia</strong>
            <p>
              {avisoOportunidade} A seção não aparece na Home até você escolher outro imóvel publicado: abra o imóvel e marque “Usar na Oportunidade de
              hoje”.
            </p>
            <div className="pn-alert-actions">
              <button
                type="button"
                className="btn"
                style={{ minHeight: 44 }}
                onClick={() => {
                  limpar();
                  setSit("publicado");
                }}
              >
                VER IMÓVEIS PUBLICADOS
              </button>
            </div>
          </div>
        </div>
      )}

      {todas.length === 0 ? (
        <div className="pn-box-state">
          <div className="notice">
            <div className="notice-icon">
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.3" aria-hidden="true">
                <path d="M3.5 10.5L12 4l8.5 6.5V20h-5.5v-6h-6v6H3.5z" />
              </svg>
            </div>
            <h2>Nenhum imóvel cadastrado</h2>
            <p>Cadastre o primeiro imóvel. Ele pode ficar como rascunho até estar completo e só aparece no site depois de publicado.</p>
            <div className="notice-actions">
              <Link className="btn" href={painel.novoImovel}>
                CADASTRAR IMÓVEL
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="pn-toolbar" role="search" aria-label="Buscar e filtrar imóveis">
            <div className="pn-search">
              <IcBusca stroke="#6D6E71" />
              <label htmlFor="pn-q" className="sr-only">
                Buscar por código ou título
              </label>
              <input id="pn-q" type="search" placeholder="Buscar por código ou título" autoComplete="off" value={q} onChange={(e) => mudar(setQ)(e.target.value)} />
              {q && (
                <button type="button" className="pn-clear-q" aria-label="Limpar busca" onClick={() => mudar(setQ)("")}>
                  <IcFechar size={14} width={2} />
                </button>
              )}
            </div>
            <Selecao
              rotulo="Situação"
              rotuloOculto
              vazio="Todas as situações"
              valor={sit}
              onChange={mudar(setSit)}
              opcoes={[
                { valor: "", rotulo: "Todas as situações" },
                { valor: "publicado", rotulo: "Publicado" },
                { valor: "rascunho", rotulo: "Rascunho" },
                { valor: "indisponivel", rotulo: "Indisponível" },
              ]}
            />
            <Selecao
              rotulo="Finalidade"
              rotuloOculto
              vazio="Todas as finalidades"
              valor={fin}
              onChange={mudar(setFin)}
              opcoes={[
                { valor: "", rotulo: "Todas as finalidades" },
                { valor: "venda", rotulo: "Venda" },
                { valor: "locacao", rotulo: "Locação" },
              ]}
            />
            <Selecao rotulo="Responsável" rotuloOculto vazio="Todos os responsáveis" valor={resp} onChange={mudar(setResp)} opcoes={responsaveis} />
            <Toggle ativo={lanc} onClick={() => mudar(setLanc)(!lanc)}>
              LANÇAMENTOS
            </Toggle>
            <Toggle ativo={resp === usuario.id} onClick={() => mudar(setResp)(resp === usuario.id ? "" : usuario.id)}>
              MEUS IMÓVEIS
            </Toggle>
            {temFiltro && (
              <button type="button" className="btn-plain pn-f-clear" onClick={limpar}>
                <IcFechar size={14} width={1.8} stroke="currentColor" />
                LIMPAR
              </button>
            )}
          </div>

          {filtradas.length === 0 ? (
            <div className="pn-box-state">
              <div className="notice">
                <div className="notice-icon">
                  <IcBusca size={28} width={1.3} stroke="#0F1D24" />
                </div>
                <h2>Nenhum imóvel encontrado</h2>
                <p>{textoSemResultado}</p>
                <div className="notice-actions">
                  <button type="button" className="btn" onClick={limpar}>
                    LIMPAR BUSCA E FILTROS
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="pn-table-box is-list">
                <table className="pn-table">
                  <caption className="sr-only">Imóveis cadastrados, ordenados pela última alteração</caption>
                  <thead>
                    <tr>
                      <th scope="col">
                        <span className="sr-only">Foto de capa</span>
                      </th>
                      <th scope="col">CÓDIGO · TÍTULO</th>
                      <th scope="col">FINALIDADE · TIPO</th>
                      <th scope="col">BAIRRO · CIDADE</th>
                      <th scope="col" className="is-num">
                        VALOR
                      </th>
                      <th scope="col">SITUAÇÃO</th>
                      <th scope="col">RESPONSÁVEL</th>
                      <th scope="col">ALTERADO EM</th>
                      <th scope="col">
                        <span className="sr-only">Ações</span>
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {visiveis.map((l) => {
                      const p = preco(l);
                      return (
                        <tr key={l.id}>
                          <td className="pn-td-img">
                            <Capa l={l} />
                          </td>
                          <td>
                            <div className="pn-two">
                              <span className="pn-code">{l.codigo}</span>
                              <Link className="pn-ttl" href={painel.imovel(l.id)}>
                                {l.titulo || "Imóvel sem título"}
                              </Link>
                              {l.oportunidade && (
                                <span className="pn-star">
                                  <IcEstrela />
                                  OPORTUNIDADE DE HOJE
                                </span>
                              )}
                            </div>
                          </td>
                          <td>
                            <div className="pn-two">
                              <span>{finalidadeTexto(l)}</span>
                              <span className="pn-muted">{l.tipo ?? "Sem tipo"}</span>
                            </div>
                          </td>
                          <td>
                            <div className="pn-two">
                              <span>{l.bairro || "—"}</span>
                              <span className="pn-muted">{l.cidade || "—"}</span>
                            </div>
                          </td>
                          <td className="is-num">
                            <span className="pn-money">
                              {p.v}
                              <small>{p.s}</small>
                            </span>
                          </td>
                          <td>
                            <span className={SITUACAO[l.situacao].cls}>{SITUACAO[l.situacao].rotulo}</span>
                          </td>
                          <td>
                            {l.responsavelNome}
                            {l.responsavelId === usuario.id && <span className="sr-only"> (você)</span>}
                          </td>
                          <td>
                            <div className="pn-two">
                              <span className="pn-date">{l.data}</span>
                              <span className="pn-muted">{l.hora}</span>
                            </div>
                          </td>
                          <td>{acoes(l, false)}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <ul className="pn-cards" aria-label="Imóveis cadastrados">
                {visiveis.map((l) => {
                  const p = preco(l);
                  return (
                    <li key={l.id} className="pn-card">
                      <div className="pn-card-main">
                        <Capa l={l} grande />
                        <div className="pn-card-body">
                          <span className="pn-code">
                            {l.codigo} · {finalidadeTexto(l).toUpperCase()}
                          </span>
                          <Link className="pn-ttl" href={painel.imovel(l.id)}>
                            {l.titulo || "Imóvel sem título"}
                          </Link>
                          <span className="pn-muted">
                            {l.tipo ?? "Sem tipo"} · {l.bairro || "—"}, {l.cidade || "—"}
                          </span>
                          <span className="pn-money">
                            {p.v}
                            <small>{p.s}</small>
                          </span>
                        </div>
                      </div>
                      <div className="pn-card-meta">
                        <span className={SITUACAO[l.situacao].cls}>{SITUACAO[l.situacao].rotulo}</span>
                        {l.oportunidade && (
                          <span className="pn-star">
                            <IcEstrela />
                            OPORTUNIDADE DE HOJE
                          </span>
                        )}
                      </div>
                      <div className="pn-card-foot">
                        <span className="pn-muted">
                          {l.responsavelNome} · {l.data}
                        </span>
                        {acoes(l, true)}
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="pn-table-foot">
                <span>
                  Mostrando{" "}
                  <strong>
                    {inicio + 1}–{inicio + visiveis.length}
                  </strong>{" "}
                  de <strong>{filtradas.length}</strong>
                </span>
                {paginas > 1 && (
                  <nav className="pager" aria-label="Paginação">
                    <ol>
                      <li>
                        <button
                          type="button"
                          className="pg pg-text"
                          aria-disabled={atual === 1}
                          aria-label="Página anterior"
                          onClick={() => atual > 1 && setPagina(atual - 1)}
                        >
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path d="M19 12H5M11 6l-6 6 6 6" />
                          </svg>
                          <span className="pg-label">ANTERIOR</span>
                        </button>
                      </li>
                      {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                        <li key={n}>
                          <button
                            type="button"
                            className="pg"
                            aria-current={n === atual ? "page" : undefined}
                            aria-label={`Página ${n}`}
                            onClick={() => setPagina(n)}
                          >
                            {n}
                          </button>
                        </li>
                      ))}
                      <li>
                        <button
                          type="button"
                          className="pg pg-text"
                          aria-disabled={atual === paginas}
                          aria-label="Próxima página"
                          onClick={() => atual < paginas && setPagina(atual + 1)}
                        >
                          <span className="pg-label">PRÓXIMA</span>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
                            <path d="M5 12h14M13 6l6 6-6 6" />
                          </svg>
                        </button>
                      </li>
                    </ol>
                  </nav>
                )}
              </div>
            </>
          )}
          <p className="sr-only" aria-live="polite">
            {filtradas.length === 1 ? "1 imóvel" : `${filtradas.length} imóveis`}
          </p>
        </>
      )}

      {excluir && (
        <Confirmacao
          titulo="Excluir este imóvel?"
          rotuloConfirmar="EXCLUIR IMÓVEL"
          onConfirmar={confirmarExclusao}
          onCancelar={() => !excluindo && setExcluir(null)}
          ocupado={excluindo}
        >
          <div className="pn-modal-ref">
            <Capa l={excluir} />
            <div className="pn-two">
              <span className="pn-code">{excluir.codigo}</span>
              <span className="pn-ttl">{excluir.titulo || "Imóvel sem título"}</span>
            </div>
          </div>
          <p>O imóvel sai do painel e do site, e a página dele deixa de existir. Essa ação não pode ser desfeita.</p>
          {excluir.oportunidade && (
            <div className="pn-warn">
              <IcEstrela size={16} />
              <span>
                Este imóvel está na <strong>Oportunidade de hoje</strong>. Ao excluir, a seção some da Home até você escolher outro imóvel publicado.
              </span>
            </div>
          )}
          {erroExcluir && (
            <div className="pn-alert is-error" role="alert">
              <div>
                <strong>Não foi possível excluir</strong>
                <p>A conexão com o servidor falhou. O imóvel continua no painel e no site.</p>
              </div>
            </div>
          )}
        </Confirmacao>
      )}

      {aviso && <Aviso titulo={aviso.titulo} texto={aviso.texto} onFechar={() => setAviso(null)} />}
    </>
  );
}
