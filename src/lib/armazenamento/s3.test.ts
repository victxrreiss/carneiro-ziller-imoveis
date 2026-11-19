import { afterEach, describe, expect, test, vi } from "vitest";
import { armazenamentoS3 } from "./index";

const ENV = {
  S3_ENDPOINT: "https://site.exemplo.test",
  S3_REGIAO: "us-east-1",
  S3_BUCKET: "cz-fotos",
  S3_ACCESS_KEY_ID: "chave",
  S3_SECRET_ACCESS_KEY: "segredo",
  S3_FORCE_PATH_STYLE: "true",
  FOTOS_URL_PUBLICA: "https://site.exemplo.test/cz-fotos",
};

describe("S3", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("a URL de envio do navegador usa o endpoint público, mesmo com S3_ENDPOINT_INTERNO", async () => {
    for (const [k, v] of Object.entries({ ...ENV, S3_ENDPOINT_INTERNO: "http://minio-interno:9000" })) vi.stubEnv(k, v);
    const envio = await armazenamentoS3().urlDeEnvio({ chave: "fotos/a.jpg", tipo: "image/jpeg", tamanho: 10 });
    expect(envio.modo).toBe("put");
    if (envio.modo === "put") expect(new URL(envio.url).origin).toBe("https://site.exemplo.test");
  });

  test("o servidor confere a foto pelo endpoint interno", async () => {
    for (const [k, v] of Object.entries({ ...ENV, S3_ENDPOINT_INTERNO: "http://minio-interno:9000" })) vi.stubEnv(k, v);
    // Sem rede no teste: o erro de DNS mostra para qual endereço o SDK foi.
    const r = armazenamentoS3().conferir("fotos/a.jpg");
    await expect(r).rejects.toThrow(/minio-interno/);
  });
});
