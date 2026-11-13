# Prioridade 2 (nova direção visual e destaques) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Aplicar ao site a direção visual aprovada (Home, busca, imóvel e moldura) e deixar o ADMIN escolher no painel os imóveis em destaque da Home.

**Architecture:** Primeiro a lógica, sem visual: destaques (dados, painel, cache) e regiões/semelhantes no catálogo. Depois o visual, tela por tela, a partir dos mockups aprovados, consumindo essas funções. Os mockups em `.superpowers/design/2026-11-04-p2/mockups/` são a referência visual de cada tarefa de UI.

**Tech Stack:** Next 16 (`cacheComponents`), React 19, Tailwind v4 (Home) + CSS `.cz` (`src/styles/`), Drizzle/Postgres (PGlite nos testes), Vitest + Testing Library, Playwright.

**Spec:** `docs/superpowers/specs/2026-11-13-prioridade-2-design.md`

## Global Constraints

- Código, comentários, textos da interface e commits em português do Brasil.
- Endereço de imóvel (rua, número, CEP) nunca aparece em nada público.
- Contatos só de `src/lib/site.ts`; nenhum texto inventa números, anos ou prêmios sobre a empresa.
- Toda URL vem de `src/lib/routes.ts` (`routes`, `painel`); nada de caminho escrito à mão.
- O site lê imóveis só por `src/lib/imoveis/index.ts` (wrappers `"use cache"` com `marcar()`); mudança feita pelo painel invalida a tag `imoveis` (`TAG_IMOVEIS`).
- Permissões no servidor, em `src/lib/painel/regras.ts`, checadas em toda ação.
- Fontes servidas localmente com `next/font/local` (como hoje em `src/app/fonts.ts`), arquivos woff2 latin copiados dos pacotes `@fontsource/cormorant-garamond` e `@fontsource/jost` (sem deixá-los como dependência).
- Paleta e tipografia: os tokens e escalas de `.superpowers/design/2026-11-04-p2/DIRECAO.md`.
- E2E: sem rolagem horizontal, menu em gaveta abaixo de 900px, axe WCAG 2 A/AA. Nome acessível que um teste e2e usa só muda junto com o teste.
- `npm run typecheck`, `npm run lint` e `npx vitest run --maxWorkers=4` verdes ao fim de cada tarefa.
- Commits terminam com:
  `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` e
  `Claude-Session: https://claude.ai/code/session_01216krGpfPbhdeQmoTvm6De`

## Review Focus

1. Destaque que vira rascunho, indisponível ou é excluído some da Home na hora (lista + cache), e o ADMIN vê quem tirou: teste na Task 1.
2. Mais de 6 destaques marcados: a Home mostra os 6 primeiros da ordem, e a tela do painel mostra todos e diz quais ficam de fora: teste na Task 1.
3. `regiao` junto com `local` na URL: `regiao` vale e `local` é descartado (senão o resultado fica vazio sem motivo aparente): teste na Task 2.
4. Imóvel sem preço ou com 0, 1 ou 2 fotos: semelhantes sem filtro de preço (Task 2); galeria em mosaico sem buracos com 1 ou 2 fotos e com a foto padrão quando não há nenhuma (Task 6).
5. Abertura da Home sem JavaScript ou com `prefers-reduced-motion`: a primeira imagem e a primeira frase aparecem paradas, e a busca funciona como formulário GET: teste na Task 4.

---

### Task 1: Destaques escolhidos no painel (dados, regras, painel e Home atual)

Substitui a "Oportunidade de hoje" (um imóvel) por uma lista ordenada de destaques.

**Files:**
- Modify: `src/lib/dados/esquema.ts` (nova tabela; tira `oportunidadeId` de `configuracaoSite`), `src/lib/dados/tipos.ts` (`AvisoOportunidade` → `AvisoDestaque`)
- Create: migração gerada por `npm run db:gerar` em `drizzle/`
- Create: `src/lib/painel/destaques.ts`, `src/lib/painel/destaques.test.ts`
- Modify: `src/lib/painel/imoveis.ts` (salvar/excluir tiram o imóvel da lista), `src/lib/painel/regras.ts`, `src/app/painel/_acoes/imoveis.ts` (ou novo `_acoes/destaques.ts`)
- Create: `src/app/painel/(app)/pagina-inicial/page.tsx`, `src/components/painel/destaques/ListaDestaques.tsx`
- Modify: `src/lib/routes.ts` (`painel.paginaInicial`), `src/components/painel/Shell.tsx` (item "Página inicial", só ADMIN), `src/components/painel/imoveis/FormImovel.tsx`, `src/components/painel/imoveis/ListaImoveis.tsx`, `src/app/painel/(app)/imoveis/page.tsx`
- Modify: `src/lib/imoveis/catalogo.ts`, `src/lib/imoveis/index.ts`, `src/lib/imoveis/types.ts`; Home atual: `src/app/page.tsx`, `src/components/home/Selected.tsx` (remove `FeaturedProperty`, `SelectedTabs` e seus testes)

**Interfaces:**
- Produces (dados): tabela `destaques_home` (`imovel_id text PK → imoveis.id ON DELETE CASCADE`, `ordem integer not null`, `marcado_em`); `configuracao_site` fica com `id` e `aviso jsonb` (`AvisoDestaque = { porId, codigo, titulo, motivo: "indisponivel" | "rascunho" | "excluido" | "desmarcado", em }`). A migração apaga `oportunidade_id` sem migrar o valor.
- Produces (painel, `src/lib/painel/destaques.ts`):
  - `MAX_DESTAQUES_HOME = 6`
  - `listarDestaques(u: UsuarioLogado, db?): Promise<{ itens: LinhaDestaque[]; aviso: AvisoParaAdmin | null }>` com `LinhaDestaque = { id, codigo, titulo, capa: string | null, naHome: boolean }` (`naHome` = está entre os 6 primeiros)
  - `marcarDestaque(u, imovelId: string, marcar: boolean, db?)`: só ADMIN, só publicado; marcar põe no fim da lista; desmarcar grava aviso `"desmarcado"`
  - `moverDestaque(u, imovelId: string, direcao: "subir" | "descer", db?)`
  - Resultado das ações: `{ ok: true } | { ok: false; erro: "permissao" | "nao-publicado" | "inexistente" }`
- Produces (site): `destaquesHome(db?): Promise<ImovelCard[]>` em `catalogo.ts` (publicados completos, na ordem, no máximo 6) e `getDestaquesHome()` em `index.ts`.
- Removes: `oportunidadeDeHoje`, `getDestaque`, `vendaHome`/`locacaoHome`, `getImoveisVenda`/`getImoveisLocacao`, o campo `oportunidade` de `regras.ts`/`FormImovel`, `oportunidadeSaiu` (vira `destaqueSaiu: boolean`).

- [ ] **Step 1: Testes que falham** em `src/lib/painel/destaques.test.ts` (PGlite via `src/lib/dados/testes.ts`):
  - `ADMIN marca três publicados e eles saem na ordem em que foram marcados`
  - `corretor não marca destaque` → `{ ok: false, erro: "permissao" }`
  - `rascunho não pode ser destaque` → `erro: "nao-publicado"`
  - `mover sobe e desce trocando com o vizinho; nas pontas não faz nada`
  - `com 8 marcados, destaquesHome devolve os 6 primeiros e listarDestaques marca naHome só neles`
  - `salvar o destaque como indisponível tira da lista e grava aviso com motivo "indisponivel" e porId do usuário`
  - `excluir o imóvel tira da lista e grava aviso "excluido"`
  - `desmarcar grava aviso "desmarcado"; marcar outro limpa o aviso`
- [ ] **Step 2:** `npx vitest run src/lib/painel/destaques.test.ts` → FAIL (módulo inexistente).
- [ ] **Step 3:** Esquema + `npm run db:gerar` (conferir que a migração cria a tabela e só remove `oportunidade_id`), `destaques.ts`, ajuste de `salvarImovel`/`excluirImovel` (dentro da mesma transação), `destaquesHome` e `getDestaquesHome`. As ações do painel chamam `revalidateTag(TAG_IMOVEIS)` como as atuais.
- [ ] **Step 4:** UI do painel:
  - **Formulário do imóvel:** a caixa "Destaque na página inicial" (só ADMIN, só publicado) substitui a da Oportunidade. Quando salvar tira o imóvel da lista, aparece o aviso "Este imóvel saiu dos destaques da página inicial".
  - **Lista de imóveis:** a etiqueta "DESTAQUE" substitui "OPORTUNIDADE DE HOJE".
  - **Tela "Página inicial":** mostra a lista na ordem, com os botões "Subir", "Descer" e "Remover" e o link para o imóvel. Separa os 6 que aparecem na Home dos que ficam de fora, mostra o aviso de quem tirou o último e um estado vazio que explica como marcar.
  - **Estilos:** os do painel (`cz-painel.css`).
- [ ] **Step 5:** A Home atual usa `getDestaquesHome()` na seção "Imóveis em destaque" (sem abas). `FeaturedProperty` e `SelectedTabs` são removidos com os testes deles. Sem destaques, a seção não renderiza.
- [ ] **Step 6:** Testes de componente da tela Página inicial: estado vazio; botão "Subir" desabilitado no primeiro e "Descer" desabilitado no último. Atualizar `e2e/painel.spec.ts` onde citar a Oportunidade.
- [ ] **Step 7:** typecheck, lint, vitest verdes. Commit `feat(destaques): ADMIN escolhe os imóveis em destaque da página inicial`.

### Task 2: Regiões e imóveis semelhantes (catálogo)

**Files:**
- Create: `src/lib/imoveis/regioes.ts`, `src/lib/imoveis/regioes.test.ts`
- Modify: `src/lib/imoveis/filtros.ts` (+ teste), `src/lib/imoveis/catalogo.ts` (+ teste), `src/lib/imoveis/index.ts`, `src/lib/imoveis/types.ts`, `src/app/imoveis/page.tsx` e `src/app/imoveis/actions.ts` (validar `regiao`)
- Delete: `regioes` de `src/lib/imoveis/mock-data.ts` (se o arquivo ficar vazio, apagar)

**Interfaces:**
- Produces: `type Regiao = { slug: string; nome: string; legenda: string; img: string; bairros: readonly { bairro: string; cidade: string }[]; grande?: boolean }` e `REGIOES: readonly Regiao[]`, nesta ordem:
  - `belvedere-vila-da-serra`: "Belvedere e Vila da Serra", Belvedere/Belo Horizonte + Vila da Serra/Nova Lima, `grande: true`.
  - `lourdes-savassi`: "Lourdes e Savassi", ambos em Belo Horizonte.
  - `alphaville-lagoa-dos-ingleses`: "Alphaville Lagoa dos Ingleses", Nova Lima.
  - `vale-dos-cristais`: "Vale dos Cristais", Nova Lima.
  - `vale-do-sereno`: "Vale do Sereno", Nova Lima.
  - As imagens são as de `public/images` usadas no mockup.
- Produces: `regiaoPorSlug(slug: string): Regiao | undefined`; `naRegiao(r: Regiao, i: Pick<Imovel,"bairro"|"cidade">): boolean`, que compara normalizado como `noLocal`.
- Produces: `Filtros.regiao?: string` (chave de URL `regiao`, entra em `ORDEM` logo depois de `local`, vira chip com o `nome` da região). Em `lerFiltros`, se houver `regiao` válida, `local` é descartado.
- Produces: `regioesComImoveis(db?): Promise<(Regiao & { total: number })[]>`, só as regiões com total maior que 0, e o wrapper `getRegioesHome()`. `getRegioes`/`regioesHome` saem.
- Produces: `semelhantes(id: string, db?): Promise<ImovelCard[]>` e o wrapper `getSemelhantes(id)`. Seleção, até 3 imóveis:
  1. Candidatos: publicados completos, sem o próprio imóvel, do mesmo tipo e com a mesma finalidade de valor (venda com venda, locação com locação).
  2. Primeiro os da mesma cidade com preço a até 30%. Se o imóvel não tem valor, todos da mesma cidade.
  3. Completa com o mesmo tipo em qualquer cidade.
  4. Dentro de cada grupo, menor diferença de preço primeiro; depois, o código.

- [ ] **Step 1: Testes que falham:**
  - `regiao válida filtra Belvedere (BH) e Vila da Serra (Nova Lima) juntos`
  - `regiao desconhecida é descartada`
  - `regiao e local juntos: vale a regiao`
  - `urlGrid mantém regiao na ordem canônica`
  - `regioesComImoveis omite região sem imóvel publicado`
  - `semelhantes: mesmo tipo e cidade a até 30% primeiro, ordenados pela diferença de preço`
  - `semelhantes completa com outra cidade quando faltam`
  - `semelhantes nunca inclui o próprio imóvel nem rascunho`
  - `semelhantes de imóvel sem valor ignora o preço`
  - `semelhantes de imóvel de locação só traz locação`
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** implementar; `/imoveis` e `actions.ts` aplicam a regra de `regiao` (válida) junto com `validarLocal`.
- [ ] **Step 4:** verde; commit `feat(busca): regiões com bairros de cidades diferentes e imóveis semelhantes`.

### Task 3: Identidade (tokens, fontes, logo, cabeçalho, rodapé, menu)

Visual a partir de `mockups/home.html`, `mockups/imoveis.html` e `logo/logos.html` (conceito B).

**Files:**
- Create: `public/logo/carneiro-ziller.svg` e `public/logo/carneiro-ziller-negativo.svg` (logo B, texto em curvas), `public/logo/simbolo.svg`, `src/app/icon.svg` (favicon do símbolo)
- Create: woff2 de Cormorant Garamond (300, 400, 500, itálico 300 e 400) e Jost (300, 400, 500) em `src/app/fonts/`
- Modify: `src/app/fonts.ts`, `src/app/layout.tsx`, `src/app/globals.css` (`@theme`), `src/styles/cz-site.css` (tokens `.cz`), `src/components/layout/{Logo,Header,Footer,MenuDrawer,SiteChrome}.tsx` (+ testes)
- Delete: `src/components/layout/UtilityBar.tsx` e o uso dele

**Interfaces:**
- Produces: tokens CSS com os nomes da `DIRECAO.md` (`--noite`, `--noite-2`, `--rodape`, `--vinho`, `--champanhe`, `--bronze`, `--grafite`, `--texto`, `--texto-2`, `--prata`, `--areia`, `--areia-2`, `--fundo`, `--marfim`), disponíveis na Home (`@theme`, como `bg-noite`, `text-champanhe`…) e em `.cz`. As variáveis de fonte são `--font-display` (Cormorant) e `--font-sans` (Jost).
- Produces: `<Logo variante="positiva" | "negativa" />`, que desenha o SVG da logo B; `<MarcaDagua />`, um `aria-hidden` com o símbolo e o nome, posicionado no centro embaixo do elemento pai (`position: relative`), para as Tasks 5 e 6.
- Header: transparente sobre a abertura da Home (`variante="sobre-imagem"`) e sólido azul-noite nas demais páginas. Mantém "SOU CORRETOR" e a regra de Lançamentos.

- [ ] **Step 1:** Converter o texto da logo B em curvas.
  - Gerar os paths a partir das fontes com um script em Node com `opentype.js`, instalado temporariamente com `npx` e fora do repo.
  - Conferir o resultado visualmente contra `logo/b-refinamento.svg` por captura do Playwright.
- [ ] **Step 2:** Fontes e tokens. Remover DM Serif e Montserrat do site; o painel usa Jost.
- [ ] **Step 3:** Logo, Header, Footer e MenuDrawer novos, e remoção do UtilityBar.
  - O rodapé traz telefone, WhatsApp, e-mail, endereço e CRECI de `site.ts`, como no mockup.
  - Atualizar os testes de Header, MenuDrawer e SiteChrome. Os nomes acessíveis atuais continuam.
- [ ] **Step 4:** `MarcaDagua` com teste: renderiza o símbolo e é `aria-hidden`.
- [ ] **Step 5:** `npm run test:e2e` (com `npm run db:subir`) verde.
  - Capturar 1440 e 390 de `/`, `/imoveis` e `/contato` e comparar com os mockups.
  - Corrigir corte, sobreposição e contraste.
- [ ] **Step 6:** commit `feat(visual): identidade nova (logo, fontes, paleta, cabeçalho e rodapé)`.

### Task 4: Página inicial

Visual: `mockups/home.html` e `home-mobile.html`.

**Files:**
- Create: `src/components/home/{Abertura,BuscaAbertura,CardsTipos,CardsRegioes,Destaques}.tsx` (+ testes)
- Modify: `src/app/page.tsx`, `src/components/home/Institutional.tsx`, `src/lib/site.ts` (`abertura`)
- Delete: `Hero.tsx`, `HeroComposition.tsx`, `SearchBox.tsx`, `Regions.tsx`, `Launches.tsx`, `Selected.tsx`, `SectionHeader.tsx`/`SectionLabel.tsx` se ficarem sem uso, e os testes deles

**Interfaces:**
- Consumes: `getDestaquesHome()` (Task 1); `getRegioesHome()`, `Filtros.regiao` (Task 2); `getContagemPorTipo(finalidade)`, `getTemLancamentos()`, `getOpcoesLocalizacao()`, `urlGrid`, `lerFiltros` (existentes); `Logo` e `MarcaDagua` e os tokens (Task 3).
- Produces: `abertura` em `site.ts`: `{ video: null as null | { mp4: string; poster: string }; imagens: readonly { src: string; alt: string }[]; frases: readonly string[] }`.
  - As frases são as 4 da `DIRECAO.md`.
  - As 3 imagens são as do mockup (`public/images/...`).

- [ ] **Step 1: Testes que falham:**
  - `abertura mostra a primeira imagem e a primeira frase sem JavaScript` (render no servidor: a primeira imagem e a primeira frase marcadas como ativas)
  - `com video em site.ts, renderiza <video muted loop playsinline> com poster`
  - `busca da abertura é um form GET para /imoveis com tipo, local, quartos e finalidade`
  - `Filtros avançados leva a /imoveis com o painel aberto`: a âncora ou o parâmetro fica a cargo do implementador, igual na Task 5
  - `aba Lançamentos só aparece com lançamento publicado`
  - `cards de tipo linkam para /imoveis?tipo=… e omitem tipo sem imóvel`
  - `cards de região linkam para /imoveis?regiao=<slug>`
  - `seção de destaques some sem destaques`
- [ ] **Step 2:** rodar → FAIL.
- [ ] **Step 3:** Implementar fiel ao mockup.
  - Troca de imagem e de frase a cada ~6 s no cliente, pausada com `prefers-reduced-motion`.
  - Imagens via `next/image`, só a primeira com `priority`.
  - O institucional fala de uma empresa só, sem "duas unidades". O texto é o do mockup, mas "Duas trajetórias. Uma só assinatura." continua, porque é a história da união.
- [ ] **Step 4:** Rodar vitest, e2e e capturas 1440/390 comparadas com o mockup. Commit `feat(home): abertura com imagens e frases, busca de 4 filtros, tipos, regiões e destaques`.

### Task 5: Busca (/imoveis) e card de imóvel

Visual: `mockups/imoveis.html`.

**Files:**
- Modify: `src/components/imoveis/{FiltrosImoveis,Resultados,ImoveisView,CardImovel,Dropdown}.tsx` (+ testes), `src/app/imoveis/page.tsx`, `src/styles/cz-site.css`
- Modify: `src/components/ui/PropertyCard.tsx`, se a Home a usar para destaques. Deve haver um card só de imóvel, compartilhado entre a busca, os destaques e os semelhantes.

**Interfaces:**
- Consumes: `Filtros.regiao`, `regiaoPorSlug`, `REGIOES` (Task 2); `MarcaDagua` (Task 3).
- Produces: `<CardImovel imovel={ImovelCard} />`, usado também pelas Tasks 4 e 6.
  - Foto 4:3 com `MarcaDagua` e etiqueta de finalidade.
  - Bairro · cidade, título, "área · quartos · vagas" e preço.

- [ ] **Step 1: Testes que falham:**
  - `mostra Tipo, Cidade, Bairro e Quartos fora dos avançados`
  - `preço, área, vagas, suítes, texto, características e ordenação ficam em Filtros avançados`
  - `avançados abre sozinho quando a URL tem algum filtro avançado`
  - `Bairro tem o grupo Regiões com os pares e escolher um grava regiao`
  - `card de imóvel tem marca d'água aria-hidden e o preço`
  - `chips continuam removendo cada filtro, incluindo regiao`
- [ ] **Step 2:** FAIL → implementar fiel ao mockup → verde.
  - Os atalhos por tipo acima do grid saem.
  - Cidade e Bairro no desktop e no drawer do celular.
- [ ] **Step 3:** e2e e capturas 1440/390; commit `feat(busca): filtros principais e avançados, card de imóvel novo`.

### Task 6: Página do imóvel

Visual: `mockups/imovel.html`.

**Files:**
- Create: `src/components/imovel/{GaleriaMosaico,TelaCheia,Compartilhar,Semelhantes}.tsx` (+ testes)
- Modify: `src/components/imovel/ImovelTela.tsx`, `src/app/imovel/[id]/page.tsx`, `src/styles/cz-imovel.css`
- Delete: `src/components/imovel/Galeria.tsx` se for substituída

**Interfaces:**
- Consumes: `getSemelhantes(id)` (Task 2), `CardImovel` (Task 5), `MarcaDagua` (Task 3), `mensagemWhatsAppImovel`, `linkWhatsApp` (existentes).

- [ ] **Step 1: Testes que falham:**
  - `mosaico com 1, 2 e 3+ fotos sem espaço vazio; sem foto usa a imagem padrão`
  - `Ver as N fotos abre a tela cheia na foto clicada; ←/→ navegam, Esc fecha e devolve o foco ao botão`
  - `deslizar (pointer events) para a esquerda avança e para a direita volta`
  - `toda foto da galeria e da tela cheia tem MarcaDagua`
  - `nome do condomínio aparece logo abaixo do título quando existe`
  - `Compartilhar usa navigator.share quando existe; sem ele, mostra WhatsApp e Copiar link` (com `navigator.clipboard` mockado)
  - `Semelhantes some sem itens e mostra até 3 cards`
  - `indisponível mantém o aviso e mostra semelhantes`
- [ ] **Step 2:** FAIL → implementar fiel ao mockup → verde.
  - Tela cheia em `dialog` acessível (`useDialog`/`Portal` existentes).
  - Barra fixa do celular no visual novo.
- [ ] **Step 3:** e2e, capturas 1440/390 de um imóvel com muitas fotos e de um com 1 foto. Commit `feat(imovel): galeria em mosaico com tela cheia, compartilhar e semelhantes`.

### Task 7: Páginas restantes e revisão visual geral

**Files:**
- Modify: `src/components/institucional/PaginaInstitucional.tsx`, `src/app/not-found.tsx`, `src/components/imovel/BarraVolta.tsx`, a tela de entrada do painel (logo nova), `src/lib/painel/emails.ts` (nome/logo no cabeçalho do e-mail, se houver imagem), `src/styles/cz-site.css`

- [ ] **Step 1:** Passar Contato, Sobre, Privacidade, 404, "Voltar aos resultados" e a entrada do painel para o visual novo, sem mudar o conteúdo.
- [ ] **Step 2:** Remover CSS, imagens e componentes que ficaram sem uso; conferir com `grep` que nada mais os importa.
- [ ] **Step 3:** Rodar o e2e completo e capturar 1440/390 de todas as páginas públicas. Corrigir o que divergir do mockup ou cortar.
- [ ] **Step 4:** commit `feat(visual): páginas institucionais, 404 e limpeza`.
