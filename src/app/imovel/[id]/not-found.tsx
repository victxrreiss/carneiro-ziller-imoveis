import { ImovelAusente } from "@/components/imovel/ImovelTela";
import { SiteChrome } from "@/components/layout/SiteChrome";

export default function ImovelNaoEncontrado() {
  return (
    <SiteChrome current="imoveis">
      <ImovelAusente tipo="inexistente" />
    </SiteChrome>
  );
}
