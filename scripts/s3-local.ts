// Buckets do armazenamento S3 LOCAL: criação e limpeza. Só para desenvolvimento e e2e.
import {
  CreateBucketCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutBucketPolicyCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { configS3 } from "../src/lib/config";
import { hostLocal } from "./guardas";

function cliente() {
  const c = configS3();
  if (!hostLocal(c.endpoint)) throw new Error("Este comando só mexe em armazenamento local (S3_ENDPOINT em localhost).");
  return {
    c,
    s3: new S3Client({ endpoint: c.endpoint, region: c.regiao, forcePathStyle: c.forcePathStyle, credentials: { accessKeyId: c.accessKeyId, secretAccessKey: c.secretAccessKey } }),
  };
}

/** Cria o bucket (se faltar) com leitura pública, como o bucket de produção. */
export async function garantirBucketPublico(bucket: string): Promise<void> {
  const { s3 } = cliente();
  try {
    await s3.send(new CreateBucketCommand({ Bucket: bucket }));
  } catch (e) {
    const nome = (e as { name?: string }).name;
    if (nome !== "BucketAlreadyOwnedByYou" && nome !== "BucketAlreadyExists") throw e;
  }
  const politica = {
    Version: "2012-10-17",
    Statement: [{ Effect: "Allow", Principal: "*", Action: ["s3:GetObject"], Resource: [`arn:aws:s3:::${bucket}/*`] }],
  };
  await s3.send(new PutBucketPolicyCommand({ Bucket: bucket, Policy: JSON.stringify(politica) }));
}

/** Apaga todos os objetos do bucket configurado (S3_BUCKET). */
export async function esvaziarBucket(): Promise<number> {
  const { c, s3 } = cliente();
  let total = 0;
  let token: string | undefined;
  do {
    const r = await s3.send(new ListObjectsV2Command({ Bucket: c.bucket, ContinuationToken: token }));
    const chaves = (r.Contents ?? []).map((o) => ({ Key: o.Key! }));
    if (chaves.length) await s3.send(new DeleteObjectsCommand({ Bucket: c.bucket, Delete: { Objects: chaves, Quiet: true } }));
    total += chaves.length;
    token = r.IsTruncated ? r.NextContinuationToken : undefined;
  } while (token);
  return total;
}
