// POST /api/interesses — formulário "Tenho interesse" da página do imóvel.
// Contrato em src/lib/interesse/enviar.ts. Grava o lead e, depois de responder,
// avisa por e-mail o corretor responsável, o ADMIN e LEADS_EMAIL.
import { after } from "next/server";
import { enviar } from "@/lib/painel/emails";
import { registrarInteresse } from "@/lib/interesse/servidor";

const STATUS = { dados: 422, imovel: 404, limite: 429 } as const;

export async function POST(request: Request) {
  let corpo: unknown;
  try {
    corpo = await request.json();
  } catch {
    return Response.json({ ok: false, erro: "dados" }, { status: 400 });
  }
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip") || "";
  const r = await registrarInteresse(corpo && typeof corpo === "object" ? (corpo as Record<string, unknown>) : {}, ip);
  if (!r.ok) return Response.json({ ok: false, erro: r.erro }, { status: STATUS[r.erro] });

  after(async () => {
    for (const aviso of r.avisos) {
      try {
        await enviar(aviso);
      } catch (e) {
        console.error(`[interesses] aviso de ${r.id} para ${aviso.para} não enviado:`, e instanceof Error ? e.message : e);
      }
    }
  });
  return Response.json({ ok: true, id: r.id }, { status: 201 });
}
