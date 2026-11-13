import { getRegioesHome } from "@/lib/imoveis";
import { urlGrid } from "@/lib/imoveis/filtros";
import { CabecalhoSecao, CardCategoria, moldura } from "./partes";

/** Quantas colunas o card ocupa: de 2 no celular e de 6 no desktop. */
type Vao = { celular: 1 | 2; desktop: 2 | 3 | 4 | 6 };

/**
 * Vãos dos cards, na ordem, para a grade fechar sem buraco com qualquer número de regiões (o
 * catálogo só devolve as que têm imóvel). Celular: com número ímpar, o primeiro ocupa a linha.
 * Desktop: 3 por linha; sobrando 2, o primeiro é o card largo (as 5 regiões da proposta);
 * sobrando 1, as duas primeiras linhas têm 2 cards cada.
 */
export function vaosRegioes(n: number): Vao[] {
  const sobra = n % 3;
  return Array.from({ length: n }, (_, i) => {
    let desktop: Vao["desktop"] = 2;
    if (n === 1) desktop = 6;
    else if (n === 2 || (sobra === 1 && i < 4)) desktop = 3;
    else if (sobra === 2 && i === 0) desktop = 4;
    return { celular: n % 2 === 1 && i === 0 ? 2 : 1, desktop };
  });
}

// Literais para o Tailwind enxergar as classes.
const classeDesktop: Record<Vao["desktop"], string> = {
  2: "min-[900px]:col-span-2",
  3: "min-[900px]:col-span-3",
  4: "min-[900px]:col-span-4",
  6: "min-[900px]:col-span-6",
};
const larguraDesktop: Record<Vao["desktop"], number> = { 2: 400, 3: 620, 4: 840, 6: 1280 };

/** "Onde você quer morar?": um card por região com imóvel publicado; cada um abre a busca filtrada pela região. */
export async function CardsRegioes() {
  const regioes = await getRegioesHome();
  if (!regioes.length) return null;
  const vaos = vaosRegioes(regioes.length);

  return (
    <section aria-labelledby="regioes-titulo" className="pb-[clamp(72px,9vw,128px)]">
      <div className={moldura}>
        <CabecalhoSecao
          id="regioes-titulo"
          rotulo="Regiões"
          titulo="Onde você quer morar?"
          lado={
            <p className="m-0 max-w-[52ch] text-[17px] leading-[1.7] font-light text-texto-2">
              Da zona sul de Belo Horizonte aos condomínios de Nova Lima. Cada card já abre a busca filtrada.
            </p>
          }
        />
        <div className="grid auto-rows-[220px] grid-cols-2 gap-3 min-[900px]:auto-rows-[300px] min-[900px]:grid-cols-6 min-[900px]:gap-4.5">
          {regioes.map((r, i) => {
            const { celular, desktop } = vaos[i];
            return (
              <CardCategoria
                key={r.slug}
                href={urlGrid({ regiao: r.slug, pagina: 1 })}
                img={r.img}
                legenda={r.legenda}
                nome={r.nome}
                // O nome maior é do card largo da proposta, que só existe com as 5 regiões.
                grande={r.grande && desktop === 4}
                vao={`${celular}/${desktop}`}
                sizes={`(max-width: 899px) ${celular === 2 ? 100 : 50}vw, ${larguraDesktop[desktop]}px`}
                className={`${celular === 2 ? "col-span-2" : ""} ${classeDesktop[desktop]}`}
              />
            );
          })}
        </div>
      </div>
    </section>
  );
}
