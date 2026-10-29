# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

The Next.js here (16.x, with `cacheComponents` and `partialPrefetching` turned on in `next.config.ts`) is newer than your training data. Read the guides in `node_modules/next/dist/docs/` before you use an API you aren't sure of.

## Project

This is the public website of Carneiro & Ziller Imóveis, a real-estate agency in Belo Horizonte and Nova Lima, plus `/painel`, an admin panel where the team manages properties and users. The site is the source of truth for properties. GranCRM will receive data from the site later, and never the other way round. The code, comments, identifiers, UI text and commit messages are in **Brazilian Portuguese**. Keep them that way.

The backend docs are `docs/backend.md` (local setup, env vars, how photo upload works) and `docs/superpowers/specs/2026-10-26-backend-design.md`. `docs/backend-pendencias.md` describes the Vercel deploy that was originally planned. Production actually runs on the Gran VPS: see Deploy below.

## Commands

```bash
cp .env.example .env.local   # once; next.config.ts throws without photo-storage env
npm run db:subir             # local Postgres, MinIO (S3) and Mailpit via docker-compose.yml
npm run db:migrar            # apply drizzle/*.sql
npm run admin:criar -- --nome "Nome" --email "a@b.com"   # the single ADMIN; prints the set-password link
npm run db:semente           # local only: the 35 sample properties (refuses non-localhost)
npm run dev
npm run db:gerar             # new migration from src/lib/dados/esquema.ts
npm run lint
npm run typecheck            # next typegen && tsc --noEmit
npm test                     # vitest; the DB is PGlite in memory, so no Docker needed
npx vitest run scripts/importar-imoveis.test.ts   # one file
npx vitest run -t "nome do teste"
npm run test:e2e             # playwright; needs `npm run db:subir` (uses the cz_e2e DB and cz-e2e bucket)
```

Note: the MinIO image pinned in the local `docker-compose.yml` (`minio/minio:RELEASE.2025-04-22…`) can no longer be pulled from Docker Hub. Production uses `cgr.dev/chainguard/minio`.

## Architecture

- **Routes:** `/` (Home), `/imoveis` (the property grid with filters and pagination), `/imovel/[id]` (the property page) and `/painel/*`. `/contato`, `/sobre` and `/politica-de-privacidade` are linked but don't exist yet. Every URL is built in `src/lib/routes.ts` (`routes` for the site, `painel` for the panel), so never hard-code paths. "Lançamentos" isn't a separate page. It is `/imoveis?finalidade=lancamentos`.
- **Data:** PostgreSQL through Drizzle. The schema is in `src/lib/dados/esquema.ts` and migrations in `drizzle/`. `src/lib/config.ts` reads and validates every env var, and `src/instrumentation.ts` refuses to boot in production if the DB, photo storage or `SITE_URL` is missing.
- **Public catalogue:** `src/lib/imoveis/index.ts` is the only entry point for the site. It wraps `catalogo.ts` in `"use cache"` with `cacheTag(TAG_IMOVEIS)` and a finite `cacheLife`. Panel actions invalidate that tag when a property is saved, published or deleted. `next build` reads the DB to prerender, so a build needs a reachable, migrated database. `obterImovel` returns a `ResultadoImovel` union (`disponivel` / `indisponivel` / `inexistente`).
- **Panel:** `src/app/painel/` (route groups `(acesso)` and `(app)`, server actions in `_acoes/`). The domain logic is in `src/lib/painel/`. Permissions live in `regras.ts` and are checked on the server in every action. There is exactly one ADMIN, who invites brokers ("corretores") by e-mail; a broker can edit only their own properties. Sessions and argon2 passwords are in `contas.ts`, `sessao.ts` and `src/lib/seguranca/`.
- **Photos:** S3-compatible storage or Vercel Blob (`src/lib/armazenamento/`). The browser uploads straight to storage with a short-lived presigned PUT. Then `POST /painel/fotos/[id]/confirmar` checks the size, type and magic bytes. The DB stores only the key, and the public URL is `FOTOS_URL_PUBLICA` + key. `FOTOS_URL_PUBLICA` is read at build time for `images.remotePatterns`.
- **Leads:** `POST /api/interesses` → `registrarInteresse` (`src/lib/interesse/servidor.ts`). It validates again, limits sends per IP (only a hash of the IP is stored), writes to the `interesses` table, then e-mails the responsible broker, the ADMIN and `LEADS_EMAIL` inside `after()`. The planned n8n webhook / GranCRM integration also goes after the insert.
- **Filters live in the URL:** `src/lib/imoveis/filtros.ts` (`lerFiltros` validates and drops unknown values; `urlGrid` builds the URL). The filter values (`comprar|alugar|lancamentos`) differ from the domain `Finalidade`, and `finalidadeDoFiltro` maps between them.
- **Back to results:** cards link to `/imovel/<id>?de=<grid querystring>`. `contextoVolta` re-validates `de`, and `src/lib/navegacao/retorno.ts` goes back through browser history when the visitor really came from that grid.
- **Pages with dynamic data** wrap their content in `<Suspense>` with a skeleton fallback. Under `cacheComponents`, `await searchParams`/`params` must happen inside the suspended child.
- Scripts in `scripts/` run with `tsx --conditions=react-server` and load `.env.local`/`.env` (variables already in the environment win). The destructive ones (`db:semente`, the `s3-local` helpers) refuse anything that isn't `localhost`. Remember that an SSH tunnel also looks like localhost.

## Deploy (production = shared Gran VPS)

The full runbook is `deploy/README.md`. In short:
- It runs on `ssh granconsultoria.vps` as three containers: `carneiro-ziller-site`, `-db` and `-s3` (MinIO), defined in `deploy/docker-compose.vps.yml`, behind the shared `nginx-proxy` (vhost template in `deploy/nginx/`). The temporary domain is `carneiroziller.granconsultoria.com.br` and is `noindex`.
- `deploy/deploy.sh` runs **on the dev machine**. It opens an SSH tunnel to the VPS's loopback-only DB/S3 ports, migrates, then `docker build --network host` (the build reads the production DB, and secrets go in as a BuildKit secret), and ships the image with `docker save | ssh docker load`. The VPS never builds and holds no source code. Other modes: `deploy.sh admin "Nome" email` and `deploy.sh exemplos`.
- Photos are served from the site's own origin at `/cz-fotos/`, which nginx proxies to MinIO unchanged so S3 signatures stay valid. `S3_ENDPOINT` is therefore `SITE_URL`.
- The VPS is shared with other clients. Always run `nginx -t` before reloading, and never run bulk deletes against the bucket or the DB.

## Styling (three systems)

- The **Home** (`src/components/home/`, `layout/Header`, `layout/UtilityBar`) uses **Tailwind v4**, with tokens in `@theme` in `src/app/globals.css`.
- The **grid and property pages** and the shared chrome (`SiteChrome`) use plain CSS from the design handoff (`src/styles/cz-site.css`, `cz-imovel.css`), scoped under `.cz`.
- The **panel** uses `src/styles/cz-painel.css`.

## Design handoff and specs

- The visual source of truth is the Claude Design handoff (`docs/handoff/`, `carneiro-ziller-site-handoff/`). It is **gitignored and may not be present**. Code comments cite its "Lacunas" (gaps).
- Decisions are recorded in `docs/superpowers/specs/` and `plans/`. Comments marked "decisão do usuário" record choices the client made. Don't undo them.
- The sample properties and their photo dimensions are in `scripts/semente-imoveis.ts`. Production started with three of them (`EXEMPLOS` in `scripts/vps-exemplos.ts`).

## Tests

- Vitest sits next to the code as `*.test.ts(x)`, and also under `scripts/`. `src/lib/dados/testes.ts` gives each file a PGlite DB with the migrations applied and seeded users.
- The E2E tests (`e2e/`) check behaviour (no horizontal scroll, the drawer menu below 900px, navigation, axe WCAG 2 A/AA, and panel flows in `painel.spec.ts`). Keep the accessible names they rely on stable.
