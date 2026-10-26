// Limpeza diária agendada pela Vercel (vercel.json). Com CRON_SECRET definido, a
// Vercel manda `Authorization: Bearer <CRON_SECRET>` e só esse pedido passa. Sem
// ele, aceita só o agente do cron da Vercel: a rotina é idempotente e só apaga o
// que já venceu (fotos órfãs com mais de 24 h, sessões e links vencidos).
import { armazenamento } from "@/lib/armazenamento";
import { conexao } from "@/lib/dados/conexao";
import { executarLimpeza } from "@/lib/painel/limpeza";

export async function GET(request: Request) {
  const segredo = process.env.CRON_SECRET?.trim();
  const autorizado = segredo
    ? request.headers.get("authorization") === `Bearer ${segredo}`
    : (request.headers.get("user-agent") ?? "").startsWith("vercel-cron/");
  if (!autorizado) return new Response(null, { status: 401 });
  const r = await executarLimpeza(conexao(), armazenamento());
  return Response.json({ ok: true, ...r });
}
