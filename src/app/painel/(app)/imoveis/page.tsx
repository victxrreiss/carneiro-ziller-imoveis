import type { Metadata } from "next";
import { ListaImoveis, type LinhaLista } from "@/components/painel/imoveis/ListaImoveis";
import { data, dataAsHora, hora } from "@/lib/painel/datas";
import { avisoOportunidadeVazia, listarImoveis } from "@/lib/painel/imoveis";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Imóveis" };

const MOTIVO = {
  indisponivel: (c: string) => `marcou ${c} como Indisponível`,
  rascunho: (c: string) => `voltou ${c} para Rascunho`,
  excluido: (c: string) => `excluiu ${c}`,
  desmarcado: (c: string) => `tirou ${c} da Oportunidade de hoje`,
} as const;

export default async function ImoveisPainelPage() {
  const u = await exigirUsuario(painel.imoveis);
  const linhas: LinhaLista[] = listarImoveis(u).map((l) => ({ ...l, data: data(l.alteradoEm), hora: hora(l.alteradoEm) }));

  // Oportunidade de hoje vazia: aviso só para o ADMIN.
  const a = avisoOportunidadeVazia(u);
  let avisoOportunidade: string | null = null;
  if (a) {
    if (a.aviso) {
      const imovel = `${a.aviso.codigo} · ${a.aviso.titulo}`;
      avisoOportunidade = `${a.foiVoce ? "Você" : a.porNome} ${MOTIVO[a.aviso.motivo](imovel)} em ${dataAsHora(a.aviso.em)}.`;
    } else avisoOportunidade = "Nenhum imóvel publicado está marcado na Oportunidade de hoje.";
  }

  return <ListaImoveis linhas={linhas} usuario={{ id: u.id, nome: u.nome, admin: u.papel === "admin" }} avisoOportunidade={avisoOportunidade} />;
}
