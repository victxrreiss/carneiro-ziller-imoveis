// Envio do lead para POST /api/interesses (src/app/api/interesses/route.ts),
// que grava o interesse e avisa a equipe por e-mail. Falha (rede, limite) cai
// no estado "falha" da tela, com os dados mantidos.
import { telefoneE164, type CamposInteresse } from "./validacao";

export const ENDPOINT_INTERESSES = "/api/interesses";

export type ImovelDoInteresse = { id: string; codigo: string };

export async function enviarInteresse(imovel: ImovelDoInteresse, campos: CamposInteresse): Promise<void> {
  const resposta = await fetch(ENDPOINT_INTERESSES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      imovelId: imovel.id,
      codigo: imovel.codigo,
      nome: campos.nome.trim(),
      telefone: telefoneE164(campos.telefone),
      email: campos.email.trim(),
      observacoes: campos.observacoes.trim(),
      origem: "site",
      url: window.location.href,
    }),
  });
  if (!resposta.ok) throw new Error(`Falha ao enviar interesse: HTTP ${resposta.status}`);
}
