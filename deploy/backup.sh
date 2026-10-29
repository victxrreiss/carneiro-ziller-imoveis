#!/usr/bin/env bash
# Backup diário da Carneiro & Ziller na VPS (crontab, ver deploy/README.md):
# banco (pg_dump) e fotos (volume do MinIO). Guarda os últimos 14 dias.
set -euo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
DEST="$DIR/backups"
DIA="$(date +%F)"
mkdir -p "$DEST"
chmod 700 "$DEST"

docker exec carneiro-ziller-db pg_dump -U cz -d carneiro_ziller --no-owner | gzip > "$DEST/banco-$DIA.sql.gz.tmp"
mv "$DEST/banco-$DIA.sql.gz.tmp" "$DEST/banco-$DIA.sql.gz"

docker run --rm -v carneiro-ziller_fotos:/fotos:ro alpine tar -C /fotos -czf - . > "$DEST/fotos-$DIA.tar.gz.tmp"
mv "$DEST/fotos-$DIA.tar.gz.tmp" "$DEST/fotos-$DIA.tar.gz"

chmod 600 "$DEST"/*.gz
ls -1t "$DEST"/banco-*.sql.gz | tail -n +15 | xargs -r rm --
ls -1t "$DEST"/fotos-*.tar.gz | tail -n +15 | xargs -r rm --
echo "$(date -Is) backup ok: $(du -sh "$DEST" | cut -f1)"
