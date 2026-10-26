// Envio de fotos do cadastro: uma requisição por foto (XHR, para ter progresso).
import type { Envio } from "@/lib/armazenamento";
import { LIMITES, TIPOS_FOTO } from "@/lib/painel/regras";

export type FotoTela = {
  /** Chave local (React e arrastar); não muda durante o envio. */
  chave: string;
  /** Id no servidor; nulo enquanto envia ou se falhou. */
  id: string | null;
  src: string;
  alt: string;
  estado: "ok" | "enviando" | "falha";
  progresso: number;
  erro?: string;
  arquivo?: File;
};

async function dimensoes(arquivo: File): Promise<{ largura: number; altura: number }> {
  try {
    const bmp = await createImageBitmap(arquivo);
    const r = { largura: bmp.width, altura: bmp.height };
    bmp.close();
    return r;
  } catch {
    return new Promise((resolve) => {
      const img = new Image();
      const url = URL.createObjectURL(arquivo);
      img.onload = () => {
        resolve({ largura: img.naturalWidth, altura: img.naturalHeight });
        URL.revokeObjectURL(url);
      };
      img.onerror = () => {
        resolve({ largura: 0, altura: 0 });
        URL.revokeObjectURL(url);
      };
      img.src = url;
    });
  }
}

/** Confere o arquivo antes de enviar. */
export function erroArquivo(arquivo: File): string | null {
  if (!(TIPOS_FOTO as readonly string[]).includes(arquivo.type)) return "Use JPG, PNG ou WEBP.";
  if (arquivo.size > LIMITES.fotoMB * 1024 * 1024) return `A foto tem mais de ${LIMITES.fotoMB} MB.`;
  return null;
}

type RespostaPreparo = { ok?: boolean; id?: string; envio?: Envio; erro?: string };
type RespostaConfirmar = { ok?: boolean; id?: string; src?: string; erro?: string };

async function postarJson<T>(url: string, corpo?: unknown): Promise<{ status: number; corpo: T | null }> {
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: corpo === undefined ? undefined : JSON.stringify(corpo) });
    return { status: r.status, corpo: (await r.json().catch(() => null)) as T | null };
  } catch {
    return { status: 0, corpo: null };
  }
}

type Progresso = (enviados: number, total: number) => void;

function enviarPut(envio: Extract<Envio, { modo: "put" }>, arquivo: File, progresso: Progresso): Promise<boolean> {
  return new Promise<boolean>((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", envio.url);
    for (const [k, v] of Object.entries(envio.cabecalhos)) xhr.setRequestHeader(k, v);
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) progresso(e.loaded, e.total);
    };
    xhr.onload = () => resolve(xhr.status >= 200 && xhr.status < 300);
    xhr.onerror = () => resolve(false);
    xhr.send(arquivo);
  });
}

async function enviarBlob(envio: Extract<Envio, { modo: "vercel-blob" }>, arquivo: File, progresso: Progresso): Promise<boolean> {
  try {
    // Carregado só quando o site usa Vercel Blob.
    const { put } = await import("@vercel/blob/client");
    await put(envio.chave, arquivo, {
      access: "public",
      token: envio.token,
      contentType: arquivo.type,
      onUploadProgress: (e) => progresso(e.loaded, e.total),
    });
    return true;
  } catch {
    return false;
  }
}

/**
 * Envio em três passos, sem o arquivo passar pelo servidor do site:
 * 1) pede a permissão de envio; 2) envia direto ao armazenamento (com
 * progresso); 3) pede ao servidor que confira o objeto.
 */
export async function enviarFoto(
  arquivo: File,
  onProgresso: (pct: number) => void,
): Promise<{ ok: true; id: string; src: string } | { ok: false; erro: string }> {
  const { largura, altura } = await dimensoes(arquivo);
  const preparo = await postarJson<RespostaPreparo>("/painel/fotos", { tipo: arquivo.type, tamanho: arquivo.size, largura, altura });
  const p = preparo.corpo;
  if (preparo.status !== 200 || !p?.ok || !p.id || !p.envio) return { ok: false, erro: p?.erro ?? "não chegou ao servidor." };

  const progresso = (enviados: number, total: number) => onProgresso(Math.min(95, Math.round((enviados / total) * 95)));
  const enviado = p.envio.modo === "vercel-blob" ? await enviarBlob(p.envio, arquivo, progresso) : await enviarPut(p.envio, arquivo, progresso);
  if (!enviado) return { ok: false, erro: "o envio da foto falhou. Tente de novo." };

  onProgresso(99);
  const confirmacao = await postarJson<RespostaConfirmar>(`/painel/fotos/${p.id}/confirmar`);
  const c = confirmacao.corpo;
  if (confirmacao.status === 200 && c?.ok && c.id && c.src) return { ok: true, id: c.id, src: c.src };
  return { ok: false, erro: c?.erro ?? "não foi possível confirmar a foto." };
}
