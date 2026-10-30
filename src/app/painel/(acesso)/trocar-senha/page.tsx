import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { CartaoAcesso } from "@/components/painel/acesso/CartaoAcesso";
import { FormTrocarSenha } from "@/components/painel/acesso/FormTrocarSenha";
import { sessaoAtual } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Crie sua senha" };

async function Conteudo() {
  const s = await sessaoAtual();
  if (!s.usuario) redirect(s.motivo === "expirada" ? painel.entrarExpirada() : painel.entrar);
  if (!s.usuario.trocarSenha) redirect(painel.imoveis);
  return <FormTrocarSenha email={s.usuario.email} />;
}

export default function TrocarSenhaPage() {
  return (
    <CartaoAcesso>
      <Suspense fallback={null}>
        <Conteudo />
      </Suspense>
    </CartaoAcesso>
  );
}
