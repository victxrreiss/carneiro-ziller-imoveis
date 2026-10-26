"use client";

/** Falha ao carregar uma tela do painel: nada foi alterado; tentar de novo recarrega os dados. */
export default function ErroPainel({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div className="pn-box-state" style={{ marginTop: 8 }}>
      <div className="notice" role="alert">
        <div className="notice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.3" aria-hidden="true">
            <path d="M12 4l9 16H3z" />
            <path d="M12 10v4M12 17v.01" />
          </svg>
        </div>
        <h2>Não foi possível carregar esta tela</h2>
        <p>Houve uma falha de conexão com o servidor. Nada foi alterado. Tente de novo em instantes.</p>
        <div className="notice-actions">
          <button type="button" className="btn" onClick={reset}>
            TENTAR NOVAMENTE
          </button>
        </div>
      </div>
    </div>
  );
}
