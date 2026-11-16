import type { Metadata } from "next";
import { ListaImoveis, type LinhaLista } from "@/components/painel/imoveis/ListaImoveis";
import { data, hora } from "@/lib/painel/datas";
import { listarImoveis } from "@/lib/painel/imoveis";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Imóveis" };

export default async function ImoveisPainelPage() {
  const u = await exigirUsuario(painel.imoveis);
  const linhas: LinhaLista[] = (await listarImoveis(u)).map((l) => ({ ...l, data: data(l.alteradoEm), hora: hora(l.alteradoEm) }));
  return <ListaImoveis linhas={linhas} usuario={{ id: u.id, nome: u.nome, admin: u.papel === "admin" }} />;
}
