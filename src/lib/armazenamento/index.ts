// Fotos dos imóveis: Vercel Blob (padrão na Vercel) ou qualquer armazenamento
// compatível com S3 (AWS S3, Cloudflare R2, Supabase Storage, MinIO...). Em
// ambos o navegador envia direto ao armazenamento, com permissão de curta
// validade presa à chave, ao tipo e ao tamanho; o servidor só confere e guarda
// os metadados.
import {
  DeleteObjectsCommand,
  GetObjectCommand,
  HeadObjectCommand,
  PutObjectCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { del as blobDel, head as blobHead, put as blobPut, BlobNotFoundError } from "@vercel/blob";
import { generateClientTokenFromReadWriteToken } from "@vercel/blob/client";
import { configBlob, configS3, provedorFotos } from "@/lib/config";

export type ObjetoConferido = { tamanho: number; tipo: string; inicio: Uint8Array };

/**
 * Como o navegador envia o arquivo: `put` = PUT simples numa URL assinada (S3);
 * `vercel-blob` = SDK do Blob no cliente com um token de cliente restrito à chave.
 */
export type Envio =
  | { modo: "put"; url: string; cabecalhos: Record<string, string> }
  | { modo: "vercel-blob"; chave: string; token: string };

export interface ArmazenamentoFotos {
  /** Permissão de envio de validade curta, com chave, tipo e tamanho fixados. */
  urlDeEnvio(o: { chave: string; tipo: string; tamanho: number }): Promise<Envio>;
  /** Tamanho, tipo e primeiros bytes do objeto enviado; `null` se não existe. */
  conferir(chave: string): Promise<ObjetoConferido | null>;
  remover(chaves: string[]): Promise<void>;
  urlPublica(chave: string): string;
  /** Envio feito pelo servidor (semente de desenvolvimento). */
  enviar(chave: string, bytes: Uint8Array, tipo: string): Promise<void>;
}

const VALIDADE_URL_S = 300;
const BYTES_INICIO = 16;

export function armazenamentoS3(): ArmazenamentoFotos {
  let cliente: S3Client | null = null;
  const c = () => {
    const cfg = configS3();
    cliente ??= new S3Client({
      endpoint: cfg.endpoint,
      region: cfg.regiao,
      forcePathStyle: cfg.forcePathStyle,
      credentials: { accessKeyId: cfg.accessKeyId, secretAccessKey: cfg.secretAccessKey },
      // Evita o checksum extra do SDK novo, que alguns fornecedores S3 não aceitam.
      requestChecksumCalculation: "WHEN_REQUIRED",
      responseChecksumValidation: "WHEN_REQUIRED",
    });
    return { s3: cliente, cfg };
  };
  return {
    async urlDeEnvio({ chave, tipo, tamanho }) {
      const { s3, cfg } = c();
      const url = await getSignedUrl(s3, new PutObjectCommand({ Bucket: cfg.bucket, Key: chave, ContentType: tipo, ContentLength: tamanho }), {
        expiresIn: VALIDADE_URL_S,
        signableHeaders: new Set(["content-type", "content-length"]),
      });
      return { modo: "put", url, cabecalhos: { "Content-Type": tipo } };
    },
    async conferir(chave) {
      const { s3, cfg } = c();
      try {
        const head = await s3.send(new HeadObjectCommand({ Bucket: cfg.bucket, Key: chave }));
        const parte = await s3.send(new GetObjectCommand({ Bucket: cfg.bucket, Key: chave, Range: `bytes=0-${BYTES_INICIO - 1}` }));
        const inicio = parte.Body ? await parte.Body.transformToByteArray() : new Uint8Array();
        return { tamanho: head.ContentLength ?? 0, tipo: head.ContentType ?? "", inicio };
      } catch (e) {
        const nome = (e as { name?: string }).name;
        if (nome === "NotFound" || nome === "NoSuchKey") return null;
        throw e;
      }
    },
    async remover(chaves) {
      if (!chaves.length) return;
      const { s3, cfg } = c();
      for (let i = 0; i < chaves.length; i += 1000) {
        await s3.send(new DeleteObjectsCommand({ Bucket: cfg.bucket, Delete: { Objects: chaves.slice(i, i + 1000).map((Key) => ({ Key })), Quiet: true } }));
      }
    },
    urlPublica: (chave) => `${configS3().urlPublica}/${chave}`,
    async enviar(chave, bytes, tipo) {
      const { s3, cfg } = c();
      await s3.send(new PutObjectCommand({ Bucket: cfg.bucket, Key: chave, Body: bytes, ContentType: tipo }));
    },
  };
}

export function armazenamentoBlob(): ArmazenamentoFotos {
  const cfg = () => configBlob();
  return {
    async urlDeEnvio({ chave, tipo, tamanho }) {
      const token = await generateClientTokenFromReadWriteToken({
        token: cfg().token,
        pathname: chave,
        allowedContentTypes: [tipo],
        maximumSizeInBytes: tamanho,
        validUntil: Date.now() + VALIDADE_URL_S * 1000,
        addRandomSuffix: false,
        allowOverwrite: false,
      });
      return { modo: "vercel-blob", chave, token };
    },
    async conferir(chave) {
      const { token, urlPublica } = cfg();
      let info;
      try {
        info = await blobHead(chave, { token });
      } catch (e) {
        if (e instanceof BlobNotFoundError) return null;
        throw e;
      }
      // Loja pública: os primeiros bytes saem da própria URL do objeto.
      const r = await fetch(info.url || `${urlPublica}/${chave}`, { headers: { Range: `bytes=0-${BYTES_INICIO - 1}` }, cache: "no-store" });
      const inicio = r.ok ? new Uint8Array(await r.arrayBuffer()).slice(0, BYTES_INICIO) : new Uint8Array();
      return { tamanho: info.size, tipo: info.contentType, inicio };
    },
    async remover(chaves) {
      if (!chaves.length) return;
      const { token } = cfg();
      for (let i = 0; i < chaves.length; i += 100) await blobDel(chaves.slice(i, i + 100), { token });
    },
    urlPublica: (chave) => `${cfg().urlPublica}/${chave}`,
    async enviar(chave, bytes, tipo) {
      await blobPut(chave, Buffer.from(bytes), { access: "public", token: cfg().token, contentType: tipo, addRandomSuffix: false, allowOverwrite: true });
    },
  };
}

/** Armazenamento de testes: objetos em memória. `colocar` simula o envio do navegador. */
export function armazenamentoMemoria(): ArmazenamentoFotos & { objetos: Map<string, { bytes: Uint8Array; tipo: string }> } {
  const objetos = new Map<string, { bytes: Uint8Array; tipo: string }>();
  return {
    objetos,
    async urlDeEnvio({ chave }) {
      return { modo: "put", url: `memoria://${chave}`, cabecalhos: {} };
    },
    async conferir(chave) {
      const o = objetos.get(chave);
      return o ? { tamanho: o.bytes.byteLength, tipo: o.tipo, inicio: o.bytes.slice(0, BYTES_INICIO) } : null;
    },
    async remover(chaves) {
      for (const k of chaves) objetos.delete(k);
    },
    urlPublica: (chave) => `https://fotos.teste/${chave}`,
    async enviar(chave, bytes, tipo) {
      objetos.set(chave, { bytes, tipo });
    },
  };
}

let atual: ArmazenamentoFotos | null = null;

/** Troca o armazenamento (usado pelos testes). */
export function definirArmazenamento(a: ArmazenamentoFotos | null): void {
  atual = a;
}

export function armazenamento(): ArmazenamentoFotos {
  atual ??= provedorFotos() === "blob" ? armazenamentoBlob() : armazenamentoS3();
  return atual;
}

/** Assinatura (magic bytes) de JPG, PNG e WEBP conferida contra o tipo declarado. */
export function assinaturaConfere(inicio: Uint8Array, tipo: string): boolean {
  const b = inicio;
  if (tipo === "image/jpeg") return b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
  if (tipo === "image/png") return b.length >= 8 && [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a].every((v, i) => b[i] === v);
  if (tipo === "image/webp") {
    const t = (i: number, s: string) => [...s].every((ch, k) => b[i + k] === ch.charCodeAt(0));
    return b.length >= 12 && t(0, "RIFF") && t(8, "WEBP");
  }
  return false;
}
