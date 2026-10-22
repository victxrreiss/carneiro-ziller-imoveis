import type { Metadata } from "next";
import { CartaoAcesso } from "@/components/painel/acesso/CartaoAcesso";
import { FormDefinirSenha, LinkInvalido } from "@/components/painel/acesso/FormDefinirSenha";
import { lerToken } from "@/lib/painel/contas";

export const metadata: Metadata = { title: "Definir senha" };

export default async function DefinirSenhaPage({ searchParams }: PageProps<"/painel/definir-senha">) {
  const { token } = await searchParams;
  const t = typeof token === "string" ? token : "";
  const leitura = lerToken(t);
  return (
    <CartaoAcesso>
      {leitura.valido ? <FormDefinirSenha token={t} tipo={leitura.tipo} email={leitura.email} /> : <LinkInvalido tipo={leitura.tipo} />}
    </CartaoAcesso>
  );
}
