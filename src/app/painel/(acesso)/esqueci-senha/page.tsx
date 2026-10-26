import type { Metadata } from "next";
import { CartaoAcesso } from "@/components/painel/acesso/CartaoAcesso";
import { FormEsqueci } from "@/components/painel/acesso/FormEsqueci";

export const metadata: Metadata = { title: "Esqueci minha senha" };

export default function EsqueciPage() {
  return (
    <CartaoAcesso>
      <FormEsqueci />
    </CartaoAcesso>
  );
}
