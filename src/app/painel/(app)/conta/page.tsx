import type { Metadata } from "next";
import { FormConta } from "@/components/painel/conta/FormConta";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Minha conta" };

export default async function ContaPage() {
  const u = await exigirUsuario(painel.conta);
  return <FormConta nome={u.nome} email={u.email} papel={u.papel} />;
}
