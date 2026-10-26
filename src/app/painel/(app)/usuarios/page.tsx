import type { Metadata } from "next";
import { SemPermissao } from "@/components/painel/SemPermissao";
import { ListaUsuarios } from "@/components/painel/usuarios/ListaUsuarios";
import { listarUsuarios } from "@/lib/painel/contas";
import { data, dataHora } from "@/lib/painel/datas";
import { exigirUsuario } from "@/lib/painel/sessao";
import { painel } from "@/lib/routes";

export const metadata: Metadata = { title: "Usuários" };

export default async function UsuariosPage() {
  const u = await exigirUsuario(painel.usuarios);
  if (u.papel !== "admin") {
    return (
      <SemPermissao texto="A gestão de usuários é exclusiva do ADMIN. Se precisar convidar alguém ou mudar um acesso, fale com o ADMIN da Carneiro & Ziller." />
    );
  }
  const usuarios = (await listarUsuarios()).map((l) => ({
    ...l,
    ultimoTexto:
      l.situacao === "pendente"
        ? `Convidado em ${l.conviteEnviadoEm ? data(l.conviteEnviadoEm) : "—"}`
        : l.ultimoAcesso
          ? dataHora(l.ultimoAcesso)
          : "Nunca entrou",
  }));
  return <ListaUsuarios usuarios={usuarios} eu={u.id} />;
}
