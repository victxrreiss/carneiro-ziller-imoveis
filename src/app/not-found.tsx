import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { routes } from "@/lib/routes";

/** 404 do site, com a moldura das telas internas. */
export default function NaoEncontrado() {
  return (
    <SiteChrome current="home">
      <main>
        <section className="pg-aviso">
          <div className="wrap">
            <p className="pg-eyebrow">Erro 404</p>
            <h1 className="pg-titulo">Página não encontrada</h1>
            <p className="pg-aviso-texto">O endereço pode estar incorreto ou a página ainda não foi publicada.</p>
            <div className="notice-actions">
              <Link href={routes.home} className="btn">
                VOLTAR PARA A HOME
              </Link>
              <Link className="link-arrow" href={routes.imoveis}>
                Ver todos os imóveis →
              </Link>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
