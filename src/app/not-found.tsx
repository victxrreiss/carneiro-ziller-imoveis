import Link from "next/link";
import { SiteChrome } from "@/components/layout/SiteChrome";
import { IcCasa } from "@/components/ui/IconesSite";
import { routes } from "@/lib/routes";

/** 404 das páginas que ainda não existem (Contato, Sobre nós, Política…), com a moldura do site. */
export default function NaoEncontrado() {
  return (
    <SiteChrome current="home">
      <main>
        <section className="im-empty" style={{ paddingTop: 48 }}>
          <div className="wrap">
            <div className="notice">
              <div className="notice-icon">
                <IcCasa size={28} width={1.3} />
              </div>
              <h1>Página não encontrada</h1>
              <p>O endereço pode estar incorreto ou a página ainda não foi publicada.</p>
              <div className="notice-actions">
                <Link href={routes.home} className="btn">
                  VOLTAR PARA A HOME
                </Link>
                <Link className="link-arrow" href={routes.imoveis}>
                  Ver todos os imóveis →
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </SiteChrome>
  );
}
