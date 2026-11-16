import type { Metadata } from "next";
import { ListaDestaques } from "@/components/painel/destaques/ListaDestaques";
import { SemPermissao } from "@/components/painel/SemPermissao";
import { dataAsHora } from "@/lib/painel/datas";
import { listarDestaques, MAX_DESTAQUES_HOME } from "@/lib/painel/destaques";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Página inicial" };

const MOTIVO = {
  indisponivel: (c: string) => `marcou ${c} como Indisponível`,
  rascunho: (c: string) => `voltou ${c} para Rascunho`,
  excluido: (c: string) => `excluiu ${c}`,
  desmarcado: (c: string) => `tirou ${c} dos destaques`,
} as const;

export default async function PaginaInicialPage() {
  const u = await exigirUsuario(painel.paginaInicial);
  if (u.papel !== "admin") {
    return <SemPermissao texto="Escolher os destaques da página inicial é exclusivo do ADMIN. Se precisar de uma mudança, fale com o ADMIN da Carneiro & Ziller." />;
  }
  const { itens, aviso } = await listarDestaques(u);
  const textoAviso = aviso
    ? `${aviso.foiVoce ? "Você" : aviso.porNome} ${MOTIVO[aviso.aviso.motivo](`${aviso.aviso.codigo} · ${aviso.aviso.titulo}`)} em ${dataAsHora(aviso.aviso.em)}.`
    : null;
  return <ListaDestaques itens={itens} aviso={textoAviso} max={MAX_DESTAQUES_HOME} />;
}
