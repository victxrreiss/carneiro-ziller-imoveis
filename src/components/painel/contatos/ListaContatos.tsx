// Contatos recebidos pelo site. Sem estado de cliente: a paginação é por link
// (?pagina=N), então a página inteira vem do servidor.
import Link from "next/link";
import type { LinhaContato } from "@/lib/painel/contatos";
import { painel } from "@/lib/routes";

export type LinhaTela = LinhaContato & { data: string; hora: string };

type Props = { linhas: LinhaTela[]; total: number; pagina: number; paginas: number; porPagina: number };

const hrefPagina = (n: number) => `${painel.contatos}?pagina=${n}`;
const digitos = (tel: string) => tel.replace(/\D/g, "");

function Imovel({ l }: { l: LinhaTela }) {
  if (l.imovel)
    return (
      <Link className="pn-ttl" href={painel.imovel(l.imovel.id)}>
        {l.imovel.codigo}
      </Link>
    );
  return <span>{l.codigo ? `${l.codigo} (excluído)` : "Contato geral"}</span>;
}

function Contato({ l }: { l: LinhaTela }) {
  return (
    <div className="pn-two">
      <span>
        <a href={`tel:${l.telefone}`}>{l.telefone}</a>
        {" · "}
        <a href={`https://wa.me/${digitos(l.telefone)}`} target="_blank" rel="noopener">
          WhatsApp<span className="sr-only"> (abre em nova aba)</span>
        </a>
      </span>
      <a className="pn-muted" href={`mailto:${l.email}`}>
        {l.email}
      </a>
    </div>
  );
}

// Página de origem: sempre texto, nunca link (o valor vem do visitante).
const origem = (l: LinhaTela) => l.pagina || "—";

export function ListaContatos({ linhas, total, pagina, paginas, porPagina }: Props) {
  const inicio = (pagina - 1) * porPagina;
  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Contatos</h1>
          <p className="pn-sub">{total === 0 ? "Nenhum contato recebido ainda." : `${total} ${total === 1 ? "contato recebido" : "contatos recebidos"} pelo site`}</p>
        </div>
      </div>

      {linhas.length > 0 && (
        <>
          <div className="pn-table-box is-list">
            <table className="pn-table">
              <caption className="sr-only">Contatos recebidos pelo site, do mais recente para o mais antigo</caption>
              <thead>
                <tr>
                  <th scope="col">RECEBIDO EM</th>
                  <th scope="col">NOME</th>
                  <th scope="col">TELEFONE · E-MAIL</th>
                  <th scope="col">OBSERVAÇÕES</th>
                  <th scope="col">IMÓVEL</th>
                  <th scope="col">PÁGINA DE ORIGEM</th>
                </tr>
              </thead>
              <tbody>
                {linhas.map((l) => (
                  <tr key={l.id}>
                    <td>
                      <div className="pn-two">
                        <span className="pn-date">{l.data}</span>
                        <span className="pn-muted">{l.hora}</span>
                      </div>
                    </td>
                    <td>{l.nome}</td>
                    <td>
                      <Contato l={l} />
                    </td>
                    <td style={{ whiteSpace: "pre-line", maxWidth: 320 }}>{l.observacoes || "—"}</td>
                    <td>
                      <Imovel l={l} />
                    </td>
                    <td className="pn-muted" style={{ wordBreak: "break-all" }}>
                      {origem(l)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <ul className="pn-cards" aria-label="Contatos recebidos pelo site">
            {linhas.map((l) => (
              <li key={l.id} className="pn-card">
                <div className="pn-card-main">
                  <div className="pn-card-body">
                    <span className="pn-code">
                      {l.data} · {l.hora}
                    </span>
                    <span className="pn-ttl">{l.nome}</span>
                    <Contato l={l} />
                    {l.observacoes && <span style={{ whiteSpace: "pre-line" }}>{l.observacoes}</span>}
                  </div>
                </div>
                <div className="pn-card-foot">
                  <Imovel l={l} />
                  <span className="pn-muted">{origem(l)}</span>
                </div>
              </li>
            ))}
          </ul>

          <div className="pn-table-foot">
            <span>
              Mostrando{" "}
              <strong>
                {inicio + 1}–{inicio + linhas.length}
              </strong>{" "}
              de <strong>{total}</strong>
            </span>
            {paginas > 1 && (
              <nav className="pager" aria-label="Paginação">
                <ol>
                  <li>
                    {pagina > 1 ? (
                      <Link className="pg pg-text" href={hrefPagina(pagina - 1)} aria-label="Página anterior">
                        <span className="pg-label">ANTERIOR</span>
                      </Link>
                    ) : (
                      <span className="pg pg-text" aria-disabled="true">
                        <span className="pg-label">ANTERIOR</span>
                      </span>
                    )}
                  </li>
                  {Array.from({ length: paginas }, (_, i) => i + 1).map((n) => (
                    <li key={n}>
                      <Link className="pg" href={hrefPagina(n)} aria-current={n === pagina ? "page" : undefined} aria-label={`Página ${n}`}>
                        {n}
                      </Link>
                    </li>
                  ))}
                  <li>
                    {pagina < paginas ? (
                      <Link className="pg pg-text" href={hrefPagina(pagina + 1)} aria-label="Próxima página">
                        <span className="pg-label">PRÓXIMA</span>
                      </Link>
                    ) : (
                      <span className="pg pg-text" aria-disabled="true">
                        <span className="pg-label">PRÓXIMA</span>
                      </span>
                    )}
                  </li>
                </ol>
              </nav>
            )}
          </div>
        </>
      )}
    </>
  );
}
