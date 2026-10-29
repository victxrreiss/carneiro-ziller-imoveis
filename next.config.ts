import type { NextConfig } from "next";

// As fotos dos imóveis vêm do Vercel Blob (host `*.public.blob.vercel-storage.com`)
// ou do S3 (FOTOS_URL_PUBLICA). O next/image só otimiza hosts listados em
// `remotePatterns`, lido no BUILD: mudar FOTOS_URL_PUBLICA exige novo deploy.
type Padroes = NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]>;

function fotosRemotePatterns(): Padroes {
  const padroes: Padroes = [];
  if (process.env.BLOB_READ_WRITE_TOKEN?.trim()) {
    padroes.push({ protocol: "https", hostname: "*.public.blob.vercel-storage.com", pathname: "/fotos/**", search: "" });
  }
  const url = process.env.FOTOS_URL_PUBLICA?.trim();
  if (url) {
    const u = new URL(url);
    padroes.push({
      protocol: u.protocol === "http:" ? "http" : "https",
      hostname: u.hostname,
      port: u.port,
      pathname: `${u.pathname.replace(/\/$/, "")}/**`,
      search: "",
    });
  }
  if (!padroes.length && process.env.NODE_ENV === "production") {
    throw new Error(
      "Nenhum armazenamento de fotos no ambiente do build. Conecte um Vercel Blob ao projeto (BLOB_READ_WRITE_TOKEN) ou defina FOTOS_URL_PUBLICA para S3.",
    );
  }
  return padroes;
}

const nextConfig: NextConfig = {
  // Imagem Docker enxuta (Dockerfile): só o servidor e as dependências rastreadas.
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    formats: ["image/avif", "image/webp"],
    qualities: [75],
    remotePatterns: fotosRemotePatterns(),
    // O otimizador bloqueia host local por padrão (proteção contra SSRF). Só o
    // ambiente local (S3 em localhost) liga isto; NUNCA em produção.
    dangerouslyAllowLocalIP: process.env.IMAGENS_HOST_LOCAL === "true",
  },
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
