import Link from "next/link";
import { CardImovel } from "@/components/imoveis/CardImovel";
import { getDestaquesHome } from "@/lib/imoveis";
import { routes } from "@/lib/routes";
import { CabecalhoSecao, linkSeta, moldura } from "./partes";

/** "Imóveis em destaque": os que o ADMIN escolheu no painel, na ordem dele. Sem nenhum, a seção não aparece. */
export async function Destaques() {
  const itens = await getDestaquesHome();
  if (!itens.length) return null;

  return (
    <section aria-labelledby="destaques-titulo" className="pb-[clamp(72px,9vw,128px)]">
      <div className={moldura}>
        <CabecalhoSecao
          id="destaques-titulo"
          rotulo="Selecionados"
          titulo="Imóveis em destaque"
          lado={
            <Link href={routes.imoveis} className={linkSeta}>
              Ver todos
            </Link>
          }
        />
        <ul className="m-0 grid list-none grid-cols-1 gap-9 p-0 min-[900px]:grid-cols-2 min-[900px]:gap-x-7 min-[900px]:gap-y-12 min-[1150px]:grid-cols-3">
          {itens.map((i) => (
            <li key={i.id}>
              <CardImovel imovel={i} />
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
