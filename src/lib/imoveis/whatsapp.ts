/** Mensagem pré-preenchida do WhatsApp que identifica o imóvel pelo código e pela URL (sem `?de=`). */
export function mensagemWhatsAppImovel(i: { codigo: string; titulo: string }, url: string): string {
  return `Olá! Tenho interesse no imóvel ${i.codigo.toUpperCase()} — ${i.titulo}. ${url}`;
}
