import type { Metadata } from "next";
import { FormImovel } from "@/components/painel/imoveis/FormImovel";
import { oportunidadeAtual, opcoesResponsavel } from "@/lib/painel/imoveis";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Cadastrar imóvel" };

export default async function NovoImovelPage() {
  const u = await exigirUsuario(painel.novoImovel);
  return (
    <FormImovel
      imovel={null}
      usuario={{ id: u.id, nome: u.nome, admin: u.papel === "admin" }}
      responsaveis={await opcoesResponsavel(u.id)}
      oportunidadeAtual={await oportunidadeAtual()}
      avisoInicial={null}
    />
  );
}
