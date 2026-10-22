// Envio de fotos do cadastro: uma requisição por foto (XHR, para ter progresso).
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

export async function enviarFoto(
  arquivo: File,
  onProgresso: (pct: number) => void,
): Promise<{ ok: true; id: string; src: string } | { ok: false; erro: string }> {
  const { largura, altura } = await dimensoes(arquivo);
  const dados = new FormData();
  dados.append("foto", arquivo);
  dados.append("largura", String(largura));
  dados.append("altura", String(altura));
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    xhr.open("POST", "/painel/fotos");
    xhr.responseType = "json";
    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgresso(Math.min(99, Math.round((e.loaded / e.total) * 100)));
    };
    xhr.onload = () => {
      const r = xhr.response as { ok?: boolean; id?: string; src?: string; erro?: string } | null;
      if (xhr.status === 200 && r?.ok && r.id && r.src) resolve({ ok: true, id: r.id, src: r.src });
      else resolve({ ok: false, erro: r?.erro ?? "não chegou ao servidor." });
    };
    xhr.onerror = () => resolve({ ok: false, erro: "não chegou ao servidor." });
    xhr.send(dados);
  });
}
