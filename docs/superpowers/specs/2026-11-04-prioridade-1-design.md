# Prioridade 1 do feedback do cliente — design

Data: 2026-11-04. Origem: feedback do cliente (Carneiro & Ziller) avaliado no documento
"Avaliação do feedback — site Carneiro & Ziller" (Claude Docs). Este spec cobre só a
**Prioridade 1 — antes do lançamento**. Prioridade 2 (nova direção visual, Home, galeria,
semelhantes, compartilhar, Anuncie seu imóvel) e 3 (condomínios/regiões, vídeos, favoritos,
CRM, 2ª base) ficam fora.

## Por quê

O site está no ar com os 422 imóveis da Loft, mas ainda não pode ser divulgado: fala de
"duas unidades" quando o cliente quer uma marca só, os contatos recebidos não chegam a
ninguém, três páginas linkadas dão 404, e a busca não ordena nem filtra por localização.

## Decisões do usuário (2026-11-04)

- **Contato principal = os dados da Carneiro:** WhatsApp/telefone (31) 99539-5988,
  CRECI 7904, e-mail contato@carneiroinvestimoveis.com.br (provisório até existir um
  @carneiroziller.com.br). Tudo num único lugar (`src/lib/site.ts`) para trocar depois.
- **Leads:** criar agora a tela de contatos no painel. O envio por e-mail (Resend/SMTP)
  fica para depois, quando houver acesso ao DNS. O código de e-mail existente continua.
- **Textos provisórios:** Política de privacidade com um modelo LGPD padrão; Sobre nós
  curto, sem fatos inventados (nada de anos, números ou nomes que o cliente não deu).
- **2ª base (site da Ziller):** não investigar agora; o cliente será perguntado.

## Escopo

### 1. Marca única
- `src/lib/site.ts` passa a ter **uma** empresa: nome "Carneiro & Ziller Imóveis", CRECI 7904,
  telefone, WhatsApp (número em formato internacional para `wa.me`), e-mail e endereço
  ["Alameda Oscar Niemeyer, 288", "Vale do Sereno, Nova Lima - MG"]. Remover `unidades` e
  `crecis`.
- Atualizar todos os consumidores: Footer, UtilityBar, SiteChrome, MenuDrawer e o rodapé
  dos e-mails (`src/lib/painel/emails.ts`). Nenhum texto "Unidade Carneiro/Ziller" nem os
  dados da Ziller sobram em `src/`.
- Hero: o destaque "2 unidades / BH e Nova Lima" vira "Alto padrão / BH e Nova Lima"
  (minha escolha; o cliente pode trocar o texto).
- Links de Instagram/LinkedIn com `#`: esconder enquanto não houver URL real.

### 2. Contatos chegando à equipe
- **Tela "Contatos" no painel** (`/painel/contatos`, no menu do painel): lista dos
  `interesses`, mais recentes primeiro, 30 por página. Colunas: data, nome, telefone (link
  `tel:` e WhatsApp), e-mail, observações, imóvel (código + link para a ficha no painel,
  quando houver), página de origem. ADMIN vê todos; corretor vê só os dos imóveis em que é
  responsável (regra no servidor, em `regras.ts`). Sem status "atendido" nesta etapa.
- **Página de origem:** o formulário já grava `url`; garantir que seja o caminho da página
  em que a pessoa estava, e mostrar na tela.
- **Contato geral sem imóvel:** a página `/contato` usa o mesmo fluxo
  (`POST /api/interesses`), com `imovelId` opcional quando `origem` = "contato". As mesmas
  validações e limites por IP. O e-mail para a equipe (quando houver SMTP) vai ao ADMIN e a
  `LEADS_EMAIL`.
- **Botão de WhatsApp** na página do imóvel, ao lado de "Agendar visita": abre
  `https://wa.me/<número>?text=<mensagem>` com "Olá! Tenho interesse no imóvel <CÓDIGO> —
  <título>. <URL da página>". O número é o da empresa (não o do corretor). Também na página
  de contato e no rodapé.

### 3. Páginas que faltam
- `/contato`: endereço, WhatsApp, telefone, e-mail, CRECI e o formulário geral.
- `/sobre`: texto provisório curto (uma empresa, união de duas imobiliárias de BH e Nova
  Lima, atendimento personalizado no alto padrão), sem fatos não fornecidos.
- `/politica-de-privacidade`: modelo LGPD: controlador, dados coletados (nome, telefone,
  e-mail, mensagem, imóvel de interesse, hash do IP), finalidade, base legal, compartilhamento
  (equipe/CRM), retenção, direitos do titular e canal de contato (e-mail da empresa).
- As três seguem o estilo das páginas do grid (`SiteChrome`, CSS `.cz`) e têm título e
  descrição próprios.

### 4. Busca
- **Ordenação** (`ordem` na URL): `recentes` (padrão; `publicadoEm` desc), `maior-preco`,
  `menor-preco`, `maior-area`. Preço considera o valor que vale para a finalidade filtrada
  (locação em "alugar"). Imóveis sem valor/área vão para o fim.
- **Localização** (`local` na URL): select com as cidades e bairros que existem entre os
  publicados (agrupado por cidade, com "Toda a cidade"). Valores validados contra o
  catálogo atual; valor desconhecido é descartado como os demais filtros.
- **24 por página** (era 15).
- **Atalhos por categoria** acima do grid: links para os tipos com pelo menos um imóvel
  publicado no recorte de finalidade atual (ex.: Apartamentos, Casas em condomínio,
  Terrenos, Coberturas…), com a contagem. Categoria vazia não aparece.
- Os filtros novos entram no `lerFiltros`/`urlGrid` (ordem canônica), no "Voltar aos
  resultados" e no drawer de filtros do celular.

### 5. Cadastro
- **Lançamentos vazios:** a seção de Lançamentos da Home e o item "Lançamentos" do menu
  somem enquanto não houver lançamento publicado.
- **Relatório de cadastro para a equipe:** `npm run cadastro:relatorio` gera um CSV local
  (gitignorado) com, por imóvel publicado ou rascunho: código, título, situação e os
  problemas (sem área, sem finalidade/valor, descrição citando rua e número) e um segundo
  bloco de **prováveis duplicados** (mesmo empreendimento ou bairro + mesmo tipo + área e
  valor iguais ou a ±2%). Nunca inclui endereço. Roda contra produção pelo
  `deploy/deploy.sh relatorio-cadastro` (túnel), como os outros modos.

### 6. Google
- `sitemap.xml` (Home, /imoveis, /lancamentos quando houver, as três institucionais e cada
  imóvel publicado, com `lastModified` = `alteradoEm`) e `robots.txt` (bloqueia `/painel` e
  `/api`, aponta o sitemap). Base: `SITE_URL`.
- Título e descrição revisados na Home e nas institucionais; `openGraph` com a imagem da
  Home. Página do imóvel ganha dados estruturados JSON-LD (`RealEstateListing`/`Offer` com
  preço, sem endereço).
- Fora: Analytics, Search Console e redirecionamentos dos domínios antigos (dependem de
  acesso do cliente).

### 7. Testes
- Testes unitários e e2e existentes continuam verdes; cada item acima ganha seus testes.
- Antes do deploy: rodada manual no navegador (desktop e largura de celular) das páginas
  novas, filtros e botão de WhatsApp.

## Decisões menores (minhas, ajustáveis)
- "Vale do Sereno" é correção pedida pelo cliente no feedback ("Alameda Oscar Niemeyer, 288,
  Vale do Sereno, Nova Lima"), não engano: substitui o "Vila da Serra" atual.
- Contato geral (sem imóvel) grava `codigo` vazio; contatos sem imóvel, ou de imóvel já
  excluído, aparecem só para o ADMIN.
- Ordenação por preço em "lançamentos" usa o valor de venda.
- Política de privacidade: controlador "Carneiro & Ziller Imóveis", CRECI 7904. CNPJ e razão
  social ficam de fora do texto público (nada de "a preencher" visível) e entram quando o
  cliente informar.

## Fora do escopo e anti-objetivos
- Nada de mudança visual ampla (é a Prioridade 2): usar os estilos existentes.
- Não expor endereço de imóvel em lugar nenhum público (inclui JSON-LD, sitemap e o CSV).
- Não inventar fatos sobre a empresa nos textos provisórios.
- Não mexer nos dados dos imóveis em produção (o relatório só lê).
