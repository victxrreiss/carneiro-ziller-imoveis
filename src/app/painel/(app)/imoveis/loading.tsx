/** Carregando a lista: skeleton da tabela (desktop) e dos cards (mobile). */
export default function CarregandoImoveis() {
  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Imóveis</h1>
          <p className="pn-sub">Carregando…</p>
        </div>
      </div>
      <div className="pn-table-box is-list" aria-busy="true">
        <table className="pn-table">
          <caption className="sr-only">Carregando imóveis…</caption>
          <tbody>
            {Array.from({ length: 8 }, (_, i) => (
              <tr key={i} className="pn-sk-row" aria-hidden="true">
                <td className="pn-td-img">
                  <span className="pn-thumb shimmer" />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 60, marginBottom: 8 }} />
                  <span className="pn-sk shimmer" style={{ width: 180, height: 16 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 90 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 110 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 90, marginLeft: "auto" }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 84, height: 24 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 96 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 76 }} />
                </td>
                <td>
                  <span className="pn-sk shimmer" style={{ width: 92, height: 32, marginLeft: "auto" }} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ul className="pn-cards" aria-busy="true">
        {Array.from({ length: 4 }, (_, i) => (
          <li key={i} className="pn-card" aria-hidden="true">
            <div className="pn-card-main">
              <span className="pn-thumb shimmer" style={{ width: 96, height: 72 }} />
              <div className="pn-card-body" style={{ flex: 1, gap: 10 }}>
                <span className="pn-sk shimmer" style={{ width: "40%" }} />
                <span className="pn-sk shimmer" style={{ width: "85%", height: 18 }} />
                <span className="pn-sk shimmer" style={{ width: "55%" }} />
              </div>
            </div>
          </li>
        ))}
      </ul>
      <p className="sr-only" aria-live="polite">
        Carregando imóveis…
      </p>
    </>
  );
}
