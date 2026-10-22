import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CartaoAcesso } from "@/components/painel/acesso/CartaoAcesso";
import { FormEntrar } from "@/components/painel/acesso/FormEntrar";
import { sessaoAtual } from "@/lib/painel/sessao";
import { destinoSeguro } from "@/lib/routes";

export const metadata: Metadata = { title: "Entrar" };

export default async function EntrarPage({ searchParams }: PageProps<"/painel/entrar">) {
  const { motivo, voltar } = await searchParams;
  const destino = typeof voltar === "string" ? voltar : undefined;
  // Quem já está com sessão válida vai direto para o painel.
  const s = await sessaoAtual();
  if (s.usuario) redirect(destinoSeguro(destino));
  return (
    <CartaoAcesso>
      <FormEntrar sessaoExpirada={motivo === "sessao-expirada"} voltar={destino} />
    </CartaoAcesso>
  );
}
