import { Shell } from "@/components/painel/Shell";
import { sessaoAtual } from "@/lib/painel/sessao";

/**
 * Menu do painel com quem está logado. Sem sessão, renderiza só a página, que
 * redireciona para Entrar guardando o endereço de volta (exigirUsuario).
 */
export default async function PainelAppLayout({ children }: LayoutProps<"/painel">) {
  const s = await sessaoAtual();
  if (!s.usuario) return children;
  return <Shell usuario={{ nome: s.usuario.nome, papel: s.usuario.papel }}>{children}</Shell>;
}
