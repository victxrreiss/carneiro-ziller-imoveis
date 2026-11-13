import { getRegioesHome } from "@/lib/imoveis";
import { urlGrid } from "@/lib/imoveis/filtros";
import { CabecalhoSecao, CardCategoria, moldura } from "./partes";

/** "Onde você quer morar?": um card por região com imóvel publicado; cada um abre a busca filtrada pela região. */
export async function CardsRegioes() {
  const regioes = await getRegioesHome();
  if (!regioes.length) return null;

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
        <div className="grid auto-rows-[220px] grid-cols-2 gap-3 min-[900px]:auto-rows-[300px] min-[900px]:grid-cols-3 min-[900px]:gap-4.5">
          {regioes.map((r) => (
            <CardCategoria
              key={r.slug}
              href={urlGrid({ regiao: r.slug, pagina: 1 })}
              img={r.img}
              legenda={r.legenda}
              nome={r.nome}
              grande={r.grande}
              sizes={r.grande ? "(max-width: 899px) 100vw, 800px" : "(max-width: 899px) 50vw, 400px"}
              className={r.grande ? "col-span-2" : ""}
            />
          ))}
        </div>
      </div>
    </section>
  );
}
