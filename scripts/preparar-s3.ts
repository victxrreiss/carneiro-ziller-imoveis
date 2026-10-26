// Parte de `npm run db:subir`: cria os buckets locais (dev e e2e) com leitura pública.
import "./ambiente";
import { garantirBucketPublico } from "./s3-local";

async function main() {
  for (const bucket of [process.env.S3_BUCKET || "cz-dev", "cz-e2e"]) {
    await garantirBucketPublico(bucket);
    console.log(`Bucket pronto: ${bucket}`);
  }
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
