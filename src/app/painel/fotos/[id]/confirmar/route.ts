// Passo 4 do envio de foto: o servidor confere o objeto no armazenamento
// (tamanho, tipo e assinatura) e só então a foto pode ser usada num imóvel.
import { cookies } from "next/headers";
import { exigirSessaoHttp } from "@/lib/painel/acesso-http";
import { lerSessao } from "@/lib/painel/contas";
import { confirmarFoto } from "@/lib/painel/imoveis";
import { COOKIE_SESSAO } from "@/lib/painel/sessao";

const MENSAGEM = {
  inexistente: "Foto não encontrada. Envie de novo.",
  ausente: "A foto não chegou ao armazenamento. Envie de novo.",
  invalida: "O arquivo não é uma foto JPG, PNG ou WEBP válida.",
} as const;

export async function POST(_: Request, { params }: RouteContext<"/painel/fotos/[id]/confirmar">) {
  const sessao = await lerSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  const porteiro = exigirSessaoHttp(sessao);
  if ("resposta" in porteiro) return porteiro.resposta;
  const usuario = porteiro.usuario;
  const { id } = await params;
  const r = await confirmarFoto(usuario, id);
  if (!r.ok) return Response.json({ ok: false, erro: MENSAGEM[r.erro] }, { status: r.erro === "inexistente" ? 404 : 422 });
  return Response.json({ ok: true, id: r.id, src: r.src });
}
