# Prioridade 1 do feedback — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Deixar o site pronto para divulgação: marca única, contatos visíveis no painel, páginas institucionais, busca com ordenação/localização/categorias, menu sem seções vazias, relatório de cadastro e SEO básico.

**Architecture:** Next 16 (`cacheComponents`) com Postgres/Drizzle. O site lê imóveis só por `src/lib/imoveis/index.ts` (cache com `TAG_IMOVEIS`); os filtros vivem na URL (`src/lib/imoveis/filtros.ts`); o painel tem lógica em `src/lib/painel/` e permissões em `regras.ts`. Cada tarefa segue esses padrões.

**Tech Stack:** Next.js 16, React 19, TypeScript, Drizzle + PGlite nos testes, Vitest, Playwright, Tailwind v4 (Home) e CSS `.cz` (grid/imóvel/institucionais).

**Spec:** `docs/superpowers/specs/2026-11-04-prioridade-1-design.md`

## Global Constraints

- Código, comentários, identificadores, textos de interface e commits em **português do Brasil**.
- Toda URL vem de `src/lib/routes.ts` (`routes` / `painel`); nunca caminho fixo em componente.
- **Nenhum endereço de imóvel** (`endereco`, `numero`, `complemento`, `cep`) em página pública, JSON-LD, sitemap, e-mail ou no CSV do relatório.
- Contato da empresa (decisão do usuário): nome "Carneiro & Ziller Imóveis", CRECI "CRECI 7904", telefone "(31) 99539-5988", WhatsApp "5531995395988", e-mail "contato@carneiroinvestimoveis.com.br", endereço ["Alameda Oscar Niemeyer, 288", "Vale do Sereno, Nova Lima - MG"]. Só em `src/lib/site.ts`.
- Sob `cacheComponents`, `await searchParams`/`params` só dentro do filho em `<Suspense>`; leituras do catálogo passam por funções `"use cache"` com `marcar()` em `src/lib/imoveis/index.ts`.
- Testes ao lado do código (`*.test.ts(x)`); banco de teste = `src/lib/dados/testes.ts` (PGlite). Nomes acessíveis usados pelos e2e existentes não mudam.
- Sem mudança visual ampla (Prioridade 2): reaproveitar classes de `cz-site.css`, `cz-imovel.css`, `cz-painel.css`; CSS novo só o mínimo, no mesmo arquivo da área.
- Cada commit termina com:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_01216krGpfPbhdeQmoTvm6De
  ```
- Verificação de cada tarefa: `npm test`, `npm run typecheck`, `npm run lint` verdes.

## Review Focus

1. `local` com acento/caixa diferente ("vila da serra, nova lima") ou bairro que existe em duas cidades — casa por texto normalizado e sempre pelo par bairro+cidade (Task 6).
2. Ordenar por preço em "Alugar" com imóvel de venda que tem `valorLocacao` — usa o aluguel; sem valor vai para o fim (Task 6).
3. POST de contato sem `imovelId` e com `origem` diferente de "contato" — recusado como hoje (Task 2).
4. Corretor e lead de imóvel que mudou de responsável — visibilidade pelo responsável **atual** do imóvel (Task 2).
5. Imóvel com `endereco`/`cep` preenchidos não vaza no sitemap nem no JSON-LD (Task 9).

---

### Task 1: Marca única

**Files:**
- Modify: `src/lib/site.ts`, `src/components/layout/Footer.tsx`, `src/components/layout/UtilityBar.tsx`, `src/components/layout/SiteChrome.tsx`, `src/components/layout/MenuDrawer.tsx`, `src/lib/painel/emails.ts`, `src/components/home/Hero.tsx`
- Test: `src/lib/site.test.ts`

**Interfaces:**
- Produces: `export const empresa: { nome; creci; telefone; whatsapp; email; endereco: readonly [string, string] }` e `export function linkWhatsApp(mensagem?: string): string` (`https://wa.me/5531995395988` + `?text=` com `encodeURIComponent` quando houver mensagem) em `src/lib/site.ts`. `social` continua, mas com valores `null` enquanto não houver URL; componentes só mostram o ícone com URL real. `unidades` e `crecis` deixam de existir.

- [ ] **Step 1: Teste** `src/lib/site.test.ts`:
  - `linkWhatsApp()` → `"https://wa.me/5531995395988"`; `linkWhatsApp("Olá! CZ1241")` → `"https://wa.me/5531995395988?text=Ol%C3%A1!%20CZ1241"`.
  - `empresa.endereco` → `["Alameda Oscar Niemeyer, 288", "Vale do Sereno, Nova Lima - MG"]`.
  - Varredura: lê recursivamente `src/**/*.{ts,tsx}` (exceto `*.test.*`) e espera que nenhum contenha `"Unidade Carneiro"`, `"Unidade Ziller"`, `"UNIDADE CARNEIRO"`, `"UNIDADE ZILLER"`, `"2 unidades"`, `"zillerimoveis"`, `"99981-0164"`, `"36.697"`.
- [ ] **Step 2:** `npx vitest run src/lib/site.test.ts` → FAIL.
- [ ] **Step 3:** Implementar `empresa`/`linkWhatsApp` e atualizar os consumidores: rodapé com **um** bloco (nome, CRECI, telefone, link de WhatsApp "WHATSAPP" para `linkWhatsApp()`, e-mail, endereço); UtilityBar, Topbar do SiteChrome e MenuDrawer com "Carneiro & Ziller · (31) 99539-5988" e o CRECI; rodapé dos e-mails com `empresa`. Hero: o destaque `"2 unidades"` vira `{ title: "Alto padrão", caption: "BH e Nova Lima" }`.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint` → verdes (ajuste testes/e2e existentes que citavam as unidades).
- [ ] **Step 5:** Commit `feat(site): marca única com um só contato e endereço`.

### Task 2: Contatos — backend e permissões

**Files:**
- Modify: `src/lib/interesse/servidor.ts`, `src/lib/interesse/enviar.ts`, `src/lib/painel/regras.ts`
- Create: `src/lib/painel/contatos.ts`
- Test: `src/lib/interesse/servidor.test.ts` (existente, ampliar), `src/lib/painel/contatos.test.ts`

**Interfaces:**
- Consumes: tabela `interesses` (sem migration: `codigo` = `""` e `imovelId` = `null` no contato geral; `url` já existe).
- Produces:
  - `registrarInteresse` aceita `origem: "contato"` **sem** `imovelId` (grava `imovelId: null`, `codigo: ""`; avisos para ADMIN + `LEADS_EMAIL`, `emailInteresse` com `imovel: null`). Com `imovelId` vazio e outra origem → `{ ok: false, erro: "dados" }`. `url` passa a ser gravada só como caminho+query (`new URL(url).pathname + search`, ou `""` se inválida).
  - `enviar.ts`: `enviarContato(campos: CamposInteresse): Promise<void>` (mesmo endpoint, `origem: "contato"`, sem imóvel). `enviarInteresse` continua igual.
  - `regras.ts`: `podeVerContato(u: UsuarioLogado, c: { responsavelId: string | null }): boolean` — ADMIN sempre; corretor só quando `responsavelId === u.id`.
  - `contatos.ts`: `listarContatos(u: UsuarioLogado, pagina: number, db?: Db): Promise<{ itens: LinhaContato[]; total: number; pagina: number; paginas: number }>` com `export const CONTATOS_POR_PAGINA = 30` e `type LinhaContato = { id; criadoEm: Date; nome; telefone; email; observacoes; origem; pagina: string; imovel: { id: string; codigo: string; titulo: string } | null }`. Mais recentes primeiro. `responsavelId` vem do **responsável atual** do imóvel (join `imoveis`); filtro de permissão no SQL (corretor: `imoveis.responsavel_id = u.id`).

- [ ] **Step 1: Testes** (PGlite):
  - `registrarInteresse({ origem: "contato", nome, telefone: "+5531999999999", email, observacoes: "Quero vender" , url: "https://carneiroziller.com.br/contato?x=1" }, "1.1.1.1")` → `ok`, linha com `imovelId null`, `codigo ""`, `url "/contato?x=1"`; avisos só para ADMIN e `LEADS_EMAIL` (nenhum corretor).
  - Sem `imovelId` e `origem: "site"` → `erro: "dados"`.
  - `listarContatos(admin, 1)` vê lead geral + leads de imóveis de corretores; `listarContatos(corretorA, 1)` vê só os do imóvel cujo responsável **atual** é A (troque o responsável depois do lead e confirme que passa a ser visto pelo novo); lead geral e de imóvel excluído não aparecem para corretor.
  - Paginação: 31 leads → `paginas: 2`, página 2 com 1 item; `pagina` fora do intervalo é ajustada.
- [ ] **Step 2:** Rodar os dois arquivos → FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5:** Commit `feat(contatos): contato geral sem imóvel e listagem com permissão`.

### Task 3: Tela "Contatos" no painel

**Files:**
- Create: `src/app/painel/(app)/contatos/page.tsx`, `src/components/painel/contatos/ListaContatos.tsx`
- Modify: `src/lib/routes.ts` (`painel.contatos = "/painel/contatos"`), `src/components/painel/Shell.tsx` (item "Contatos" entre Imóveis e Usuários, visível para todos). `destinoSeguro` já aceita o caminho.
- Test: `src/components/painel/contatos/ListaContatos.test.tsx`, `e2e/painel.spec.ts` (um caso)

**Interfaces:**
- Consumes: `listarContatos`, `LinhaContato`, `CONTATOS_POR_PAGINA` (Task 2); `exigirUsuario(painel.contatos)`; `data`/`hora` de `src/lib/painel/datas.ts`.
- Produces: página `/painel/contatos?pagina=N`.

- [ ] **Step 1: Teste do componente:** com 2 linhas (uma com imóvel CZ1241, uma geral) renderiza, por linha: data e hora, nome, telefone como link `tel:` e link "WhatsApp" para `https://wa.me/<dígitos>`, e-mail como `mailto:`, observações, imóvel como link para `painel.imovel(id)` (ou "Contato geral"), e a página de origem. Sem linhas: texto "Nenhum contato recebido ainda." Paginação com links `?pagina=`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar no estilo da lista de imóveis (`cz-painel.css`, tabela no desktop, cartões abaixo de 900px como a lista existente). `metadata.title = "Contatos"`.
- [ ] **Step 4:** e2e em `painel.spec.ts`: enviar um interesse pelo formulário de um imóvel, entrar como ADMIN, abrir "Contatos" e ver o nome enviado. `npm test && npm run typecheck && npm run lint`; `npm run test:e2e -- e2e/painel.spec.ts`.
- [ ] **Step 5:** Commit `feat(painel): tela de contatos recebidos`.

### Task 4: Páginas Contato, Sobre nós e Política de privacidade

**Files:**
- Create: `src/app/contato/page.tsx`, `src/app/sobre/page.tsx`, `src/app/politica-de-privacidade/page.tsx`, `src/components/institucional/PaginaInstitucional.tsx`, `src/components/institucional/FormularioContato.tsx`
- Modify: `src/styles/cz-site.css` (mínimo), `e2e/behavior-site.spec.ts` (as três páginas na lista do axe e um teste de envio do formulário de contato)
- Test: `src/components/institucional/FormularioContato.test.tsx`

**Interfaces:**
- Consumes: `empresa`, `linkWhatsApp` (Task 1); `enviarContato` (Task 2); validação de `src/lib/interesse/validacao.ts` (mesmos campos e mensagens do formulário do imóvel, com "Observações" rotulado "Mensagem").
- Produces: as rotas `routes.contato`, `routes.sobre`, `routes.privacidade` respondendo 200 dentro do `SiteChrome` (sem `current` novo: `NavKey` já tem "contato" e "sobre").

Copy fixa (usar exatamente):

**/contato** — h1 "Fale com a Carneiro & Ziller"; intro "Atendimento personalizado para comprar, vender ou alugar imóveis de alto padrão em Belo Horizonte e Nova Lima."; bloco de contato com WhatsApp (botão "FALAR NO WHATSAPP" → `linkWhatsApp("Olá! Vim pelo site da Carneiro & Ziller.")`), telefone, e-mail, CRECI e endereço; formulário "Envie uma mensagem" com botão "ENVIAR MENSAGEM"; sucesso "Mensagem enviada. Nossa equipe vai falar com você em breve."; falha igual à do formulário do imóvel.

**/sobre** — h1 "Sobre a Carneiro & Ziller"; parágrafos:
1. "A Carneiro & Ziller Imóveis nasceu da união de duas imobiliárias com atuação em Belo Horizonte e Nova Lima. Hoje somos uma única empresa, com uma única equipe e o mesmo compromisso com cada cliente."
2. "Trabalhamos com imóveis de alto padrão: apartamentos, coberturas, casas em condomínio e terrenos nos bairros e condomínios mais desejados da região."
3. "Cada atendimento é conduzido de perto, da primeira visita à entrega das chaves, com conhecimento do mercado local e discrição."
CTA "VER IMÓVEIS" (`routes.imoveis`) e "FALE CONOSCO" (`routes.contato`).

**/politica-de-privacidade** — h1 "Política de privacidade"; seções com h2, nesta ordem e conteúdo:
- "Quem somos": a Carneiro & Ziller Imóveis (CRECI 7904), endereço da empresa, é a controladora dos dados pessoais tratados neste site.
- "Quais dados coletamos": nos formulários, nome, telefone, e-mail, a mensagem e o imóvel de interesse; para limitar abusos, um código derivado do endereço IP (não guardamos o IP); o site não usa cookies de publicidade.
- "Para que usamos": responder ao contato, agendar visitas e oferecer imóveis relacionados ao pedido (base legal: procedimentos preliminares a contrato e legítimo interesse, LGPD art. 7º, V e IX).
- "Com quem compartilhamos": só com a equipe da Carneiro & Ziller e com os sistemas que usamos para atender (e-mail e CRM); não vendemos dados.
- "Por quanto tempo guardamos": enquanto houver atendimento em andamento e, depois, pelo prazo exigido por lei ou até o pedido de exclusão.
- "Seus direitos": confirmar o tratamento, acessar, corrigir, pedir a exclusão ou a portabilidade e revogar o consentimento, escrevendo para o e-mail da empresa.
- "Contato": e-mail e telefone da empresa (de `empresa`).
- Rodapé da página: "Atualizada em 4 de novembro de 2026."

Cada página: `metadata` com `title` "<Título> — Carneiro & Ziller Imóveis" e `description` de uma frase.

- [ ] **Step 1: Teste do `FormularioContato`:** campos inválidos mostram as mesmas mensagens do formulário do imóvel; envio válido chama `enviarContato` com os campos e mostra a mensagem de sucesso; falha mantém os dados e mostra o erro.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar as três páginas com `PaginaInstitucional` (título, conteúdo, largura de leitura) dentro de `SiteChrome`.
- [ ] **Step 4:** e2e: `/contato`, `/sobre`, `/politica-de-privacidade` entram na lista do axe; teste "contato geral chega" envia o formulário e espera a mensagem de sucesso. `npm test && npm run typecheck && npm run lint && npm run test:e2e -- e2e/behavior-site.spec.ts`.
- [ ] **Step 5:** Commit `feat(site): páginas de contato, sobre nós e política de privacidade`.

### Task 5: WhatsApp na página do imóvel

**Files:**
- Modify: `src/components/imovel/ImovelTela.tsx` (botão ao lado dos dois `BotaoAgendar`), `src/app/imovel/[id]/page.tsx` (passa a URL absoluta), `src/styles/cz-imovel.css`
- Create: `src/lib/imoveis/whatsapp.ts`
- Test: `src/lib/imoveis/whatsapp.test.ts`, caso no `e2e/behavior-site.spec.ts`

**Interfaces:**
- Consumes: `linkWhatsApp` (Task 1); `urlDoSite()` de `src/lib/config.ts`.
- Produces: `mensagemWhatsAppImovel(i: { codigo: string; titulo: string }, url: string): string` → `"Olá! Tenho interesse no imóvel CZ1241 — Luxuoso apartamento à venda em Nova Lima. https://carneiroziller.com.br/imovel/cz1241"` (código em maiúsculas; URL sem `?de=`).

- [ ] **Step 1: Teste** do formato exato acima e de que `linkWhatsApp(mensagemWhatsAppImovel(...))` começa com `https://wa.me/5531995395988?text=Ol%C3%A1!%20Tenho%20interesse%20no%20im%C3%B3vel%20CZ1241`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar; botão `<a>` "WHATSAPP" (`target="_blank" rel="noopener"`), com o mesmo peso visual do "AGENDAR VISITA" em versão secundária (contorno), na ficha e na barra fixa do celular.
- [ ] **Step 4:** e2e: em `/imovel/cz1009` existe o link "WHATSAPP" cujo `href` contém o código. `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5:** Commit `feat(imovel): botão de WhatsApp com o código do imóvel`.

### Task 6: Busca — ordenação, localização, 24 por página e categorias (biblioteca)

**Files:**
- Modify: `src/lib/imoveis/filtros.ts`, `src/lib/imoveis/catalogo.ts`, `src/lib/imoveis/index.ts`, `src/lib/imoveis/types.ts`
- Test: `src/lib/imoveis/filtros.test.ts`, `src/lib/imoveis/catalogo.test.ts` (existentes, ampliar)

**Interfaces:**
- Produces:
  - `Filtros` ganha `local?: string` e `ordem?: Ordem`, com `export type Ordem = "maior-preco" | "menor-preco" | "maior-area"` e `export const ORDENS: readonly { valor: Ordem | undefined; rotulo: string }[]` = `[{undefined,"Mais recentes"},{"maior-preco","Maior preço"},{"menor-preco","Menor preço"},{"maior-area","Maior área"}]`.
  - `lerFiltros`: `ordem` validada contra `ORDENS`; `local` = texto aparado, até 80 caracteres (validação contra o catálogo fica em `validarLocal`). `filtrosParaQuery` coloca `local` depois de `q` e `ordem` antes de `pagina`. `rotulosFiltros`: `local` vira chip com o próprio texto; `ordem` **não** é chip nem conta em `contarFiltrosPainel`. `semFiltro(..., "local")` funciona.
  - Valor de `local`: `"<Cidade>"` (cidade inteira) ou `"<Bairro>, <Cidade>"`. Comparação por texto normalizado (sem acento, minúsculo).
  - `catalogo.ts`: `POR_PAGINA = 24`; ordem padrão = `publicadoEm` desc (empate por código); `maior-preco`/`menor-preco` pelo valor da finalidade filtrada (em "alugar", imóvel de venda usa `valorLocacao`), sem valor por último; `maior-area` por `area` desc.
  - `opcoesLocalizacao(db?): Promise<{ cidade: string; bairros: string[] }[]>` — cidades e bairros dos publicados, ordenados alfabeticamente (pt-BR).
  - `validarLocal(filtros: Filtros, opcoes: { cidade: string; bairros: string[] }[]): Filtros` — remove `local` que não exista nas opções; reescreve para a grafia canônica do catálogo.
  - `contarPorTipo(finalidade: FinalidadeFiltro | undefined, db?): Promise<{ tipo: string; total: number }[]>` — só tipos com total > 0, na ordem de `TIPOS`.
  - `index.ts`: wrappers `"use cache"` + `marcar()` para `getOpcoesLocalizacao()` e `getContagemPorTipo(finalidade)`.

- [ ] **Step 1: Testes:**
  - `lerFiltros(new URLSearchParams("ordem=maior-preco&local=Vila da Serra, Nova Lima"))` → `{ ordem: "maior-preco", local: "Vila da Serra, Nova Lima", pagina: 1 }`; `ordem=xyz` descartada; `filtrosParaQuery` dá `local=...&ordem=maior-preco` na ordem canônica; `contarFiltrosPainel({ ordem: "maior-preco", pagina: 1 })` → 0.
  - `validarLocal({ local: "vila da serra, nova lima", pagina: 1 }, [{ cidade: "Nova Lima", bairros: ["Vila da Serra"] }])` → `local: "Vila da Serra, Nova Lima"`; `local: "Inexistente"` → sem `local`; mesmo bairro em duas cidades só casa com a cidade escrita.
  - `buscarImoveis`: 25 publicados → `paginas: 2` (24 + 1); `ordem: "menor-preco"` com `finalidade: "alugar"` usa `valorLocacao` do imóvel de venda; imóvel sem valor no fim; sem `ordem` vem do `publicadoEm` mais recente ao mais antigo; `local: "Nova Lima"` traz só Nova Lima; `local: "Vila da Serra, Nova Lima"` só esse bairro.
  - `contarPorTipo(undefined)` não inclui tipo com zero; `contarPorTipo("alugar")` conta só os que combinam com "alugar".
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`.
- [ ] **Step 5:** Commit `feat(busca): ordenação, localização, 24 por página e contagem por tipo`.

### Task 7: Busca — interface

**Files:**
- Modify: `src/app/imoveis/page.tsx` (lê opções e contagem, aplica `validarLocal`), `src/components/imoveis/ImoveisView.tsx`, `src/components/imoveis/FiltrosImoveis.tsx`, `src/components/imoveis/Resultados.tsx`, `src/styles/cz-site.css`
- Test: `src/components/imoveis/*.test.tsx` existentes (ampliar) e `e2e/behavior-site.spec.ts`

**Interfaces:**
- Consumes: Task 6 inteira.
- Produces: na tela do grid: (a) dropdown **"Localização"** no painel de filtros (desktop e drawer do celular) com opções agrupadas por cidade: em cada grupo, primeiro "Toda a cidade" (valor `"<Cidade>"`), depois os bairros (valor `"<Bairro>, <Cidade>"`); (b) seletor **"Ordenar por"** junto à contagem de resultados (fora do drawer, visível também no celular), com `ORDENS`; mudar a ordem volta para a página 1; (c) **atalhos por categoria** acima dos resultados: links "Apartamento (168)" etc. para `urlGrid({ ...filtros, tipo, pagina: 1 })`, com `aria-current` no tipo ativo e um "Todos" que limpa `tipo`; só tipos com total > 0.

- [ ] **Step 1: Testes de componente:** escolher "Maior preço" chama `onAplicar` com `ordem: "maior-preco", pagina: 1`; a Localização lista "Nova Lima" › "Toda a cidade", "Vila da Serra"; os atalhos não mostram tipo com zero e marcam o ativo.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar reaproveitando `Dropdown` e as classes existentes.
- [ ] **Step 4:** e2e: em `/imoveis`, ordenar por "Menor preço" muda a URL para `ordem=menor-preco` e o primeiro card fica com o menor valor; abrir um imóvel e "Voltar aos resultados" mantém `local` e `ordem`; em 390px os filtros novos aparecem no drawer sem rolagem horizontal; axe sem violações. `npm test && npm run typecheck && npm run lint && npm run test:e2e`.
- [ ] **Step 5:** Commit `feat(busca): localização, ordenação e atalhos por categoria no grid`.

### Task 8: Esconder "Lançamentos" enquanto estiver vazio

**Files:**
- Modify: `src/lib/routes.ts`, `src/lib/imoveis/catalogo.ts`, `src/lib/imoveis/index.ts`, `src/components/layout/Header.tsx`, `src/components/layout/SiteChrome.tsx`, `src/components/layout/Footer.tsx` (o `MenuDrawer` recebe os itens já filtrados)
- Test: `src/lib/routes.test.ts` (novo), `src/lib/imoveis/catalogo.test.ts`

**Interfaces:**
- Produces: `itensNavegacao(temLancamentos: boolean): typeof navItems` em `routes.ts`; `temLancamentos(db?): Promise<boolean>` em `catalogo.ts` + `getTemLancamentos()` cacheado em `index.ts`. Header, SiteHeader e Footer passam a ser `async` e usam `itensNavegacao(await getTemLancamentos())`. A seção Lançamentos da Home já some sozinha (`Launches.tsx`).

- [ ] **Step 1: Testes:** `itensNavegacao(false)` não tem a chave "lancamentos" e mantém a ordem das demais; `itensNavegacao(true)` = `navItems`; `temLancamentos` falso sem publicado marcado, verdadeiro com um.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar. Se o Header virar `async` e quebrar o prerender (`cacheComponents`), envolver em `<Suspense>` com o header estático de fallback — nunca ler dados sem cache.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint && npm run test:e2e` (os e2e que clicam em "Lançamentos" passam a rodar com um lançamento semeado no `cz_e2e`, ou se adaptam — sem remover cobertura).
- [ ] **Step 5:** Commit `feat(site): menu sem Lançamentos enquanto não houver lançamento`.

### Task 9: Google — sitemap, robots, metadados e JSON-LD

**Files:**
- Create: `src/app/sitemap.ts`, `src/app/robots.ts`, `src/lib/imoveis/seo.ts`
- Modify: `src/app/layout.tsx` (description e openGraph padrão), `src/app/page.tsx` (metadata da Home com `openGraph.images` da foto do Hero), `src/app/imovel/[id]/page.tsx` (script JSON-LD), `src/lib/imoveis/catalogo.ts` + `index.ts` (lista para o sitemap)
- Test: `src/lib/imoveis/seo.test.ts`, `src/app/sitemap.test.ts`

**Interfaces:**
- Produces:
  - `listarParaSitemap(db?): Promise<{ id: string; alteradoEm: string }[]>` (só publicados) + wrapper cacheado `getSitemapImoveis()`.
  - `sitemap()`: Home, `routes.imoveis`, `routes.lancamentos` só com `getTemLancamentos()` verdadeiro, `routes.contato`, `routes.sobre`, `routes.privacidade` e cada imóvel (`routes.imovel(id)`, `lastModified` = `alteradoEm`), todos absolutos com `urlDoSite()`.
  - `robots()`: `allow: "/"`, `disallow: ["/painel", "/api"]`, `sitemap: <urlDoSite()>/sitemap.xml`.
  - `jsonLdImovel(i: Imovel, url: string): Record<string, unknown>` — `@type: "RealEstateListing"`, `name`, `description` (1º parágrafo), `url`, `image` (até 5 fotos), `offers: { @type: "Offer", price, priceCurrency: "BRL" }`, `about.address` só com `addressLocality` (cidade), `addressRegion` (UF) e `addressCountry: "BR"`; **nenhum** campo de endereço/bairro detalhado.
- [ ] **Step 1: Testes:** `jsonLdImovel` de um imóvel com `endereco`, `numero` e `cep` preenchidos não contém esses valores em `JSON.stringify`; preço e moeda corretos. `sitemap()` com dados de teste lista os imóveis publicados (não rascunho/indisponível) e omite lançamentos quando não há; `robots()` bloqueia `/painel` e `/api`.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar; JSON-LD em `<script type="application/ld+json">` com o JSON escapado (`<` → `<`).
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`; `npm run build` local passa (com `db:subir`).
- [ ] **Step 5:** Commit `feat(seo): sitemap, robots, metadados da Home e JSON-LD do imóvel`.

### Task 10: Relatório de cadastro para a equipe

**Files:**
- Create: `scripts/relatorio-cadastro.ts`, `scripts/cadastro/relatorio.ts`
- Modify: `package.json` (`"cadastro:relatorio": "tsx --conditions=react-server scripts/relatorio-cadastro.ts"`), `deploy/deploy.sh` (modo `relatorio-cadastro`, com `carregar_env` + `abrir_tunel` como `importar-loft`), `.gitignore` (`relatorio-cadastro-*.csv`), `deploy/README.md` (uma seção curta)
- Test: `scripts/cadastro/relatorio.test.ts`

**Interfaces:**
- Produces: `montarRelatorio(db: Db): Promise<{ problemas: LinhaProblema[]; duplicados: GrupoDuplicado[] }>` e `paraCsv(r): string`.
  - `LinhaProblema = { codigo; titulo; situacao; problemas: string[] }` para publicados e rascunhos, com problemas entre: `"sem área"`, `"sem finalidade"`, `"sem valor"`, `"descrição cita rua e número"` (regex: `\b(rua|r\.|avenida|av\.|alameda|al\.|travessa|praça)\s+[^\n,]{2,60},?\s*(n[º°o.]*\s*)?\d{1,5}\b`, sem diferenciar maiúsculas).
  - `GrupoDuplicado = { codigos: string[]; motivo: string }`: mesmo `tipo` e mesmo `empreendimento` (ou, sem empreendimento, mesmo `bairro`+`cidade`), com área e valor iguais ou a até ±2% entre si.
  - CSV com `;` como separador (Excel pt-BR), BOM UTF-8, duas seções com cabeçalho; **sem** endereço, número, complemento ou CEP.
  - O script grava `relatorio-cadastro-AAAA-MM-DD.csv` na raiz e imprime os totais.
- [ ] **Step 1: Testes:** imóvel sem área aparece com "sem área"; descrição "Rua Montes Claros, 395" é marcada e "na Rua dos Timbiras, no bairro Lourdes" não; dois imóveis do mesmo empreendimento, tipo, área 200 e 202, valor 1.000.000 e 1.010.000 → um grupo; área 200 vs 210 → nenhum; o CSV não contém o `endereco` nem o `cep` dos imóveis de teste.
- [ ] **Step 2:** FAIL.
- [ ] **Step 3:** Implementar.
- [ ] **Step 4:** `npm test && npm run typecheck && npm run lint`; `npm run cadastro:relatorio` contra o banco local gera o arquivo.
- [ ] **Step 5:** Commit `feat(cadastro): relatório de avisos e prováveis duplicados`.
