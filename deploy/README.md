# Deploy na VPS da Gran

Produção roda na VPS compartilhada da Gran Consultoria (`ssh granconsultoria.vps`), no
lugar da Vercel prevista em `docs/backend-pendencias.md`. O código é o mesmo: a
diferença é só de onde vêm o banco e as fotos.

| Peça | Na VPS |
|---|---|
| Site + painel | contêiner `carneiro-ziller-site` (Next standalone), na `proxy-network` |
| Banco | `carneiro-ziller-db` (Postgres 17), volume `carneiro-ziller_banco`, porta só em `127.0.0.1:15433` |
| Fotos | `carneiro-ziller-s3` (MinIO, imagem da Chainguard), bucket `cz-fotos`, volume `carneiro-ziller_fotos`, porta só em `127.0.0.1:19010` |
| HTTPS | Cloudflare + `nginx-proxy` (`~/projetos/nginx/conf.d/carneiro-ziller.conf`, modelo em `deploy/nginx/`) |
| E-mail | SMTP opcional no `.env` (ainda sem conta: convites e avisos não saem) |
| Cron | `backup.sh` (03:25) e `cron-limpeza.sh` (06:17) no crontab do usuário `granconsultoria` |

Na VPS, em `~/projetos/clientes/carneiro-ziller/site/`, ficam só `docker-compose.yml`
(cópia de `deploy/docker-compose.vps.yml`), `.env` (600, nunca versionado),
`backup.sh`, `cron-limpeza.sh` e `backups/`. Não fica código-fonte.

## Como as fotos funcionam aqui

O bucket fica no mesmo domínio do site, em `/cz-fotos/`: o nginx-proxy repassa esse caminho ao MinIO sem reescrever nada e com o Host original, porque a assinatura S3 cobre os dois. Assim:
- `S3_ENDPOINT` do site é o próprio `SITE_URL`. A URL assinada que o painel entrega ao navegador já é pública, e como a origem é a mesma não precisa de CORS.
- A leitura é pública (`FOTOS_URL_PUBLICA=$SITE_URL/cz-fotos`). Listar o bucket e mandar um PUT sem assinatura dão 403. O nginx só deixa passar GET, HEAD e PUT.
- `/api/cron/` dá 404 de fora. A limpeza chama o contêiner por dentro.

## Atualizar o site

Na máquina do dev, com Docker e `npm ci` feitos:

```bash
deploy/deploy.sh
```

O script:
1. copia o compose e os scripts para a VPS e sobe o banco e o S3;
2. lê o `.env` da VPS e abre um túnel SSH para as portas 15433/19010;
3. pelo túnel, aplica as migrations e garante o bucket (`npm run vps:preparar`);
4. roda `docker build --network host`: o `next build` lê o banco de produção pelo túnel para pré-renderizar o catálogo (os segredos entram como build secret, nunca numa camada da imagem);
5. envia a imagem (`docker save | ssh docker load`) e recria só o `site`.

A VPS não compila nada (2 vCPU divididos entre os clientes).

Outros comandos, também pelo túnel:

```bash
deploy/deploy.sh admin "Nome Completo" email@dominio.com   # cria o único ADMIN e imprime o link (72 h)
deploy/deploy.sh exemplos                                  # 3 imóveis de exemplo; só com o banco vazio
```

## Primeira instalação (já feita em 2026-10-28)

1. DNS na Cloudflare: registro A `carneiroziller` → `31.97.175.225`, proxy ligado.
2. `.env` na VPS a partir de `deploy/vps.env.example`, com os segredos gerados lá (`openssl rand -hex 32`).
3. `deploy/deploy.sh`, depois `deploy/deploy.sh admin ...` e `deploy/deploy.sh exemplos`.
4. nginx: copiar `deploy/nginx/carneiro-ziller.conf` para `~/projetos/nginx/conf.d/` e recarregar. **Sempre `nginx -t` antes**, porque um erro derruba o reload de todos os clientes:
   ```bash
   docker exec nginx-proxy nginx -t && docker exec nginx-proxy nginx -s reload
   ```
5. crontab (`crontab -e` na VPS):
   ```
   # Carneiro & Ziller — backup diário (banco + fotos, 14 dias) e limpeza de fotos órfãs/sessões vencidas
   25 3 * * * /home/granconsultoria/projetos/clientes/carneiro-ziller/site/backup.sh >> /home/granconsultoria/projetos/clientes/carneiro-ziller/site/backups/backup.log 2>&1
   17 6 * * * /home/granconsultoria/projetos/clientes/carneiro-ziller/site/cron-limpeza.sh >> /home/granconsultoria/projetos/clientes/carneiro-ziller/site/backups/limpeza.log 2>&1
   ```

## Ligar o e-mail

Descomente e preencha o bloco SMTP do `.env` na VPS (Resend: `docs/backend-pendencias.md`, passo 3) e recrie o site:

```bash
ssh granconsultoria.vps 'cd ~/projetos/clientes/carneiro-ziller/site && docker compose up -d site'
```

Sem SMTP, o log mostra o alerta `[config]` e o ADMIN não consegue convidar corretores por e-mail.

## Trocar para o domínio do cliente

1. Cloudflare do cliente: registro A → `31.97.175.225` (proxy ligado), SSL/TLS **Full (strict)**, e um Origin Certificate salvo em `~/projetos/nginx/ssl/carneiro-ziller.{crt,key}` (`chmod 600` na chave).
2. `.env` da VPS: `SITE_URL` e `SITE_DOMINIO` com o domínio novo.
3. `deploy/nginx/carneiro-ziller.conf`: `server_name` novo, certificado `carneiro-ziller.crt/key`, **remover o `X-Robots-Tag`**, e um `server` para o temporário com `return 301 https://DOMINIO$request_uri;`. Depois `nginx -t` e reload.
4. `deploy/deploy.sh`. `SITE_URL` e `FOTOS_URL_PUBLICA` entram no build.

As fotos já gravadas continuam valendo: o banco guarda só a chave (`fotos/<id>.jpg`), e a URL é montada com o `FOTOS_URL_PUBLICA` atual.

## Restaurar um backup

```bash
ssh granconsultoria.vps
cd ~/projetos/clientes/carneiro-ziller/site
gunzip -c backups/banco-AAAA-MM-DD.sql.gz | docker exec -i carneiro-ziller-db psql -U cz -d carneiro_ziller   # em banco vazio
docker run --rm -i -v carneiro-ziller_fotos:/fotos alpine tar -C /fotos -xzf - < backups/fotos-AAAA-MM-DD.tar.gz
```

## Diagnóstico

```bash
ssh granconsultoria.vps 'docker logs --tail 100 carneiro-ziller-site'
ssh granconsultoria.vps 'docker exec nginx-proxy tail -50 /var/log/nginx/carneiro-ziller_error.log'
ssh granconsultoria.vps 'tail ~/projetos/clientes/carneiro-ziller/site/backups/*.log'
```
