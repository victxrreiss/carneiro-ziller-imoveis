import { notFound } from "next/navigation";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

/** Qualquer outro endereço do painel: "Página não encontrada" dentro do painel (com sessão). */
export default async function PainelOutro() {
  await exigirUsuario(painel.imoveis);
  notFound();
}
