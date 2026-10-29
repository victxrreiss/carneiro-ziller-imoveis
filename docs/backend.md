# Backend: setup local e variáveis

O site e o painel usam **PostgreSQL** (Drizzle ORM), fotos no **Vercel Blob** ou em qualquer armazenamento **compatível com S3** (upload direto do navegador) e e-mail por **SMTP**. Em produção, na Vercel, a stack padrão é Neon + Vercel Blob, conectados pelo painel da Vercel. Como colocar no ar: [`backend-pendencias.md`](backend-pendencias.md). Localmente, tudo roda em Docker.

## Subir o ambiente local

Requisitos: Node 22+, Docker.

```bash
npm install
cp .env.example .env.local     # valores do Docker local
npm run db:subir               # Postgres 17, S3 local (MinIO) e Mailpit; cria os buckets
# Portas do host ocupadas por outro projeto? Defina CZ_PORTA_BANCO, CZ_PORTA_S3, CZ_PORTA_S3_CONSOLE, CZ_PORTA_SMTP e CZ_PORTA_MAILPIT em `.env` (padrões: 5432, 9000, 9001, 1025, 8025) e ajuste `.env.local` às mesmas portas.
npm run db:migrar              # aplica drizzle/*.sql
npm run admin:criar -- --nome "Seu Nome" --email "voce@dominio.com"   # imprime o link para definir a senha
npm run db:semente             # opcional: 35 imóveis de exemplo + fotos (exige o ADMIN acima)
npm run dev
```

- Caixa de e-mail local (convites, redefinição): http://localhost:8025
- Console do S3 local: http://localhost:9001 (`czlocal` / `czlocal-secret`)
- O ADMIN abre o link impresso pelo `admin:criar`, define a senha em "Definir senha" e entra em `/painel/entrar`.
- Quem cria os demais usuários é o ADMIN, pelo painel (convite por e-mail). Só existe **um** ADMIN.

## Comandos

| Comando | O que faz |
|---|---|
| `npm run db:subir` | `docker compose up` + cria os buckets locais (`cz-dev`, `cz-e2e`) com leitura pública |
| `npm run db:migrar` | Aplica as migrations (local ou produção; usa `DATABASE_URL_DIRETA` se existir) |
| `npm run db:gerar` | Gera nova migration SQL a partir de `src/lib/dados/esquema.ts` |
| `npm run db:semente` | Só local: importa os imóveis de exemplo. Recusa produção e qualquer banco/S3 fora de `localhost` |
| `npm run admin:criar` | Cria o único ADMIN e imprime o link de convite (72 h). Recusa se já houver ADMIN |
| `npm run loft:importar` | Importa os imóveis da Loft (`--feed <url\|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email>`; `--simular` só mostra o resumo). Idempotente; grava `relatorio-loft-<data>.json`. Em produção: `deploy/deploy.sh importar-loft` (veja `deploy/README.md`) |
| `npm run fotos:limpar` | Apaga fotos órfãs (não confirmadas ou sem imóvel, com mais de 24 h), sessões/links vencidos e limites antigos. Na Vercel roda sozinho todo dia (`vercel.json` → `/api/cron/limpeza`) |
| `vercel-build` | Usado pela Vercel no lugar de `build`: `scripts/implantar.ts` (migrations; em produção, ADMIN inicial) + `next build` |
| `npm run e2e:preparar` | Zera e prepara o banco `cz_e2e` e o bucket `cz-e2e` (usado pelo `test:e2e`) |
| `npm test` | Vitest sobre PGlite (Postgres em memória) |
| `npm run test:e2e` | Playwright contra Postgres, S3 e Mailpit do Docker (exige `npm run db:subir`) |

Os scripts leem `.env.local` e `.env` como o Next faz.

## Variáveis de ambiente

Banco, fotos e endereço do site são obrigatórios em produção: faltando, o servidor não sobe e o log lista o que falta (`src/instrumentation.ts`). Sem e-mail o site sobe, com alerta `[config]` no log.

| Variável | Quem define | Descrição |
|---|---|---|
| `DATABASE_URL` | integração Neon | Postgres com pooler. Também usada no **build** |
| `DATABASE_URL_UNPOOLED` | integração Neon | Sem pooler: migrations e scripts |
| `DATABASE_URL_DIRETA` | opcional | Sobrepõe a anterior (outros fornecedores) |
| `DATABASE_POOL_MAX` | opcional | Conexões por instância (padrão 2 em produção) |
| `BLOB_READ_WRITE_TOKEN` | integração Vercel Blob | Fotos no Blob; com ele, as variáveis S3 são ignoradas |
| `S3_ENDPOINT`, `S3_REGIAO`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE` | sem Blob | Armazenamento S3 (local: MinIO) |
| `FOTOS_URL_PUBLICA` | S3 (obrigatória); Blob (opcional) | URL pública das fotos, sem barra no fim. Lida no **build** |
| `SMTP_HOST`, `SMTP_PORTA`, `SMTP_SEGURO`, `SMTP_USUARIO`, `SMTP_SENHA`, `EMAIL_DE` | você | SMTP (valores da Resend em `backend-pendencias.md`) |
| `SITE_URL` | opcional na Vercel | Links dos e-mails. Sem ela: domínio de produção do projeto (`VERCEL_PROJECT_PRODUCTION_URL`) ou da branch, em preview |
| `ADMIN_INICIAL_NOME`, `ADMIN_INICIAL_EMAIL` | você (Production) | O deploy cria o único ADMIN e envia o convite |
| `LEADS_EMAIL` | opcional | Destinos extras dos avisos de interesse |
| `CRON_SECRET` | opcional | Protege o cron de limpeza |
| `MIGRAR_NO_PREVIEW` | opcional | `true` aplica migrations também em preview (banco de preview próprio) |
| `IMAGENS_HOST_LOCAL` | **nunca em produção** | `true` só localmente, para o `next/image` aceitar fotos em `localhost` |

## Como o upload de fotos funciona

1. O navegador envia `POST /painel/fotos` com tipo, tamanho e dimensões (sem o arquivo). Recebe uma permissão de envio de 5 min, presa à chave, ao tipo e ao tamanho: um token de cliente do Vercel Blob ou uma URL assinada de `PUT` do S3.
2. Envia o arquivo direto ao armazenamento (a barra de progresso da tela é preservada).
3. Chama `POST /painel/fotos/[id]/confirmar`: o servidor confere tamanho, tipo e assinatura (magic bytes) do objeto; se algo não bater, apaga o objeto.
4. `salvarImovel` só aceita foto **confirmada** e enviada por quem está salvando (ou já ligada ao imóvel).

## Formulário de interesse (leads)

`POST /api/interesses` revalida os dados e aceita só imóvel publicado. Limita 10 envios por hora por IP; guarda só o hash do IP. Grava em `interesses` e, depois de responder, avisa por e-mail o corretor responsável (se ativo), o ADMIN e `LEADS_EMAIL`. Falha no e-mail não perde o lead: o erro vai para o log.

## Regras que não mudam

Permissões continuam em `src/lib/painel/regras.ts` e são conferidas no servidor em cada ação. Nenhuma senha, hash ou token fica no código, em semente, em teste versionado ou em `.env` versionado: senhas de teste são geradas na execução e o primeiro ADMIN nasce por `admin:criar`.
