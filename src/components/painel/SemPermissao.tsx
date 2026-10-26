import Link from "next/link";
import { painel } from "@/lib/routes";

/** Corretor abrindo uma área do ADMIN pelo endereço. */
export function SemPermissao({ texto }: { texto: string }) {
  return (
    <div className="pn-box-state" style={{ marginTop: 8 }}>
      <div className="notice">
        <div className="notice-icon">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#0F1D24" strokeWidth="1.3" aria-hidden="true">
            <rect x="5" y="10.5" width="14" height="10" />
            <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
          </svg>
        </div>
        <h1 className="pn-title" style={{ fontSize: 32 }}>
          Você não tem acesso a esta página
        </h1>
        <p>{texto}</p>
        <div className="notice-actions">
          <Link className="btn" href={painel.imoveis}>
            IR PARA IMÓVEIS
          </Link>
        </div>
      </div>
    </div>
  );
}
