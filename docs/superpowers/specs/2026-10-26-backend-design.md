# Backend do site e do painel — design

Data: 2026-10-26 · Branch base: `develop` · Revisado em 2026-10-26

## Intenção

O site e o painel já funcionam de ponta a ponta, mas sobre uma base em memória
(`src/lib/dados/banco.ts`): reiniciar o servidor apaga tudo, e na Vercel cada
instância teria a sua própria cópia. As contas do painel nascem de uma semente
com senha fixa no código (`SENHA_DEMO` em `src/lib/dados/semente.ts`, repetida
em `e2e/painel.spec.ts`).

O objetivo é trocar essa base por um banco persistente, sem nenhuma credencial
no código, mantendo o comportamento que as telas já têm — e deixar o **mínimo
possível** para o outro dev, que vai escolher os fornecedores de infraestrutura.
Para isso, tudo que depende de fornecedor usa um **protocolo padrão** (Postgres,
S3, SMTP): o outro dev escolhe o serviço e preenche variáveis de ambiente, sem
escrever código.

**Regra do usuário, inegociável:** nenhum login (e-mail + senha, hash de senha,
token) fica registrado no código, em semente, em teste versionado ou em `.env`
versionado.

## Contas e permissões (confirmado pelo usuário)

- **Admin** — conta principal, única. Cadastra, edita e exclui qualquer imóvel,
  de qualquer responsável. Cria as contas de colaborador.
- **Colaborador (Corretor)** — criado pelo Admin. Cadastra imóveis e edita só os
  que têm ele como responsável. Não exclui e não gerencia usuários.

Já implementado em `src/lib/painel/regras.ts` (`podeEditar`, `ehAdmin`) e
conferido no servidor em cada ação; o backend preserva essas regras sem mudança.
Continuam como estão: o Corretor vê todos os imóveis na lista do painel e edita
só os dele; reatribuir responsável e escolher a Oportunidade de hoje são do
Admin; o Corretor publica direto, sem aprovação.

## Objetivos

1. Persistir em Postgres tudo o que hoje está no `Map`: imóveis, fotos
   (metadados), usuários, sessões, links de senha, tentativas de login e a
   Oportunidade de hoje.
2. Remover do código e dos testes toda senha e conta fixa.
3. Criar o primeiro Admin sem credencial no código.
4. Trocar o hash de senha de scrypt para **argon2id** (o contrato do usuário
   exige bcrypt ou argon2).
5. Fotos em armazenamento **compatível com S3**, com upload direto do navegador
   ao armazenamento (contorna o limite de 4,5 MB das funções da Vercel).
6. E-mail por **SMTP**.
7. Ambiente local completo em Docker (Postgres + S3 local + caixa de e-mail
   local), para dev e e2e exercitarem o mesmo código de produção.
8. **Relatório de pendências** curto para o outro dev.

## Fora do escopo

- **Escolha de fornecedor** de Postgres, armazenamento e e-mail, criação das
  contas nesses serviços e DNS do domínio remetente — do outro dev (relatório).
- **Formulário de interesse / leads** (`POST /api/interesses`): destino é do
  outro dev. A tela continua mostrando o estado de falha até ele existir.
- Supabase Auth ou serviço externo de autenticação: o usuário decidiu manter o
  login próprio.
- Qualquer mudança visual ou fluxo novo de tela.
- Importar dados para produção: **produção começa vazia** (decisão do usuário).
- Deploy em produção.

## Anti-objetivos

- Senha, hash ou token aparecendo em código, log de produção ou repositório.
- Regras de permissão migrando para a tela ou para o banco — continuam em
  `lib/painel`, conferidas em toda ação.
- SDK de fornecedor específico (Supabase, Neon, Vercel Blob, Resend) no código.
- Em produção, falhar em silêncio: sem configuração, a operação responde erro
  claro e a aplicação avisa na inicialização qual variável falta.

## Decisões técnicas

| Assunto | Decisão | De quem |
|---|---|---|
| Motor do banco | PostgreSQL, qualquer provedor via `DATABASE_URL` | minha; as duas opções mostradas ao usuário eram Postgres |
| Acesso ao banco | Drizzle ORM + `drizzle-kit`, migrations SQL versionadas em `drizzle/` | minha |
| Driver | `postgres` (postgres-js) em dev/e2e/produção; PGlite nos testes Vitest | minha |
| Login | o próprio, já construído | **usuário** |
| Hash de senha | argon2id via `@node-rs/argon2` | minha, seguindo o contrato |
| Fotos | API S3 (`@aws-sdk/client-s3` + `@aws-sdk/s3-request-presigner`), URL assinada para upload | minha; fornecedor é do outro dev |
| E-mail | SMTP via `nodemailer` | minha; fornecedor é do outro dev |
| Local | `docker-compose.yml`: Postgres 17, servidor S3 local, Mailpit | minha |
| Dados iniciais em produção | vazio | **usuário** |

Cobertura dos padrões escolhidos: S3 funciona com Supabase Storage, Cloudflare
R2, AWS S3, Backblaze B2, MinIO. SMTP funciona com Resend, Google Workspace,
Amazon SES, Postmark, SendGrid. A única opção comum **não** coberta é o Vercel
Blob (API própria); se o outro dev escolher ele, é um adaptador a escrever —
registrado no relatório.

## Modelo de dados

Português, `snake_case`, espelhando `src/lib/dados/tipos.ts`. Datas `timestamptz`.

- **usuarios** — `id` uuid, `nome`, `email` (único, minúsculas), `papel`
  (`admin` | `corretor`), `situacao` (`ativo` | `pendente` | `desativado`),
  `senha_hash` (nulo até aceitar convite), `ultimo_acesso`, `convite_enviado_em`,
  `criado_em`. Índice único parcial: **um só admin**.
- **imoveis** — colunas de `RegistroImovel`. `id` = código em minúsculas
  (URL `/imovel/cz1001`); `codigo` único gerado por **sequence** (`CZ` + número,
  começa em 1001) — substitui o `max + 1` atual, que tem condição de corrida.
  `responsavel_id` e `alterado_por_id` → `usuarios` (usuário nunca é apagado,
  só desativado).
- **fotos** — `id` uuid, `chave` (objeto no bucket), `tipo`, `tamanho`,
  `largura`, `altura`, `enviado_por_id`, `confirmada` (bool), `criado_em`.
- **imovel_fotos** — `imovel_id` (cascata), `foto_id`, `ordem`, `alt`.
  Ordem 0 é a capa.
- **sessoes** — `token_hash` PK, `usuario_id`, `criada_em`, `usada_em`.
- **tokens_senha** — `token_hash` PK, `usuario_id`, `tipo`
  (`convite` | `redefinicao`), `criado_em`, `expira_em`, `usado`. Gerar token
  novo apaga os anteriores do usuário (como hoje).
- **tentativas_login** — `email` PK, `falhas`, `bloqueado_ate`.
- **configuracao_site** — linha única: `oportunidade_id` (→ imoveis,
  `on delete set null`) e os campos de `AvisoOportunidade`.

Operações que tocam mais de uma tabela (salvar imóvel com fotos e Oportunidade,
excluir imóvel, definir senha, desativar usuário) rodam em **transação**.

## Arquitetura

O comentário de `banco.ts` já previa: "trocar por um banco real muda só este
módulo e as funções em lib/imoveis e lib/painel que o leem".

- `src/lib/dados/`: `esquema.ts` (tabelas Drizzle), `criar-conexao.ts` (fábrica
  `criarConexao(url)`, **sem** `server-only`, usada pelos scripts) e `conexao.ts`
  (instância única do app a partir de `DATABASE_URL`, com `import "server-only"`).
  `banco.ts` e `semente.ts` saem do caminho de execução. Motivo: `server-only`
  lança erro fora do Next; scripts (`tsx`) e Vitest não podem importá-lo.
- `server-only` não está instalado: adicionar o pacote e, no `vitest.config.mts`,
  um alias de `server-only` para um módulo vazio. Adicionar `tsx` (devDependency)
  para rodar `scripts/*.ts`.
- **Pool/serverless:** `postgres-js` com `max` baixo (1–3) e `prepare: false`,
  para funcionar atrás de pooler em modo transação (Supabase, Neon, PgBouncer).
  `DATABASE_URL` é a URL **com pooler**; variável opcional `DATABASE_URL_DIRETA`
  (sem pooler) usada por `db:migrar` e `admin:criar` quando existir.
- `src/lib/painel/contas.ts`, `src/lib/painel/imoveis.ts` e
  `src/lib/imoveis/catalogo.ts` mantêm funções e regras, agora `async` sobre
  Drizzle. Server Actions e páginas ganham `await`; tipos de retorno não mudam.
- As funções recebem o banco por parâmetro opcional (padrão: conexão do app),
  para os testes passarem um PGlite limpo.
- `src/lib/imoveis/index.ts` continua com `"use cache"` + `cacheTag(TAG_IMOVEIS)`
  e o painel com `updateTag`. **Já conferido na doc local (Next 16.4):** o
  `"use cache"` padrão guarda em memória **por instância** e, em serverless, não
  é compartilhado entre requisições. Consequências: (a) trocar
  `cacheLife("max")` por vida finita (`revalidate` ~5 min, `expire` ~1 h) como
  rede de segurança, caso o `updateTag` não alcance uma instância aquecida;
  (b) validar no primeiro deploy: editar um imóvel no painel e conferir que o
  site público mostra a mudança em requisições seguintes (vale registrar no
  relatório); (c) `use cache: remote` exige cache handler de fornecedor, fica
  fora do escopo.
- **Build com banco vazio (bloqueador conferido na doc):** com
  `cacheComponents`, `generateStaticParams` **não pode** devolver array vazio
  (erro de build), e produção começa vazia. `/imovel/[id]` deve devolver ao
  menos um parâmetro: se não houver imóveis, devolver um id sentinela (ex.:
  `_vazio`) que renderiza o estado "não encontrado". Também: o build lê o banco
  (as funções `"use cache"` entram no shell estático), então `DATABASE_URL`
  precisa existir no ambiente de **build** da Vercel (relatório). Testar o
  build contra banco migrado e vazio, e conferir os estados vazios da Home
  (Oportunidade `null`, listas sem itens) e da busca.
- `src/lib/config.ts`: lê e valida as variáveis de ambiente uma vez; em
  produção, variável faltando derruba a inicialização com mensagem dizendo qual.

### Fotos (S3)

Módulo `src/lib/armazenamento/` com interface `ArmazenamentoFotos`
(`urlDeEnvio`, `conferir`, `remover`, `urlPublica`) e duas implementações:
**S3** (dev, e2e, produção) e **memória** (Vitest).

Fluxo de upload, mantendo a barra de progresso por foto que a tela já tem
(`src/components/painel/imoveis/fotos.ts`):

1. O navegador lê as dimensões (como hoje) e pede `POST /painel/fotos` com
   `{ tipo, tamanho, largura, altura }` — sem o arquivo.
2. O servidor confere sessão, tipo (JPG/PNG/WEBP), tamanho (≤ 15 MB) e
   dimensões; cria a linha em `fotos` (`confirmada = false`) e devolve uma URL
   assinada de `PUT` (validade curta, `Content-Type` e tamanho fixados).
3. O navegador envia o arquivo direto ao bucket por XHR (progresso preservado).
4. O navegador chama `POST /painel/fotos/[id]/confirmar`; o servidor faz `HEAD`
   no objeto, confere tamanho e tipo, lê os primeiros bytes (GET com `Range`) e
   confere a assinatura (magic bytes) JPG/PNG/WEBP; marca `confirmada = true`.
   Se qualquer conferência falhar, **remove o objeto** e responde erro. Devolve
   `{ id, src }` como hoje. Largura/altura vêm do cliente e servem só de layout.
   Nem todo fornecedor S3 respeita tamanho assinado no `PUT`; por isso o `HEAD`
   na confirmação é a defesa real.

`salvarImovel` só aceita foto **confirmada** e enviada pelo próprio usuário, ou
que já esteja ligada ao imóvel.

Exibição: `src` = `FOTOS_URL_PUBLICA` + chave (bucket de leitura pública;
anúncios são públicos). `next.config.ts` monta `images.remotePatterns` a partir
dessa variável. A rota `/fotos/[id]` atual sai (serviria bytes pela função e
bateria no mesmo limite de 4,5 MB na resposta). **Conferido na doc:** o otimizador
bloqueia IP/host local por padrão; em dev/e2e usar
`images.dangerouslyAllowLocalIP: process.env.NODE_ENV !== "production"` e um
`remotePatterns` com `port` do S3 local. `remotePatterns` é lido no **build**:
mudar `FOTOS_URL_PUBLICA` exige novo deploy (relatório).

Variáveis: `S3_ENDPOINT`, `S3_REGIAO`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`,
`S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, `FOTOS_URL_PUBLICA`.

No Docker local, o servidor S3 sobe com bucket criado, leitura pública e CORS
liberando `PUT` de `http://localhost:3000` e da porta do e2e. Imagem do servidor
S3 local fica a critério de quem implementar (MinIO ou equivalente mantido).

### E-mail (SMTP)

Módulo `src/lib/email/` com interface `Remetente` e duas implementações:
**SMTP** (dev via Mailpit, e2e, produção) e **memória** (Vitest). Os templates
de `src/lib/painel/emails.ts` não mudam; sai a `caixaSaida` em memória e o
`console.info` com o link.

Variáveis: `SMTP_HOST`, `SMTP_PORTA`, `SMTP_USUARIO`, `SMTP_SENHA`,
`SMTP_SEGURO`, `EMAIL_DE` (ex.: `Carneiro & Ziller <painel@dominio>`) e
**`SITE_URL`** (já lida por `emails.ts`, com fallback `localhost:3000`: em
produção passa a ser obrigatória em `config.ts`, senão os links de convite
saem apontando para localhost; o `admin:criar` também a usa).

Falha de envio: convite e redefinição respondem erro tratável; a ação de
"Esqueci minha senha" mantém a mesma resposta na tela (não revela se o e-mail
existe) e registra a falha no log **sem o link**. Nessa ação o envio roda em
`after()` (`next/server`), para o tempo de resposta não revelar se a conta
existe. Anti-abuso: no máximo um e-mail de redefinição por usuário a cada 2 min
(usa `tokens_senha.criado_em`).

### Senhas

- `src/lib/seguranca/senha.ts`: argon2id (padrões OWASP do `@node-rs/argon2`).
  Não há conta real em scrypt, então o suporte a scrypt sai.
- Hash fictício para igualar tempo de resposta continua, gerado em execução.
- Tokens de sessão e link: aleatórios (32 bytes), só o SHA-256 no banco.
- **Correção de comportamento:** hoje `definirSenha` não encerra sessões
  existentes. Ao definir/redefinir senha, encerrar **todas** as sessões do
  usuário (quem redefine por suspeita de vazamento espera isso). Teste novo.
- `usuarios.email`: constraint `check (email = lower(email))`.
- `tentativas_login`: incremento atômico (`INSERT ... ON CONFLICT DO UPDATE`),
  sem ler-e-gravar.

### Primeiro Admin

`npm run admin:criar -- --nome "<nome>" --email "<email>"`
(`scripts/criar-admin.ts`):

- Conecta em `DATABASE_URL`; recusa se já existir admin.
- Cria `admin`/`pendente`, sem senha; gera link de convite (72 h) e **imprime no
  terminal de quem rodou**. A pessoa define a própria senha pela tela "Definir
  senha" que já existe. Não depende de SMTP configurado.
- Nada é gravado em arquivo; nome e e-mail vêm só dos argumentos.

### Dados de desenvolvimento

- `npm run db:semente` — só dev local; recusa com `NODE_ENV=production` **e**
  se o host de `DATABASE_URL` não for local (`localhost`, `127.0.0.1`, `::1`),
  para não semear produção por engano com a URL errada no ambiente. Importa
  os 35 imóveis atuais (sem usuários), envia as fotos de `public/images/imoveis`
  ao bucket local (todas as fotos passam pelo mesmo caminho), acerta a sequence
  depois dos códigos explícitos e define a Oportunidade de hoje (CZ1009).
  Responsável: o admin existente (exige `admin:criar` antes).
- Dados dos imóveis saem de `src/lib/dados/semente.ts` para
  `scripts/semente-imoveis.ts`. `SENHA_DEMO` e `sementeUsuarios` deixam de existir.
  `src/lib/dados/semente.test.ts` (não rastreado) acompanha os dados.
- Comandos: `db:subir` (docker compose up), `db:migrar`, `db:gerar`.
- `.env.example` versionado com valores do Docker local (credenciais locais de
  container, não de produção) e exceção `!.env.example` no `.gitignore`.

## Testes

TDD, régua cheia.

- **Vitest + PGlite:** cada arquivo sobe um PGlite, aplica as migrations e cria
  seus usuários com senha **gerada no teste**. Reescrever `painel.test.ts`,
  `catalogo.test.ts` e `index.test.ts` sobre esse arranjo, cobrindo as regras de
  hoje mais: admin único, código por sequence, transação do salvar, foto não
  confirmada/de outro usuário recusada, sessão expirada e usuário desativado,
  token usado/expirado, bloqueio por tentativas, argon2id, `admin:criar` recusa
  segundo admin, configuração ausente em produção.
- **Playwright:** usa **banco e bucket próprios** (`cz_e2e`, bucket de e2e),
  separados do dev, para não apagar os dados de desenvolvimento; a limpeza
  **recusa** rodar se o nome do banco não terminar em `_e2e` ou o host não for
  local. **Ordem:** o `webServer` roda `npm run build` e este lê o banco
  (e `generateStaticParams` precisa de dados), e o Playwright sobe o `webServer`
  *antes* do `globalSetup`; logo o preparo (zerar, migrar, admin, corretor,
  semente) vira um script `e2e:preparar` encadeado antes do build no comando do
  `webServer`, não um `globalSetup`. Ele zera banco e bucket do Docker, migra, cria admin
  e um corretor direto no banco (já ativos, com hash de senhas aleatórias geradas
  na hora e passadas aos testes por variável do processo) e roda `db:semente`.
  O `admin:criar` é coberto no Vitest.
  `painel.spec.ts` perde `SENHA` e e-mails fixos. O teste de convite lê o link
  pela API do Mailpit e conclui a definição de senha. O teste de upload passa
  pelo S3 local.
- `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` verdes.

## Entregáveis

1. Esquema, migrations, conexão, `config.ts`.
2. Camada de dados reescrita (contas, imóveis, catálogo) com testes.
3. argon2id.
4. Fotos via S3 com upload direto; e-mail via SMTP.
5. `docker-compose.yml`, scripts `admin:criar`, `db:*`, `fotos:limpar`.
6. Remoção de `SENHA_DEMO`, `sementeUsuarios`, `banco.ts`, `/fotos/[id]` e da
   senha fixa no e2e.
7. `.env.example` e `docs/backend.md` (setup local e variáveis).
8. `docs/backend-pendencias.md` — o que só o outro dev pode fazer:
   - escolher e criar Postgres, bucket S3 e conta SMTP; preencher as variáveis
     na Vercel (lista exata no documento);
   - no bucket: leitura pública e CORS com `PUT` do domínio do site;
   - DNS do domínio remetente (SPF, DKIM) no fornecedor de e-mail;
   - rodar `db:migrar` e `admin:criar` contra produção, com o e-mail real do Admin;
   - destino dos leads (`/api/interesses`);
   - se escolher Vercel Blob: escrever esse adaptador;
   - backup do banco (recurso do fornecedor);
   - agendar `fotos:limpar` (cron da Vercel ou do fornecedor);
   - conferir no primeiro deploy que o binário do `@node-rs/argon2` carrega
     (o pacote já consta em `serverExternalPackages` padrão do Next 16.4);
   - `DATABASE_URL` também no ambiente de **build**; usar URL com pooler no app;
   - `SITE_URL` de produção; mudar `FOTOS_URL_PUBLICA` exige novo deploy;
   - no primeiro deploy, validar que edição no painel aparece no site público
     (cache por instância).

## Riscos

- **Next 16.4 com `cacheComponents`**: leitura de banco dentro de `"use cache"`
  sem dado de requisição; conferir na doc local antes.
- **Otimizador de imagem e host local**: em dev o bucket está em `localhost`;
  pode exigir opção do Next só fora de produção.
- **Cache por instância na Vercel**: ver "Arquitetura"; mitigado por vida
  finita no `cacheLife` e validação no primeiro deploy.
- **Build depende do banco**: banco inacessível no build derruba o deploy;
  estados vazios precisam existir (ver "Arquitetura").
- **Operações destrutivas locais** (`db:semente`, preparo do e2e): protegidas
  por checagem de host/nome do banco.
- **PGlite × Postgres real**: o e2e, no Postgres do Docker, cobre a diferença.
- **Upload direto**: o servidor não lê os bytes; a defesa é URL assinada com tipo
  e tamanho fixos, `HEAD` na confirmação, e o bucket servindo em domínio próprio.
- **Fotos órfãs** (enviadas e não salvas, ou de imóvel excluído): ao excluir
  imóvel, remover os objetos; `npm run fotos:limpar` apaga, com mais de 24 h, fotos **não confirmadas** e
  fotos **confirmadas sem vínculo** em `imovel_fotos` (cobre foto removida na
  edição e remoção de objeto que falhou após excluir imóvel). Agendar é
  pendência do outro dev.

## Deixado para quem implementar

Nomes de arquivos internos, helpers de teste, pool de conexão, imagem do S3
local, frequência de atualização de `usada_em` da sessão (pode limitar a uma
escrita por minuto).

## Desvios registrados na implementação

- **Imagens locais:** em vez de `dangerouslyAllowLocalIP: NODE_ENV !== "production"`, o `next.config.ts` só libera hosts locais com `IMAGENS_HOST_LOCAL=true` (nunca definido em produção). Em produção sem `FOTOS_URL_PUBLICA`, o build falha.
- **Buckets locais:** criados por `scripts/preparar-s3.ts` (chamado em `npm run db:subir`), não por um contêiner auxiliar. MinIO recebe CORS por variáveis de ambiente.
- **Pool:** `DATABASE_POOL_MAX` (padrão 2 em produção); `DATABASE_URL_DIRETA` opcional para migrations e scripts.
- **Nomes:** interfaces `Remetente` (e-mail) e `ArmazenamentoFotos` (fotos), ambas com implementação em memória injetada pelo `vitest.setup.ts`.
- **Scripts:** em `scripts/` (`migrar`, `criar-admin`, `semear`, `fotos-limpar`, `preparar-s3`, `e2e-preparar`), executados por `tsx --conditions=react-server`. A semente de imóveis saiu de `src/lib/dados/semente.ts` para `scripts/semente-imoveis.ts` e não contém usuários nem senhas.
- **Cache:** `cacheLife` finito (`stale 60s / revalidate 300s / expire 3600s`) + `updateTag`, porque `"use cache"` é por instância em ambiente serverless.
- **`/imovel/[id]`:** `generateStaticParams` devolve o sentinela `_vazio` quando o banco está vazio (exigência do `cacheComponents`).
- **E2E:** banco `cz_e2e` e bucket `cz-e2e` próprios; credenciais geradas a cada execução por `scripts/e2e-env.ts`/`e2e-preparar.ts`.

### Preparação para produção na Vercel (2026-10-26, depois da implementação)

Objetivo: o dev de infraestrutura só toma as decisões que não dá para tomar no código (e-mail, quem é o ADMIN, domínio).

- **Stack padrão:** Neon (Marketplace) + **Vercel Blob**. Ambos se conectam ao projeto e injetam as variáveis. Novo adaptador `armazenamentoBlob`:
  - permissão de envio = token de cliente restrito a chave, tipo e tamanho, válido por 5 min;
  - `ArmazenamentoFotos.urlDeEnvio` passou a devolver `Envio` (`put` ou `vercel-blob`);
  - o S3 continua suportado e é usado localmente.
- **Variáveis automáticas:**
  - `DATABASE_URL_UNPOOLED` (Neon) serve de URL direta;
  - `SITE_URL` cai para `VERCEL_PROJECT_PRODUCTION_URL` ou, em preview, para o endereço da branch.
- **Deploy automatizado (`vercel-build` → `scripts/implantar.ts`):**
  - migrations sob `pg_advisory_lock`; em preview, só com `MIGRAR_NO_PREVIEW=true`;
  - em produção, ADMIN inicial a partir de `ADMIN_INICIAL_NOME`/`ADMIN_INICIAL_EMAIL`, com convite por e-mail. O deploy reenvia se o convite vencer, e o link nunca vai para log;
  - `admin:criar` continua disponível.
- **Leads:** `POST /api/interesses` implementado (tabela `interesses`, limite por IP em `limites_envio`, aviso ao corretor responsável + ADMIN + `LEADS_EMAIL`). A integração com o GranCRM continua fora.
- **Limpeza:** Vercel Cron diário (`/api/cron/limpeza`, `CRON_SECRET` opcional), mesma rotina do `fotos:limpar`.
- **Inicialização:** sem SMTP o site sobe, com alerta. Banco, fotos e endereço continuam obrigatórios.
- **Região:** funções em `gru1` (São Paulo), junto do banco.
- **Migration:** regenerada como `0000_inicial` única. A anterior criava `imoveis.valor` como `integer`, divergindo do esquema (`bigint`). Produção nunca foi migrada, então não há transição.
