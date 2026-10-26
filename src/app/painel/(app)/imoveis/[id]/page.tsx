import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { FormImovel } from "@/components/painel/imoveis/FormImovel";
import { obterParaEdicao, oportunidadeAtual, opcoesResponsavel } from "@/lib/painel/imoveis";
import type { Intencao } from "@/lib/painel/regras";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Imóvel" };

const INTENCOES: Intencao[] = ["rascunho", "publicar", "salvar"];

export default async function EditarImovelPage({ params, searchParams }: PageProps<"/painel/imoveis/[id]">) {
  const { id } = await params;
  const u = await exigirUsuario(painel.imovel(id));
  const imovel = await obterParaEdicao(u, id);
  if (!imovel) notFound();
  const { salvo } = await searchParams;
  const aviso = INTENCOES.find((i) => i === salvo) ?? null;
  return (
    <FormImovel
      // Outro imóvel ou outra versão salva: recomeça o formulário.
      key={imovel.id}
      imovel={imovel}
      usuario={{ id: u.id, nome: u.nome, admin: u.papel === "admin" }}
      responsaveis={await opcoesResponsavel(imovel.responsavelId)}
      oportunidadeAtual={await oportunidadeAtual()}
      avisoInicial={aviso}
    />
  );
}
