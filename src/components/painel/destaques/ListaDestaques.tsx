"use client";

// Página inicial (ADMIN): a lista ordenada de destaques. Os MAX_DESTAQUES_HOME
// primeiros aparecem no site; os demais esperam a vez.
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { marcarDestaqueAction, moverDestaqueAction } from "@/app/painel/_acoes/destaques";
import type { LinhaDestaque } from "@/lib/painel/destaques";
import { painel } from "@/lib/routes";
import { IcEstrela } from "../Icones";

/** `max`: quantos a Home mostra (`MAX_DESTAQUES_HOME`, passado pela página). */
export function ListaDestaques({ itens, aviso, max }: { itens: LinhaDestaque[]; aviso: string | null; max: number }) {
  const router = useRouter();
  const [pendente, iniciar] = useTransition();
  const [falha, setFalha] = useState(false);

  function agir(acao: () => Promise<{ ok: boolean }>) {
    setFalha(false);
    iniciar(async () => {
      try {
        const r = await acao();
        if (!r.ok) setFalha(true);
      } catch {
        setFalha(true);
      }
      router.refresh();
    });
  }

  const naHome = itens.filter((i) => i.naHome);
  const fora = itens.filter((i) => !i.naHome);

  function linha(l: LinhaDestaque) {
    const i = itens.indexOf(l);
    return (
      <li key={l.id} className="pn-dest-item">
        {l.capa ? <Image className="pn-thumb" src={l.capa} alt="" width={72} height={54} sizes="72px" /> : <span className="pn-thumb-empty">SEM<br />FOTO</span>}
        <div className="pn-two">
          <span className="pn-code">{l.codigo}</span>
          <Link className="pn-ttl" href={painel.imovel(l.id)}>
            {l.titulo || "Imóvel sem título"}
          </Link>
        </div>
        <div className="pn-dest-acoes">
          <button type="button" className="btn-plain" disabled={pendente || i === 0} onClick={() => agir(() => moverDestaqueAction(l.id, "subir"))}>
            Subir{" "}
            <span className="sr-only">{l.codigo}</span>
          </button>
          <button type="button" className="btn-plain" disabled={pendente || i === itens.length - 1} onClick={() => agir(() => moverDestaqueAction(l.id, "descer"))}>
            Descer{" "}
            <span className="sr-only">{l.codigo}</span>
          </button>
          <button type="button" className="btn-plain" disabled={pendente} onClick={() => agir(() => marcarDestaqueAction(l.id, false))}>
            Remover{" "}
            <span className="sr-only">{l.codigo}</span>
          </button>
        </div>
      </li>
    );
  }

  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Página inicial</h1>
          <p className="pn-sub">Os imóveis em destaque, na ordem em que aparecem no site. A Home mostra os {max} primeiros.</p>
        </div>
      </div>

      {aviso && (
        <div className="pn-alert is-error" role="status" style={{ marginBottom: 20 }}>
          <IcEstrela size={20} />
          <div>
            <strong>Um imóvel saiu dos destaques</strong>
            <p>{aviso}</p>
          </div>
        </div>
      )}

      {falha && (
        <div className="pn-alert is-error" role="alert" style={{ marginBottom: 20 }}>
          <div>
            <strong>Não foi possível alterar os destaques</strong>
            <p>Tente de novo. A lista abaixo é a que está no site.</p>
          </div>
        </div>
      )}

      {itens.length === 0 ? (
        <div className="pn-box-state">
          <div className="notice">
            <div className="notice-icon">
              <IcEstrela size={28} />
            </div>
            <h2>Nenhum destaque escolhido</h2>
            <p>
              Para escolher, abra um imóvel publicado e marque “Destaque na página inicial”. Ele entra no fim desta lista e você ajusta a ordem aqui.
            </p>
            <div className="notice-actions">
              <Link className="btn" href={painel.imoveis}>
                IR PARA IMÓVEIS
              </Link>
            </div>
          </div>
        </div>
      ) : (
        <>
          <section aria-labelledby="pn-dest-home">
            <h2 id="pn-dest-home" className="pn-dest-h">
              Aparecem na página inicial ({naHome.length})
            </h2>
            <ol className="pn-dest-lista">
              {naHome.map(linha)}
            </ol>
          </section>
          {fora.length > 0 && (
            <section aria-labelledby="pn-dest-fora">
              <h2 id="pn-dest-fora" className="pn-dest-h">
                Ficam de fora ({fora.length})
              </h2>
              <p className="pn-hint">A página inicial mostra só {max}. Estes entram se algum dos de cima sair.</p>
              <ol className="pn-dest-lista">
                {fora.map(linha)}
              </ol>
            </section>
          )}
        </>
      )}
    </>
  );
}
