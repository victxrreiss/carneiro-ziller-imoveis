import type { Metadata } from "next";
import { ListaContatos } from "@/components/painel/contatos/ListaContatos";
import { CONTATOS_POR_PAGINA, listarContatos } from "@/lib/painel/contatos";
import { data, hora } from "@/lib/painel/datas";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Contatos" };

export default async function ContatosPage({ searchParams }: PageProps<"/painel/contatos">) {
  const u = await exigirUsuario(painel.contatos);
  const { pagina: bruta } = await searchParams;
  const pedida = Number(typeof bruta === "string" ? bruta : 1);
  const r = await listarContatos(u, Number.isFinite(pedida) ? pedida : 1);
  const linhas = r.itens.map((l) => ({ ...l, data: data(l.criadoEm.toISOString()), hora: hora(l.criadoEm.toISOString()) }));
  return <ListaContatos linhas={linhas} total={r.total} pagina={r.pagina} paginas={r.paginas} porPagina={CONTATOS_POR_PAGINA} />;
}
