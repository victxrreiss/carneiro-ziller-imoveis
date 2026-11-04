// Envio do lead para POST /api/interesses (src/app/api/interesses/route.ts),
// que grava o interesse e avisa a equipe por e-mail. Falha (rede, limite) cai
// no estado "falha" da tela, com os dados mantidos.
import { telefoneE164, type CamposInteresse } from "./validacao";

export const ENDPOINT_INTERESSES = "/api/interesses";

export type ImovelDoInteresse = { id: string; codigo: string };

async function enviar(imovel: ImovelDoInteresse | null, origem: string, campos: CamposInteresse): Promise<void> {
  const resposta = await fetch(ENDPOINT_INTERESSES, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...(imovel ? { imovelId: imovel.id, codigo: imovel.codigo } : {}),
      nome: campos.nome.trim(),
      telefone: telefoneE164(campos.telefone),
      email: campos.email.trim(),
      observacoes: campos.observacoes.trim(),
      origem,
      url: window.location.href,
    }),
  });
  if (!resposta.ok) throw new Error(`Falha ao enviar interesse: HTTP ${resposta.status}`);
}

export const enviarInteresse = (imovel: ImovelDoInteresse, campos: CamposInteresse) => enviar(imovel, "site", campos);

/** Contato geral (página /contato), sem imóvel. */
export const enviarContato = (campos: CamposInteresse) => enviar(null, "contato", campos);
