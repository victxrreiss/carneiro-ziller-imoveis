# Colocar em produção (Vercel)

O código está pronto para produção. Na Vercel:
- o deploy aplica as migrations sozinho;
- o deploy cria o ADMIN e envia o convite por e-mail;
- a limpeza diária roda por cron;
- o formulário de interesse grava o lead e avisa a equipe.

O que falta é configuração na Vercel e uma conta de e-mail. Cada passo diz o que fazer; as únicas decisões estão marcadas com **Decisão**.

> Stack escolhida para ter o mínimo de contas e chaves: tudo dentro da Vercel, menos o e-mail.
> - **Neon** (Postgres pela Marketplace da Vercel): injeta `DATABASE_URL` e `DATABASE_URL_UNPOOLED`.
> - **Vercel Blob** (fotos): injeta `BLOB_READ_WRITE_TOKEN`.
>
> Funções e banco ficam em São Paulo (`vercel.json` → `regions: ["gru1"]`). O código continua aceitando qualquer Postgres e qualquer S3 (`docs/backend.md`), caso a escolha mude.

## 1. Banco: Neon (≈ 3 min)
Vercel → projeto `carneiro-ziller-imoveis` → **Storage** → **Create Database** → **Neon**.
- Região: **São Paulo (sa-east-1)**, junto das funções (`gru1`).
- Conectar ao projeto nos ambientes **Production** e **Preview**. Development é opcional.
- Recomendado: ligar **"Create a database branch for each preview deployment"** e definir `MIGRAR_NO_PREVIEW=true` em Preview. Assim cada preview tem banco próprio, e uma migration nova não toca produção antes do merge.
  - Sem isso, preview e produção usam o mesmo banco. Nesse caso **não** defina `MIGRAR_NO_PREVIEW`: só o deploy de produção migra.

## 2. Fotos: Vercel Blob (≈ 1 min)
**Storage** → **Create** → **Blob** → acesso **Public**, região **São Paulo (gru1)** → conectar ao projeto (Production e Preview).

Nada mais: o upload vai direto do navegador para o Blob, e o `next/image` já aceita o host do Blob.

## 3. E-mail (≈ 15 min + propagação de DNS)
**Decisão: fornecedor de e-mail.** Recomendado: **Resend**. O plano gratuito cobre com folga convites, redefinições e avisos de interesse (100/dia, 3.000/mês). Qualquer SMTP serve.

Com Resend:
1. Criar conta e adicionar o domínio remetente (ex.: `carneiroziller.com.br`).
2. Publicar no DNS os registros **SPF/DKIM** que a Resend mostrar e esperar ficarem "Verified".
3. Criar uma API key com permissão "Sending access".
4. Na Vercel → **Settings → Environment Variables** (Production e Preview):

| Variável | Valor |
|---|---|
| `SMTP_HOST` | `smtp.resend.com` |
| `SMTP_PORTA` | `465` |
| `SMTP_SEGURO` | `true` |
| `SMTP_USUARIO` | `resend` |
| `SMTP_SENHA` | a API key (marcar como **Sensitive**) |
| `EMAIL_DE` | `Carneiro & Ziller <painel@SEU-DOMINIO>` |

Sem e-mail o site público funciona. Só convites, redefinição de senha e avisos de interesse ficam sem envio, e o log da Vercel mostra o alerta `[config]`.

## 4. Primeiro ADMIN
**Decisão: quem é o ADMIN** (único; os corretores ele mesmo convida pelo painel). Em **Production**:

| Variável | Valor |
|---|---|
| `ADMIN_INICIAL_NOME` | nome completo |
| `ADMIN_INICIAL_EMAIL` | e-mail real dessa pessoa |

No deploy de produção, o ADMIN é criado sem senha e recebe o convite por e-mail. O link vale 72 h. Se vencer sem uso, o próximo deploy envia outro. O link **nunca** aparece no log do build.
- Confirmação no log do build: `[implantar] ADMIN criado: convite enviado para ...`.
- Depois que o ADMIN definir a senha, as duas variáveis podem ser apagadas ou mantidas; o deploy não mexe em ADMIN ativo.

## 5. Opcionais
- `LEADS_EMAIL`: endereços extras que recebem os avisos de interesse, separados por vírgula. Sem ela, o aviso vai ao corretor responsável pelo imóvel e ao ADMIN.
- `CRON_SECRET`: um valor aleatório longo. A Vercel o envia sozinha ao cron diário de limpeza. Sem ele, o cron aceita só o agente da Vercel. A rotina é idempotente, por isso o risco é baixo, mas o segredo é o recomendado.
- `SITE_URL`: só se os links dos e-mails tiverem de apontar para um endereço diferente do domínio de produção do projeto (que já é usado por padrão).

## 6. Domínio e acesso público
- **Decisão: domínio.** Settings → **Domains** → adicionar o domínio e configurar o DNS que a Vercel indicar. Os links dos e-mails passam a usar o domínio próprio sozinhos.
- Settings → **Deployment Protection** → **Vercel Authentication**: hoje está em *All Deployments except Custom Domains*. Isso deixa `carneiro-ziller-imoveis.vercel.app` atrás do login da Vercel.
  - Trocar para **Only Preview Deployments** deixa a produção pública.
  - Com domínio próprio, o domínio já é público mesmo sem a troca.
- Settings → **Build and Deployment** → **Build Command** deve ficar no padrão, sem override. Assim a Vercel roda o script `vercel-build` (migrations + ADMIN + `next build`).

## 7. Publicar
1. Fazer o merge do PR `develop` → `main`.
2. Acompanhar o build. O log deve ter `[implantar] migrations aplicadas.` e a linha do ADMIN.
3. Conferir em produção:
   - [ ] o ADMIN recebeu o convite, definiu a senha e entrou em `/painel/entrar`;
   - [ ] cadastrar um imóvel com foto e publicar: aparece no site (o cache por instância expira em até 5 min);
   - [ ] enviar o formulário "Tenho interesse": chega o aviso por e-mail;
   - [ ] Settings → **Cron Jobs** lista `/api/cron/limpeza`.

## 8. Rotina
- **Backup:** a Neon tem restauração para um ponto no tempo; a janela depende do plano. Conferir se a janela do plano escolhido atende.
- **Leads:** ficam na tabela `interesses` e são avisados por e-mail. Ainda não há tela de leads no painel.

## Fora do escopo desta entrega
- Integração com o GranCRM (destino dos leads). O ponto de encaixe é `registrarInteresse` em `src/lib/interesse/servidor.ts`.
