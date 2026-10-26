// Passo 1 do envio de foto: o navegador declara tipo, tamanho e dimensões (sem o
// arquivo) e recebe a permissão para enviar direto ao armazenamento (URL
// assinada do S3 ou token de cliente do Vercel Blob).
// Exige sessão; os limites estão em lib/painel.
import { cookies } from "next/headers";
import { lerSessao } from "@/lib/painel/contas";
import { prepararEnvioFoto } from "@/lib/painel/imoveis";
import { COOKIE_SESSAO } from "@/lib/painel/sessao";
import { LIMITES } from "@/lib/painel/regras";

const MENSAGEM = {
  tipo: "Use JPG, PNG ou WEBP.",
  tamanho: `A foto tem mais de ${LIMITES.fotoMB} MB.`,
  dimensoes: "Não foi possível ler as dimensões da foto.",
} as const;

export async function POST(request: Request) {
  const sessao = await lerSessao((await cookies()).get(COOKIE_SESSAO)?.value);
  if (!sessao.usuario) return Response.json({ ok: false, erro: "Sua sessão expirou. Entre de novo." }, { status: 401 });

  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "Envio inválido." }, { status: 400 });
  }
  const o = (corpo && typeof corpo === "object" ? corpo : {}) as Record<string, unknown>;
  const r = await prepararEnvioFoto(sessao.usuario, {
    tipo: typeof o.tipo === "string" ? o.tipo : "",
    tamanho: Number(o.tamanho),
    largura: Number(o.largura),
    altura: Number(o.altura),
  });
  if (!r.ok) return Response.json({ ok: false, erro: MENSAGEM[r.erro] }, { status: 422 });
  return Response.json({ ok: true, id: r.id, envio: r.envio });
}
