import Link from "next/link";
import { painel } from "@/lib/routes";

export default function PainelNaoEncontrada() {
  return (
    <div className="pn-box-state" style={{ marginTop: 8 }}>
      <div className="notice">
        <div className="notice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.3" aria-hidden="true">
            <circle cx="11" cy="11" r="6" />
            <path d="M20 20l-4.5-4.5M9 9l4 4M13 9l-4 4" />
          </svg>
        </div>
        <h1 className="pn-title" style={{ fontSize: 32 }}>
          Página não encontrada
        </h1>
        <p>O endereço pode ter sido digitado errado, ou o imóvel foi excluído. Confira o link ou volte para a lista.</p>
        <div className="notice-actions">
          <Link className="btn" href={painel.imoveis}>
            IR PARA IMÓVEIS
          </Link>
        </div>
      </div>
    </div>
  );
}
