#!/usr/bin/env bash
# Deploy da Carneiro & Ziller na VPS da Gran, rodado na máquina do dev.
#
#   deploy/deploy.sh                       sobe/atualiza tudo (migrations + build + site)
#   deploy/deploy.sh admin "Nome" email    cria o único ADMIN e imprime o link de senha
#   deploy/deploy.sh exemplos              importa os 3 imóveis de exemplo (banco vazio)
#   deploy/deploy.sh importar-loft --feed <url|arquivo> --ativos <csv> --pendentes <csv> \
#                    --responsavel <email> [--simular]   importa os imóveis da Loft
#
# Banco e S3 da VPS só escutam em 127.0.0.1; um túnel SSH os traz para as mesmas
# portas aqui. Por ele rodam as migrations, o bucket e o `next build`, que lê o banco
# para pré-renderizar o catálogo. A VPS não compila nada (2 vCPU divididos).
# Os segredos ficam no .env da VPS: são lidos para a memória e um arquivo temporário
# (600, apagado ao sair) que entra no build como secret.
set -euo pipefail

VPS="${VPS:-granconsultoria.vps}"
DESTINO="${DESTINO:-/home/granconsultoria/projetos/clientes/carneiro-ziller/site}"
IMAGEM=carneiro-ziller-site:latest
PORTA_BANCO=15433
PORTA_S3=19010

cd "$(dirname "$0")/.."
TMP="$(mktemp -d)"
chmod 700 "$TMP"
TUNEL="$TMP/tunel.sock"
fechar() {
  ssh -S "$TUNEL" -O exit "$VPS" 2>/dev/null || true
  rm -rf "$TMP"
}
trap fechar EXIT

remoto() { ssh "$VPS" "cd '$DESTINO' && $*"; }

preparar_vps() {
  ssh "$VPS" "mkdir -p '$DESTINO'"
  scp -q deploy/docker-compose.vps.yml "$VPS:$DESTINO/docker-compose.yml"
  scp -q deploy/backup.sh deploy/cron-limpeza.sh deploy/vps.env.example "$VPS:$DESTINO/"
  remoto "test -f .env" || { echo "Falta $DESTINO/.env na VPS: copie o vps.env.example e preencha."; exit 1; }
  remoto "docker compose up -d --wait db s3"
}

carregar_env() {
  ssh "$VPS" "cat '$DESTINO/.env'" > "$TMP/vps.env"
  set -a
  # shellcheck disable=SC1091
  . "$TMP/vps.env"
  set +a
  # Para os scripts e o build, banco e S3 estão no túnel.
  export NODE_ENV=production
  export DATABASE_URL="postgres://cz:${POSTGRES_PASSWORD}@127.0.0.1:${PORTA_BANCO}/carneiro_ziller"
  export S3_ENDPOINT="http://127.0.0.1:${PORTA_S3}" S3_REGIAO=us-east-1 S3_BUCKET=cz-fotos S3_FORCE_PATH_STYLE=true
  export FOTOS_URL_PUBLICA="${SITE_URL}/cz-fotos"
}

abrir_tunel() {
  ssh -f -N -M -S "$TUNEL" -o ExitOnForwardFailure=yes \
    -L "127.0.0.1:${PORTA_BANCO}:127.0.0.1:${PORTA_BANCO}" \
    -L "127.0.0.1:${PORTA_S3}:127.0.0.1:${PORTA_S3}" "$VPS"
}

implantar() {
  preparar_vps
  carregar_env
  abrir_tunel
  npm run -s vps:preparar

  env | grep -E '^(NODE_ENV|DATABASE_URL|SITE_URL|FOTOS_URL_PUBLICA|S3_[A-Z_]+|CRON_SECRET)=' > "$TMP/build.env"
  chmod 600 "$TMP/build.env"
  docker build --network host --secret "id=env,src=$TMP/build.env" \
    --build-arg SITE_URL="$SITE_URL" --build-arg FOTOS_URL_PUBLICA="$FOTOS_URL_PUBLICA" -t "$IMAGEM" .

  docker save "$IMAGEM" | gzip | ssh "$VPS" 'gunzip | docker load'
  remoto "docker compose up -d --wait site && docker image prune -f >/dev/null"
  echo "Pronto: $SITE_URL  (logs: ssh $VPS 'docker logs -f carneiro-ziller-site')"
}

case "${1:-implantar}" in
  implantar) implantar ;;
  admin)
    [ $# -eq 3 ] || { echo 'Uso: deploy/deploy.sh admin "Nome Completo" email@dominio.com'; exit 1; }
    carregar_env
    abrir_tunel
    npm run -s admin:criar -- --nome "$2" --email "$3"
    ;;
  exemplos)
    carregar_env
    abrir_tunel
    npm run -s vps:exemplos
    ;;
  importar-loft)
    shift
    carregar_env
    abrir_tunel
    # Sem `set -e` no comando: a lembrança abaixo vale mesmo com fotos que falharam (saída 2).
    status=0
    npm run -s loft:importar -- "$@" || status=$?
    case " $* " in
      *" --simular "*) ;;
      *) echo "Lembrete: rode deploy/deploy.sh para regenerar as páginas (o cache do catálogo também expira sozinho em até 5 min)." ;;
    esac
    exit "$status"
    ;;
  *) echo "Comando desconhecido: $1 (use implantar, admin, exemplos ou importar-loft)"; exit 1 ;;
esac
