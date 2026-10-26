// Na inicialização do servidor em produção, confere as variáveis de ambiente.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs" || process.env.NODE_ENV !== "production") return;
  const { validarConfigProducao } = await import("@/lib/config");
  for (const alerta of validarConfigProducao().alertas) console.error(`[config] ${alerta}`);
}
