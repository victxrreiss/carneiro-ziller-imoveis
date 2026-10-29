import Link from "next/link";
import { IcCasa, IcPin } from "@/components/ui/IconesSite";
import type { Imovel } from "@/lib/imoveis";
import type { ContextoVolta } from "@/lib/imoveis/filtros";
import { formatarAnual, formatarArea, formatarMensal, formatarReais, rotuloEtiqueta } from "@/lib/imoveis/formato";
import { routes } from "@/lib/routes";
import { AgendarProvider, BotaoAgendar } from "./Agendar";
import { BarraVolta, LinkVolta } from "./BarraVolta";
import { Galeria } from "./Galeria";

export function secaoDoImovel(lancamento: boolean) {
  return lancamento ? { rotulo: "Lançamentos", href: routes.lancamentos } : { rotulo: "Imóveis", href: routes.imoveis };
}

function Preco({ imovel }: { imovel: Imovel }) {
  return (
    <div className="im-price">
      <span className="im-price-lbl">VALOR</span>
      <span className="im-price-val">
        {formatarReais(imovel.valor)}
        {imovel.finalidade === "locacao" && <small>/mês</small>}
      </span>
    </div>
  );
}

/** Ficha, galeria, descrição e barra fixa (mobile). */
export function ImovelTela({ imovel, volta }: { imovel: Imovel; volta: ContextoVolta }) {
  const specs = [
    { rotulo: "ÁREA", valor: formatarArea(imovel.area) },
    imovel.quartos ? { rotulo: "QUARTOS", valor: String(imovel.quartos) } : null,
    imovel.suites ? { rotulo: "SUÍTES", valor: String(imovel.suites) } : null,
    imovel.banheiros ? { rotulo: "BANHEIROS", valor: String(imovel.banheiros) } : null,
    imovel.vagas ? { rotulo: "VAGAS", valor: String(imovel.vagas) } : null,
    imovel.areaTotal && imovel.areaTotal > imovel.area ? { rotulo: "ÁREA TOTAL", valor: formatarArea(imovel.areaTotal) } : null,
  ].filter((s) => s !== null);
  // "Valores": a linha da finalidade principal já aparece no preço; aqui vão os demais.
  const valores = [
    {
      rotulo: imovel.finalidade === "locacao" ? "LOCAÇÃO" : "VENDA",
      valor: imovel.finalidade === "locacao" ? formatarMensal(imovel.valor) : formatarReais(imovel.valor),
    },
    imovel.finalidade === "venda" && imovel.valorLocacao !== null
      ? { rotulo: "LOCAÇÃO", valor: formatarMensal(imovel.valorLocacao) }
      : null,
    imovel.condominio !== null ? { rotulo: "CONDOMÍNIO", valor: formatarMensal(imovel.condominio) } : null,
    imovel.iptu !== null ? { rotulo: "IPTU", valor: formatarAnual(imovel.iptu) } : null,
  ].filter((v) => v !== null);
  const detalhes = [
    imovel.andar !== null ? { rotulo: "ANDAR", valor: `${imovel.andar}º` } : null,
    imovel.anoConstrucao !== null ? { rotulo: "ANO DE CONSTRUÇÃO", valor: String(imovel.anoConstrucao) } : null,
    imovel.empreendimento ? { rotulo: "EMPREENDIMENTO", valor: imovel.empreendimento } : null,
  ].filter((d) => d !== null);

  return (
    <main>
      <BarraVolta volta={volta} secao={secaoDoImovel(imovel.lancamento)} codigo={`CÓD. ${imovel.codigo}`} />
      <AgendarProvider imovel={imovel}>
        <section className="im-main" aria-labelledby="im-titulo">
          <div className="wrap">
            <div className="im-col">
              <Galeria fotos={imovel.fotos} />
              {imovel.descricao.length > 0 && (
                <section className="im-desc" aria-labelledby="im-desc-titulo">
                  <div className="eyebrow">DESCRIÇÃO</div>
                  <h2 id="im-desc-titulo" className="im-h2">
                    Sobre o imóvel
                  </h2>
                  {imovel.descricao.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </section>
              )}
              {detalhes.length > 0 && (
                <section className="im-det" aria-labelledby="im-det-titulo">
                  <div className="eyebrow">DETALHES</div>
                  <h2 id="im-det-titulo" className="im-h2">
                    Sobre o prédio
                  </h2>
                  <dl className="im-det-list">
                    {detalhes.map((d) => (
                      <div key={d.rotulo}>
                        <dt>{d.rotulo}</dt>
                        <dd>{d.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
              {imovel.caracteristicas.length > 0 && (
                <section className="im-det" aria-labelledby="im-carac-titulo">
                  <div className="eyebrow">CARACTERÍSTICAS</div>
                  <h2 id="im-carac-titulo" className="im-h2">
                    Características
                  </h2>
                  <ul className="im-carac">
                    {imovel.caracteristicas.map((c) => (
                      <li key={c.chave}>{c.rotulo}</li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
            <aside className="im-card" aria-label="Resumo do imóvel">
              <span className="im-badge">{rotuloEtiqueta(imovel)}</span>
              <div className="im-code">
                CÓD. {imovel.codigo} · {imovel.tipo.toUpperCase()}
              </div>
              <h1 id="im-titulo" className="im-title">
                {imovel.titulo}
              </h1>
              <div className="im-loc">
                <IcPin />
                {imovel.bairro}, {imovel.cidade} - {imovel.uf}
              </div>
              <dl className="im-specs">
                {specs.map((s) => (
                  <div key={s.rotulo} className="im-spec">
                    <dt>{s.rotulo}</dt>
                    <dd>{s.valor}</dd>
                  </div>
                ))}
              </dl>
              <Preco imovel={imovel} />
              {valores.length > 1 && (
                <dl className="im-vals" aria-label="Valores">
                  {valores.map((v) => (
                    <div key={v.rotulo} className="im-val">
                      <dt>{v.rotulo}</dt>
                      <dd>{v.valor}</dd>
                    </div>
                  ))}
                </dl>
              )}
              <BotaoAgendar id="im-cta" />
            </aside>
          </div>
        </section>
        <div className="im-bar">
          <Preco imovel={imovel} />
          <BotaoAgendar id="im-cta-bar" />
        </div>
      </AgendarProvider>
    </main>
  );
}

type Ausencia =
  | { tipo: "inexistente" }
  | {
      tipo: "indisponivel";
      codigo: string;
      volta: ContextoVolta;
      veioDoGrid: boolean;
    };

/** Estados "Não encontrado" (404) e "Indisponível" (vendido, alugado ou retirado). */
export function ImovelAusente(props: Ausencia) {
  const direto: ContextoVolta = {
    href: routes.imoveis,
    rotulo: "VER TODOS OS IMÓVEIS",
    resumo: undefined,
  };
  const volta = props.tipo === "indisponivel" ? props.volta : direto;
  const comFiltros = props.tipo === "indisponivel" && props.veioDoGrid;

  return (
    <main>
      <BarraVolta volta={volta} secao={secaoDoImovel(false)} />
      <section className="im-empty">
        <div className="wrap">
          <div className="notice">
            <div className="notice-icon">
              <IcCasa size={28} width={1.3} />
            </div>
            {props.tipo === "indisponivel" ? (
              <>
                <h1>Este imóvel não está mais disponível</h1>
                <p>
                  O imóvel CÓD. {props.codigo} foi vendido, alugado ou retirado do portfólio.
                  {comFiltros && " Seus filtros foram mantidos para você continuar a busca."}
                </p>
                <div className="notice-actions">
                  <LinkVolta href={volta.href} className="btn">
                    {volta.rotulo}
                  </LinkVolta>
                  {comFiltros ? (
                    <Link className="link-arrow" href={routes.imoveis}>
                      Ver todos os imóveis →
                    </Link>
                  ) : (
                    <Link className="link-arrow" href={routes.contato}>
                      Falar com um consultor →
                    </Link>
                  )}
                </div>
              </>
            ) : (
              <>
                <h1>Imóvel não encontrado</h1>
                <p>O endereço pode estar incorreto ou o anúncio foi removido. Confira o portfólio completo ou fale com um consultor.</p>
                <div className="notice-actions">
                  <Link href={routes.imoveis} className="btn">
                    VER TODOS OS IMÓVEIS
                  </Link>
                  <Link className="link-arrow" href={routes.contato}>
                    Falar com um consultor →
                  </Link>
                </div>
              </>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

const Linha = ({ style }: { style: React.CSSProperties }) => <div className="im-sk-line shimmer" style={style} />;

/** Skeleton da navegação client-side (a ficha em si vem pronta do servidor). */
export function ImovelCarregando() {
  return (
    <main>
      <div className="im-back">
        <div className="wrap">
          <div className="im-back-left">
            <span className="im-back-link" aria-hidden="true" style={{ visibility: "hidden" }}>
              VOLTAR
            </span>
          </div>
        </div>
      </div>
      <section className="im-main" aria-busy="true" aria-label="Carregando imóvel">
        <div className="wrap im-sk-grid">
          <p className="sr-only" role="status">
            Carregando imóvel…
          </p>
          <div className="im-col" aria-hidden="true">
            <div className="im-sk-stage shimmer" />
            <div className="im-sk-thumbs">
              {Array.from({ length: 8 }, (_, i) => (
                <span key={i} className="shimmer" />
              ))}
            </div>
            <div
              style={{
                marginTop: 64,
                display: "flex",
                flexDirection: "column",
                gap: 14,
                maxWidth: 680,
              }}
            >
              <Linha style={{ width: "22%" }} />
              <Linha style={{ height: 30, width: "46%" }} />
              <Linha style={{ width: "100%" }} />
              <Linha style={{ width: "96%" }} />
              <Linha style={{ width: "70%" }} />
            </div>
          </div>
          <div className="im-sk-card" aria-hidden="true">
            <Linha style={{ height: 24, width: 92 }} />
            <Linha style={{ width: "58%" }} />
            <Linha style={{ height: 32, width: "92%" }} />
            <Linha style={{ height: 32, width: "60%" }} />
            <Linha style={{ width: "64%" }} />
            <Linha style={{ height: 64, width: "100%" }} />
            <Linha style={{ height: 34, width: "48%" }} />
            <Linha style={{ height: 52, width: "100%" }} />
          </div>
        </div>
      </section>
    </main>
  );
}
