// @vitest-environment node
import { getPayloadFromClientToken } from "@vercel/blob/client";
import { afterEach, beforeEach, describe, expect, test } from "vitest";
import { armazenamentoBlob } from "./index";

const TOKEN = "vercel_blob_rw_LojaTeste1_segredoDeTesteNaoReal";

describe("Vercel Blob", () => {
  beforeEach(() => {
    process.env.BLOB_READ_WRITE_TOKEN = TOKEN;
  });
  afterEach(() => {
    delete process.env.BLOB_READ_WRITE_TOKEN;
  });

  test("o token de cliente só permite a chave, o tipo e o tamanho declarados, por pouco tempo", async () => {
    const antes = Date.now();
    const envio = await armazenamentoBlob().urlDeEnvio({ chave: "fotos/abc.jpg", tipo: "image/jpeg", tamanho: 1234 });
    expect(envio.modo).toBe("vercel-blob");
    if (envio.modo !== "vercel-blob") return;
    expect(envio.chave).toBe("fotos/abc.jpg");
    const carga = getPayloadFromClientToken(envio.token);
    expect(carga.pathname).toBe("fotos/abc.jpg");
    expect(carga.allowedContentTypes).toEqual(["image/jpeg"]);
    expect(carga.maximumSizeInBytes).toBe(1234);
    expect(carga.addRandomSuffix).toBe(false);
    expect(carga.allowOverwrite).toBe(false);
    expect(carga.validUntil).toBeGreaterThan(antes);
    expect(carga.validUntil).toBeLessThanOrEqual(Date.now() + 5 * 60_000);
  });

  test("URL pública vem da loja do token", () => {
    expect(armazenamentoBlob().urlPublica("fotos/abc.jpg")).toBe("https://lojateste1.public.blob.vercel-storage.com/fotos/abc.jpg");
  });
});
