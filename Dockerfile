# Site + painel em produção na VPS da Gran (deploy/docker-compose.vps.yml).
# Construído na máquina do dev por deploy/deploy.sh: o `next build` lê o banco de
# produção (pelo túnel SSH, por isso `--network host`) para pré-renderizar o catálogo.
# Debian (glibc), não Alpine: o sharp do next/image usa o binário pronto.
FROM node:24-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Lidas no build: SITE_URL (metadataBase) e FOTOS_URL_PUBLICA (remotePatterns do next/image).
ARG SITE_URL
ARG FOTOS_URL_PUBLICA
ENV NEXT_TELEMETRY_DISABLED=1
RUN test -n "$SITE_URL" && test -n "$FOTOS_URL_PUBLICA" || (echo "Faltam --build-arg SITE_URL e FOTOS_URL_PUBLICA" && exit 1)
# O .env de produção chega como secret: não fica em camada nem no histórico da imagem.
RUN --mount=type=secret,id=env,required=true \
    set -a && . /run/secrets/env && set +a && npm run build

FROM node:24-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production NEXT_TELEMETRY_DISABLED=1 HOSTNAME=0.0.0.0 PORT=3000
COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public
USER node
EXPOSE 3000
CMD ["node", "server.js"]
