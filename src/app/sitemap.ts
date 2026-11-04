import type { MetadataRoute } from "next";
import { urlDoSite } from "@/lib/config";
import { getSitemapImoveis, getTemLancamentos } from "@/lib/imoveis";
import { routes } from "@/lib/routes";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = urlDoSite();
  const absoluta = (caminho: string) => new URL(caminho, base).toString();
  const [imoveis, temLancamentos] = await Promise.all([getSitemapImoveis(), getTemLancamentos()]);
  const paginas = [
    routes.home,
    routes.imoveis,
    ...(temLancamentos ? [routes.lancamentos] : []),
    routes.contato,
    routes.sobre,
    routes.privacidade,
  ];
  return [
    ...paginas.map((caminho) => ({ url: absoluta(caminho) })),
    ...imoveis.map((i) => ({ url: absoluta(routes.imovel(i.id)), lastModified: i.alteradoEm })),
  ];
}
