// Fotos enviadas pelo painel. O id é um UUID aleatório; o arquivo não muda
// (trocar a foto gera outro id), então pode ficar em cache para sempre.
import { lerFoto } from "@/lib/painel/imoveis";

export async function GET(_: Request, { params }: RouteContext<"/fotos/[id]">) {
  const { id } = await params;
  const foto = lerFoto(id);
  if (!foto) return new Response("Não encontrada", { status: 404 });
  return new Response(new Uint8Array(foto.bytes), {
    headers: {
      "Content-Type": foto.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
