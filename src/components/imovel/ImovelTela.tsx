import Link from "next/link";
import type { Imovel, ImovelCard } from "@/lib/imoveis";
import type { ContextoVolta } from "@/lib/imoveis/filtros";
import { mensagemWhatsAppImovel } from "@/lib/imoveis/whatsapp";
import { empresa, linkWhatsApp } from "@/lib/site";
import { formatarAnual, formatarArea, formatarMensal, formatarReais } from "@/lib/imoveis/formato";
import { routes } from "@/lib/routes";
import { AgendarProvider, BotaoAgendar, FormularioCurto } from "./Agendar";
import { BarraVolta, LinkVolta } from "./BarraVolta";
import { Compartilhar } from "./Compartilhar";
import { GaleriaMosaico } from "./GaleriaMosaico";
import { Semelhantes } from "./Semelhantes";

function BotaoWhatsApp({ imovel, url, id }: { imovel: Imovel; url: string; id: string }) {
  return (
    <a
      id={id}
      className="im-cta im-cta-whats"
      href={linkWhatsApp(mensagemWhatsAppImovel(imovel, url))}
      target="_blank"
      rel="noopener"
    >
      WHATSAPP<span className="sr-only"> (abre em nova aba)</span>
    </a>
  );
}

function Valor({ imovel }: { imovel: Imovel }) {
  return (
    <>
      {formatarReais(imovel.valor)}
      {imovel.finalidade === "locacao" && <small>/mês</small>}
    </>
  );
}

type Props = {
  imovel: Imovel;
  volta: ContextoVolta;
  /** URL canônica do imóvel (sem `?de=`): vai na mensagem do WhatsApp e no Compartilhar. */
  url: string;
  semelhantes: ImovelCard[];
};

/**
 * Tela do imóvel (mockups/imovel.html da Prioridade 2): galeria em mosaico na dobra, ficha à
 * esquerda, card de valor e contato fixo à direita, semelhantes no fim e, no celular, a barra
 * fixa com o preço e o WhatsApp.
 */
export function ImovelTela({ imovel, volta, url, semelhantes }: Props) {
  const locacao = imovel.finalidade === "locacao";
  const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios);
  const dados = [
    { valor: formatarArea(imovel.area).replace(/ m²$/, ""), rotulo: /terreno|lote/i.test(imovel.tipo) ? "m²" : "m² privativos" },
    imovel.quartos ? { valor: String(imovel.quartos), rotulo: plural(imovel.quartos, "quarto", "quartos") } : null,
    imovel.suites ? { valor: String(imovel.suites), rotulo: plural(imovel.suites, "suíte", "suítes") } : null,
    imovel.vagas ? { valor: String(imovel.vagas), rotulo: plural(imovel.vagas, "vaga", "vagas") } : null,
  ].filter((d) => d !== null);
  const detalhes = [
    imovel.banheiros ? { rotulo: "Banheiros", valor: String(imovel.banheiros) } : null,
    imovel.areaTotal && imovel.areaTotal > imovel.area ? { rotulo: "Área total", valor: formatarArea(imovel.areaTotal) } : null,
    imovel.andar !== null ? { rotulo: "Andar", valor: `${imovel.andar}º` } : null,
    imovel.anoConstrucao !== null ? { rotulo: "Ano de construção", valor: String(imovel.anoConstrucao) } : null,
    !locacao && imovel.valorLocacao !== null ? { rotulo: "Locação", valor: formatarMensal(imovel.valorLocacao) } : null,
    imovel.condominio !== null ? { rotulo: "Condomínio", valor: formatarMensal(imovel.condominio) } : null,
    imovel.iptu !== null ? { rotulo: "IPTU", valor: formatarAnual(imovel.iptu) } : null,
  ].filter((d) => d !== null);
  const extras = [
    imovel.condominio !== null ? `Condomínio ${formatarMensal(imovel.condominio)}` : null,
    imovel.iptu !== null ? `IPTU ${formatarAnual(imovel.iptu)}` : null,
  ].filter((e) => e !== null);
  const rotuloValor = `${imovel.lancamento ? "Lançamento · " : ""}Valor de ${locacao ? "locação" : "venda"}`;
  const noEdificio = imovel.andar !== null || !!imovel.empreendimento;

  return (
    <main>
      <BarraVolta volta={volta} codigo={`CÓD. ${imovel.codigo}`} />
      <AgendarProvider imovel={imovel}>
        <GaleriaMosaico fotos={imovel.fotos} padrao={imovel.foto} />
        <section className="im-ficha" aria-labelledby="im-titulo">
          <div className="wrap im-ficha-in">
            <div className="im-ficha-col">
              <div className="im-cab">
                <div className="im-cab-linha">
                  <p className="pg-eyebrow">
                    {imovel.tipo} · {imovel.bairro}, {imovel.cidade}
                  </p>
                  <Compartilhar titulo={imovel.titulo} url={url} />
                </div>
                <h1 id="im-titulo" className="im-titulo">
                  {imovel.titulo}
                </h1>
                {imovel.empreendimento && <p className="im-condo">{imovel.empreendimento}</p>}
              </div>
              <ul className="im-dados" aria-label="Dados principais">
                {dados.map((d) => (
                  <li key={d.rotulo}>
                    <strong>{d.valor}</strong>
                    <span>{d.rotulo}</span>
                  </li>
                ))}
              </ul>
              {imovel.descricao.length > 0 && (
                <section className="im-desc" aria-label="Descrição">
                  {imovel.descricao.map((p, i) => (
                    <p key={i}>{p}</p>
                  ))}
                </section>
              )}
              {imovel.caracteristicas.length > 0 && (
                <section className="im-bloco" aria-labelledby="im-carac-titulo">
                  <h2 id="im-carac-titulo" className="im-sub">
                    Características
                  </h2>
                  <ul className="im-carac">
                    {imovel.caracteristicas.map((c) => (
                      <li key={c.chave}>{c.rotulo}</li>
                    ))}
                  </ul>
                </section>
              )}
              {detalhes.length > 0 && (
                <section className="im-bloco" aria-labelledby="im-det-titulo">
                  <h2 id="im-det-titulo" className="im-sub">
                    {noEdificio ? "Sobre o edifício" : "Detalhes"}
                  </h2>
                  <dl className="im-det">
                    {detalhes.map((d) => (
                      <div key={d.rotulo}>
                        <dt>{d.rotulo}</dt>
                        <dd>{d.valor}</dd>
                      </div>
                    ))}
                  </dl>
                </section>
              )}
            </div>
            <aside className="im-resumo" aria-label="Valor e contato">
              <div className="im-resumo-card">
                <span className="im-resumo-lbl">{rotuloValor}</span>
                <span className="im-resumo-preco">
                  <Valor imovel={imovel} />
                </span>
                {extras.length > 0 && <span className="im-resumo-extra">{extras.join(" · ")}</span>}
                <BotaoWhatsApp imovel={imovel} url={url} id="im-whats" />
                <BotaoAgendar id="im-cta" />
                <FormularioCurto />
                <span className="im-resumo-nota">
                  Cód. {imovel.codigo} · {empresa.creci}
                </span>
              </div>
            </aside>
          </div>
        </section>
        <Semelhantes itens={semelhantes} />
        <div className="im-bar">
          <div className="im-bar-preco">
            <span className="im-resumo-lbl">{locacao ? "Locação" : "Venda"}</span>
            <strong>
              <Valor imovel={imovel} />
            </strong>
          </div>
          <BotaoWhatsApp imovel={imovel} url={url} id="im-whats-bar" />
        </div>
      </AgendarProvider>
    </main>
  );
}

type Ausencia =
  | { tipo: "inexistente" }
  | { tipo: "indisponivel"; codigo: string; volta: ContextoVolta; veioDoGrid: boolean; semelhantes: ImovelCard[] };

/** Estados "Não encontrado" (404) e "Indisponível" (vendido, alugado ou retirado; este mostra os semelhantes). */
export function ImovelAusente(props: Ausencia) {
  const direto: ContextoVolta = { href: routes.imoveis, rotulo: "VER TODOS OS IMÓVEIS", resumo: undefined };
  const volta = props.tipo === "indisponivel" ? props.volta : direto;
  const comFiltros = props.tipo === "indisponivel" && props.veioDoGrid;

  return (
    <main>
      <BarraVolta volta={volta} />
      <section className="pg-aviso">
        <div className="wrap">
          {props.tipo === "indisponivel" ? (
            <>
              <p className="pg-eyebrow">Imóvel indisponível</p>
              <h1 className="pg-titulo">Este imóvel não está mais disponível</h1>
              <p className="pg-aviso-texto">
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
              <p className="pg-eyebrow">Erro 404</p>
              <h1 className="pg-titulo">Imóvel não encontrado</h1>
              <p className="pg-aviso-texto">
                O endereço pode estar incorreto ou o anúncio foi removido. Confira o portfólio completo ou fale com um
                consultor.
              </p>
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
      </section>
      {props.tipo === "indisponivel" && <Semelhantes itens={props.semelhantes} />}
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
      <section aria-busy="true" aria-label="Carregando imóvel">
        <p className="sr-only" role="status">
          Carregando imóvel…
        </p>
        <div className="im-mos im-mos-3" aria-hidden="true">
          <span className="im-mos-item shimmer" />
          <span className="im-mos-item shimmer" />
          <span className="im-mos-item shimmer" />
        </div>
        <div className="im-ficha" aria-hidden="true">
          <div className="wrap im-ficha-in">
            <div className="im-ficha-col">
              <Linha style={{ width: "32%" }} />
              <Linha style={{ height: 48, width: "70%" }} />
              <Linha style={{ height: 76, width: "100%" }} />
              <Linha style={{ width: "100%" }} />
              <Linha style={{ width: "96%" }} />
              <Linha style={{ width: "70%" }} />
            </div>
            <div className="im-resumo-card">
              <Linha style={{ width: "40%" }} />
              <Linha style={{ height: 40, width: "80%" }} />
              <Linha style={{ height: 50, width: "100%" }} />
              <Linha style={{ height: 50, width: "100%" }} />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
