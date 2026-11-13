import Link from "next/link";
import { CardImovel } from "@/components/imoveis/CardImovel";
import type { ImovelCard } from "@/lib/imoveis";
import { pluralTipo, urlGrid } from "@/lib/imoveis/filtros";

const MAXIMO = 3;

/** "Imóveis semelhantes" no fim da tela do imóvel (e da tela de indisponível). Sem itens, a seção some. */
export function Semelhantes({ itens }: { itens: ImovelCard[] }) {
  if (itens.length === 0) return null;
  // Os semelhantes são sempre do tipo do imóvel da página (`semelhantes` no catálogo).
  const { tipo } = itens[0];
  const plural = pluralTipo(tipo);
  return (
    <section className="im-sem" aria-labelledby="im-sem-titulo">
      <div className="wrap">
        <div className="im-sem-cab">
          <div>
            <p className="pg-eyebrow">Você também pode gostar</p>
            <h2 id="im-sem-titulo" className="pg-titulo">
              Imóveis semelhantes
            </h2>
          </div>
          <Link className="im-sem-link" href={urlGrid({ tipo, pagina: 1 })}>
            {plural ? `Ver mais ${plural.toLowerCase()}` : "Ver imóveis do mesmo tipo"}
          </Link>
        </div>
        <ul className="cards">
          {itens.slice(0, MAXIMO).map((i) => (
            <li key={i.id}>
              <CardImovel imovel={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
