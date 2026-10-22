// Envio de uma foto do cadastro de imóvel (uma requisição por foto, para a tela
// mostrar o progresso de cada uma). Exige sessão; os limites estão em lib/painel.
import { cookies } from "next/headers";
import { lerSessao } from "@/lib/painel/contas";
import { guardarFoto } from "@/lib/painel/imoveis";
import { COOKIE_SESSAO } from "@/lib/painel/sessao";
import { LIMITES } from "@/lib/painel/regras";

const MENSAGEM = {
  tipo: "Use JPG, PNG ou WEBP.",
  tamanho: `A foto tem mais de ${LIMITES.fotoMB} MB.`,
  dimensoes: "Não foi possível ler as dimensões da foto.",
} as const;

export async function POST(request: Request) {
  const sessao = lerSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao.usuario) return Response.json({ ok: false, erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });

  let dados: FormData;
  try {
    dados = await request.formData();
  } catch {
    return Response.json({ ok: false, erro: "Envio inválido." }, { status: 400 });
  }
  const arquivo = dados.get("foto");
  if (!(arquivo instanceof File)) return Response.json({ ok: false, erro: "Envio inválido." }, { status: 400 });
  const largura = Number(dados.get("largura"));
  const altura = Number(dados.get("altura"));

  const r = guardarFoto(sessao.usuario, new Uint8Array(await arquivo.arrayBuffer()), arquivo.type, largura, altura);
  if (!r.ok) return Response.json({ ok: false, erro: MENSAGEM[r.erro] }, { status: 422 });
  return Response.json({ ok: true, id: r.id, src: r.src });
}
