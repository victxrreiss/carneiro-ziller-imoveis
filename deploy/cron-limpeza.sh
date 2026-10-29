#!/usr/bin/env bash
# Limpeza diária (fotos órfãs, sessões e links vencidos), que na Vercel era o cron
# do vercel.json. Chama o contêiner por dentro: /api/cron/ não é exposto no nginx.
set -euo pipefail
docker exec carneiro-ziller-site node -e '
fetch("http://127.0.0.1:3000/api/cron/limpeza", { headers: { authorization: `Bearer ${process.env.CRON_SECRET}` } })
  .then(async (r) => { console.log(new Date().toISOString(), r.status, await r.text()); process.exit(r.ok ? 0 : 1); })
  .catch((e) => { console.error(e); process.exit(1); });'
