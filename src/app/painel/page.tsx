import { redirect } from "next/navigation";
import { painel } from "@/lib/routes";

export default function PainelInicio() {
  redirect(painel.imoveis);
}
