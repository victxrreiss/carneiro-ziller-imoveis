# Importação da Loft e ficha completa — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Importar os 422 imóveis da Loft (feed VRSync + 2 planilhas CSV) para o banco do site, ampliar a ficha do imóvel (painel, grid e página) e permitir senha provisória com troca obrigatória.

**Architecture:** A ficha nova é um conjunto de colunas opcionais em `imoveis`. O site público só enxerga essas colunas pelo tipo `Imovel` (sem endereço). O importador é um script em `scripts/loft/`, separado em três partes: parse puro (feed/CSV), mapeamento puro para o formato do banco, e gravação idempotente com armazenamento e download injetáveis. Ele roda da máquina do dev pelo túnel do `deploy/deploy.sh`, como os outros scripts de produção. A senha provisória reaproveita `senhaHash` e acrescenta uma flag de troca obrigatória, conferida em `sessao.ts`.

**Tech Stack:** Next 16 (App Router, `cacheComponents`), React 19, TypeScript strict, Drizzle + Postgres (PGlite nos testes), Vitest + Testing Library, Playwright, `tsx` para scripts, `sharp` (já instalado pelo Next) para ler as dimensões das fotos.

**Spec:** `docs/superpowers/specs/2026-10-29-importacao-loft-e-ficha-completa-design.md`

## Global Constraints

- Código, comentários, identificadores, textos de UI e commits em **português do Brasil**.
- **Endereço** (`endereco`, `numero`, `complemento`, `cep`) e `referenciaLoft` **nunca** chegam ao site público: nem no tipo `Imovel`/`ImovelResumo`, nem na busca `q`, nem em metadados.
- Nenhuma URL do feed, nenhum endereço real e nenhum e-mail real em arquivo versionado. As fixtures são anonimizadas.
- Nada de exclusão em massa no banco ou no bucket. Remover só linhas e chaves identificadas.
- `LIMITES.fotos` passa de 40 para **60**.
- `TIPOS` ganha **"Studio"** e **"Loft"**.
- Situação: no feed → `publicado`. Ativo fora do feed (só em `imoveis.csv`) → `rascunho`. Em `imoveis filtro.csv` (Pendente/Suspenso) → `rascunho`. Vendido/Alugado → `indisponivel`.
- Responsável dos importados: o usuário cujo e-mail é passado ao script (em produção, `matheusenrico@hotmail.com`). O script falha se ele não existir.
- Senha provisória: aleatória, mostrada uma vez ao ADMIN, válida por **72 h**, troca obrigatória antes de qualquer outra tela ou action do painel.
- Migrations só por `npm run db:gerar`. Nunca editar SQL gerado à mão.
- Rodar `npm run lint`, `npm run typecheck` e `npm test` verdes ao fim de cada tarefa.

## Review Focus

1. **Foto do CDN fora do ar ou lenta** (404, timeout, tipo inválido): a importação continua, o imóvel entra sem aquela foto, a falha vai para o relatório, e a rodada seguinte tenta de novo. → teste na Task 8.
2. **Reimportar depois de editar no painel**: o campo editado é preservado, os outros campos e as fotos não editadas são atualizados. → teste na Task 8.
3. **Vazamento de endereço**: buscar no grid público pelo nome da rua ou pelo CEP não encontra o imóvel, e o objeto `Imovel` não tem nenhuma chave de endereço. → teste na Task 4.
4. **Senha provisória vencida, ou usada depois da troca**: o login falha com a mensagem genérica de credenciais. → teste na Task 6.
5. **CSV real da Loft**: BOM, campos entre aspas, `;` dentro de aspas, decimais com ponto (`13617.021276596`), linhas em branco no fim, mojibake (`ImarÃ©s` é texto, não erro). → teste na Task 7.

---

### Task 1: Esquema — ficha ampliada, controle da importação e flag de senha provisória

**Files:**
- Modify: `src/lib/dados/esquema.ts` (tabelas `imoveis`, `usuarios`; tabela nova `importacaoLoft`)
- Create: `drizzle/0001_*.sql` (gerado)
- Modify: `src/lib/dados/tipos.ts` (`RegistroImovel`, `RegistroUsuario`)
- Modify: `src/lib/dados/consultas.ts` (`paraRegistro`)
- Modify: `src/lib/imoveis/filtros.ts` (`TIPOS` + "Studio", "Loft")
- Modify: `src/lib/painel/regras.ts` (`LIMITES.fotos: 60`)
- Create: `src/lib/imoveis/caracteristicas.ts`
- Test: `src/lib/imoveis/caracteristicas.test.ts`, `src/lib/dados/consultas.test.ts` (novo)

**Interfaces:**
- Produces, em `imoveis` (todas anuláveis, menos `caracteristicas`): `banheiros integer`, `suites integer`, `areaTotal integer` (`area_total`), `condominio bigint`, `iptu bigint` (anual), `valorLocacao bigint` (`valor_locacao`), `caracteristicas text[] not null default '{}'`, `andar integer`, `anoConstrucao integer` (`ano_construcao`), `empreendimento text`, `endereco text`, `numero text`, `complemento text`, `cep text`, `referenciaLoft text unique` (`referencia_loft`).
- Produces, em `usuarios`: `trocarSenha boolean not null default false` (`trocar_senha`), `senhaProvisoriaExpiraEm timestamptz` (`senha_provisoria_expira_em`).
- Produces `importacaoLoft` (`importacao_loft`): `referencia text primary key`, `imovelId text references imoveis(id) on delete set null`, `valores jsonb not null` (snapshot dos campos vindos da Loft), `fotosOrigem jsonb not null default '[]'` (URLs de origem, em ordem), `fotoIds jsonb not null default '[]'` (ids das fotos importadas, em ordem), `importadoEm timestamptz not null`.
- Produces em `RegistroImovel`: os mesmos campos com os mesmos nomes camelCase (`caracteristicas: string[]`).
- Produces `src/lib/imoveis/caracteristicas.ts`:
  - `export const CARACTERISTICAS: readonly { chave: string; rotulo: string }[]` (lista fixa, ordem de exibição)
  - `export const CARACTERISTICA_VRSYNC: Record<string, string>` (Feature em inglês → chave)
  - `export function rotuloCaracteristica(chave: string): string | undefined`
  - `export const CARACTERISTICAS_FILTRO: readonly string[]` (chaves que viram filtro rápido no grid)

- [ ] **Step 1: Write the failing tests**

`src/lib/imoveis/caracteristicas.test.ts`:
```ts
test("toda Feature do feed real tem chave, menos 'Number of stories'", () => {
  const doFeed = ["Gym","Maids Quarters","Party Room","Kitchen","Gourmet Area","Playground","Cooling","Pool","Intercom","Fenced Yard","Game room","Tennis court","BBQ","Garden Area","Exterior View","Spa","Home Office","Elevator","Furnished","Sauna","TV Security","Backyard","Fireplace","Laundry","Internet Connection","Balcony","Reception room","Heating","Ocean View","Warehouse"];
  for (const f of doFeed) expect(CARACTERISTICA_VRSYNC[f], f).toBeDefined();
  expect(CARACTERISTICA_VRSYNC["Number of stories"]).toBeUndefined();
});
test("toda chave mapeada existe na lista e tem rótulo em português", () => {
  for (const chave of Object.values(CARACTERISTICA_VRSYNC)) expect(rotuloCaracteristica(chave)).toMatch(/\S/);
  expect(rotuloCaracteristica(CARACTERISTICA_VRSYNC["Pool"])).toBe("Piscina");
  expect(rotuloCaracteristica(CARACTERISTICA_VRSYNC["Gym"])).toBe("Academia");
});
test("filtros rápidos são chaves válidas", () => {
  for (const c of CARACTERISTICAS_FILTRO) expect(rotuloCaracteristica(c)).toBeDefined();
});
```
`src/lib/dados/consultas.test.ts` (PGlite via `criarAmbiente`): insira um imóvel com todos os campos novos preenchidos e confira que `carregarImovel` devolve `banheiros`, `suites`, `areaTotal`, `condominio`, `iptu`, `valorLocacao`, `caracteristicas: ["piscina","academia"]`, `empreendimento`, `endereco`, `numero`, `complemento`, `cep`, `referenciaLoft` iguais aos gravados. Confira também que um imóvel sem eles devolve `null` e `caracteristicas: []`.

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/imoveis/caracteristicas.test.ts src/lib/dados/consultas.test.ts`
Expected: FAIL (módulo e colunas inexistentes).

- [ ] **Step 3: Implement**

Colunas e tabela no `esquema.ts`, no estilo das existentes (`momento()` para timestamptz). Em seguida, `npm run db:gerar` (gera `drizzle/0001_*.sql` + snapshot), tipos, `paraRegistro`, `TIPOS`, `LIMITES.fotos = 60` e `caracteristicas.ts`. Rótulos sugeridos: Academia, Dependência de empregada, Salão de festas, Cozinha, Área gourmet, Playground, Ar-condicionado, Piscina, Interfone, Condomínio fechado (Fenced Yard), Salão de jogos, Quadra de tênis, Churrasqueira, Jardim, Vista panorâmica (Exterior View), Spa, Escritório (Home Office), Elevador, Mobiliado, Sauna, Circuito de TV (TV Security), Quintal, Lareira, Lavanderia, Internet, Varanda, Recepção, Aquecimento, Vista para o mar, Depósito. `CARACTERISTICAS_FILTRO` = piscina, academia, área gourmet, varanda, mobiliado, condomínio fechado.

- [ ] **Step 4: Run tests**

Run: `npx vitest run && npm run typecheck`
Expected: tudo PASS. As migrations aplicam no PGlite (`criarBancoDeTeste`).

- [ ] **Step 5: Commit**

```bash
git add src/lib/dados src/lib/imoveis/caracteristicas* src/lib/imoveis/filtros.ts src/lib/painel/regras.ts drizzle
git commit -m "feat(dados): campos da ficha completa, controle da importação Loft e senha provisória"
```

---

### Task 2: Regras e gravação do painel com os campos novos

**Files:**
- Modify: `src/lib/painel/regras.ts` (`EntradaImovel`, `ImovelValidado`, `validarImovel`, `CampoImovel`, `ORDEM_CAMPOS`)
- Modify: `src/lib/painel/imoveis.ts` (`obterParaEdicao`, `salvarImovel`, `LinhaImovel`, `listarImoveis`)
- Test: `src/lib/painel/painel.test.ts`

**Interfaces:**
- Consumes: colunas da Task 1, `CARACTERISTICAS`.
- Produces em `EntradaImovel` (strings, como os campos numéricos atuais): `banheiros`, `suites`, `areaTotal`, `condominio`, `iptu`, `valorLocacao`, `andar`, `anoConstrucao`, `empreendimento`, `endereco`, `numero`, `complemento`, `cep`, e `caracteristicas: string[]`. Em `ImovelValidado`: os numéricos como `number | null`, os textos com espaços normalizados, e `caracteristicas` filtrado para as chaves de `CARACTERISTICAS`, sem repetição e na ordem da lista.
- Produces em `ImovelEdicao`: `referenciaLoft: string | null` (só leitura).
- Produces em `LinhaImovel`: `referenciaLoft: string | null`, `empreendimento: string | null`.
- Novos `CampoImovel`: `banheiros`, `suites`, `areaTotal`, `condominio`, `iptu`, `valorLocacao`, `andar`, `anoConstrucao`, `cep`.

- [ ] **Step 1: Write the failing tests** (em `painel.test.ts`, com `amb.reiniciar()`)

```ts
test("salva e relê os campos novos", async () => {
  const r = await salvarImovel(amb.admin, null, { ...entradaValida(), banheiros: "3", suites: "2", areaTotal: "450", condominio: "1250", iptu: "4800", valorLocacao: "", andar: "4", anoConstrucao: "2015", empreendimento: "  Edifício   Soho ", endereco: "Rua X", numero: "110", complemento: "403", cep: "34006-083", caracteristicas: ["piscina", "invalida", "academia", "piscina"] }, "publicar", new Date(), amb.db);
  // ...asserções abaixo, sobre obterParaEdicao(amb.admin, r.id, amb.db)
});
```
Valores numéricos chegam só com dígitos (a máscara de milhar é da tela). Afirme:
- `entrada.banheiros === "3"`, `entrada.suites === "2"`, `entrada.areaTotal === "450"`, `entrada.condominio === "1250"`, `entrada.iptu === "4800"`, `entrada.valorLocacao === ""`, `entrada.andar === "4"`, `entrada.anoConstrucao === "2015"`
- `entrada.empreendimento === "Edifício Soho"`, `entrada.cep === "34006-083"`
- `entrada.caracteristicas` igual a `["academia","piscina"]`, na ordem de `CARACTERISTICAS` (ajuste se a ordem da lista for outra) e sem a inválida.

```ts
test("formatos inválidos dos campos novos são erro, vazio não é", async () => {
  const { erros } = validarImovel({ ...entradaValida(), suites: "dois", anoConstrucao: "1700", cep: "abc", condominio: "" }, "publicado");
  expect(erros).toEqual({ suites: "Use só números.", anoConstrucao: "Ano inválido.", cep: "CEP inválido. Use 00000-000." });
});
test("valor de locação só com finalidade venda", () => {
  const { erros } = validarImovel({ ...entradaValida(), finalidade: "locacao", valorLocacao: "5000" }, "publicado");
  expect(erros.valorLocacao).toBe("Use o campo Valor mensal para imóveis de locação.");
});
```
(`entradaValida()` é um helper local que monta uma `EntradaImovel` publicável. Se o arquivo já tiver um equivalente, reutilize.)

- [ ] **Step 2: Run to verify failure** — `npx vitest run src/lib/painel/painel.test.ts`, FAIL.

- [ ] **Step 3: Implement**

Limites: `banheiros`/`suites`/`andar` ≤ 99; `anoConstrucao` entre 1800 e o ano atual + 5; `areaTotal` ≤ 9.999.999; `condominio`/`iptu`/`valorLocacao` ≤ 999.999.999.999; `cep` vazio ou `/^\d{5}-?\d{3}$/`, gravado como `00000-000`; textos ≤ 120 caracteres. Nenhum campo novo é obrigatório. `salvarImovel` grava tudo com `...dados`, como hoje. `obterParaEdicao` preenche a entrada com `digitos()` e `?? ""`.

- [ ] **Step 4: Run** — `npx vitest run src/lib/painel && npm run typecheck`, PASS.

- [ ] **Step 5: Commit** — `git commit -m "feat(painel): regras e gravação dos campos novos da ficha"`

---

### Task 3: Painel — formulário e lista

**Files:**
- Modify: `src/components/painel/imoveis/FormImovel.tsx`
- Modify: `src/components/painel/imoveis/ListaImoveis.tsx`
- Modify: `src/styles/cz-painel.css` (só o necessário)
- Modify: `src/app/painel/(app)/imoveis/page.tsx` (se a lista precisar dos campos novos)
- Test: `e2e/painel.spec.ts`

**Interfaces:**
- Consumes: `EntradaImovel`, `ImovelEdicao.referenciaLoft`, `LinhaImovel.referenciaLoft/empreendimento`, `CARACTERISTICAS`, `TIPOS`.

- [ ] **Step 1: Write the failing e2e test** (em `e2e/painel.spec.ts`, no padrão dos testes de cadastro existentes)

`test("cadastro com a ficha completa aparece na lista e na busca", ...)`:
- preencher `Banheiros`, `Suítes`, `Área total (m²)`, `Condomínio (R$/mês)`, `IPTU (R$/ano)`, `Empreendimento`, marcar a característica `Piscina`, e preencher a seção `Endereço (uso interno — não aparece no site)` com `Rua Teste` e `CEP`;
- publicar e reabrir: os valores voltam preenchidos;
- na lista, buscar pelo empreendimento encontra o imóvel; filtrar por `Tipo` e por `Cidade` também.

- [ ] **Step 2: Run** — `npm run test:e2e -- e2e/painel.spec.ts -g "ficha completa"`, FAIL. Precisa de `npm run db:subir`.

- [ ] **Step 3: Implement**

Formulário: na seção de valores, `Condomínio`, `IPTU` e (só com finalidade Venda) `Valor de locação (opcional)`, com a máscara de milhar que o `valor` já usa. Na seção de áreas e cômodos: `Área privativa (m²)` (o campo `area` atual com rótulo novo), `Área total (m²)`, `Quartos`, `Suítes`, `Banheiros`, `Vagas`, `Andar`, `Ano de construção`. Um campo `Empreendimento`. Uma seção `Características` com checkboxes, na ordem de `CARACTERISTICAS`. Uma seção `Endereço (uso interno — não aparece no site)` com `Endereço`, `Número`, `Complemento`, `CEP`. Quando houver referência, um campo só leitura `Ref. Loft` ao lado do código. Os erros dos campos novos entram no resumo de erros (via `ORDEM_CAMPOS`).

Lista: a busca casa código, título, bairro, empreendimento e referência Loft, sem acentos e sem diferenciar maiúsculas. Filtros novos `Tipo` (opções de `TIPOS`) e `Cidade` (cidades distintas da lista), no mesmo componente dos filtros atuais. Paginação de 30 itens, se a lista ainda não tiver.

- [ ] **Step 4: Run** — `npm run test:e2e -- e2e/painel.spec.ts`, os existentes e o novo PASS; `npm run lint && npm run typecheck`.

- [ ] **Step 5: Commit** — `git commit -m "feat(painel): formulário com a ficha completa e filtros da lista"`

---

### Task 4: Site público — página do imóvel, cards e filtros

**Files:**
- Modify: `src/lib/imoveis/types.ts` (`Imovel`, `ImovelResumo`)
- Modify: `src/lib/imoveis/catalogo.ts` (`paraImovel`, `resumo`, `filtrar`, `card`)
- Modify: `src/lib/imoveis/filtros.ts` (`Filtros`, `lerFiltros`, `filtrosParaQuery`, `rotulosFiltros`, `combinaFinalidade`, `MINIMOS_SUITES`)
- Modify: `src/lib/imoveis/formato.ts` (formatadores novos)
- Modify: `src/components/imovel/ImovelTela.tsx`, `src/components/imoveis/FiltrosImoveis.tsx`, `src/components/imoveis/CardImovel.tsx`
- Test: `src/lib/imoveis/catalogo.test.ts`, `src/lib/imoveis/filtros.test.ts`, `src/lib/imoveis/formato.test.ts`

**Interfaces:**
- Produces em `Imovel` (e **só** estes campos novos): `banheiros`, `suites`, `areaTotal`, `condominio`, `iptu`, `valorLocacao`, `andar`, `anoConstrucao` (`number | null`), `empreendimento: string | null`, `caracteristicas: { chave: string; rotulo: string }[]`.
- Produces em `ImovelResumo`: `suites`, `valorLocacao`.
- Produces em `Filtros`: `suites?: string` (valores de `MINIMOS_SUITES = ["1","2","3","4"]`) e `carac?: string[]` (chaves de `CARACTERISTICAS_FILTRO`; na URL, `carac=piscina&carac=academia`).
- Produces em `formato.ts`: `formatarMensal(n: number): string` ("R$ 1.250/mês") e `formatarAnual(n: number): string` ("R$ 4.800/ano").

- [ ] **Step 1: Write the failing tests**

`catalogo.test.ts`:
```ts
test("o Imovel público não tem endereço nem referência da Loft", async () => {
  // imóvel publicado com endereco "Rua Secreta", numero "99", complemento "1201", cep "30000-000", referenciaLoft "777"
  const r = await obterImovel("cz…", amb.db);
  if (r.situacao !== "disponivel") throw new Error();
  for (const k of ["endereco", "numero", "complemento", "cep", "referenciaLoft"]) expect(r.imovel).not.toHaveProperty(k);
  expect(JSON.stringify(r.imovel)).not.toMatch(/Rua Secreta|30000-000|1201/);
});
test("busca pública não encontra pelo endereço nem pela referência", async () => {
  expect((await buscarImoveis({ q: "Rua Secreta", pagina: 1 }, amb.db)).total).toBe(0);
  expect((await buscarImoveis({ q: "30000-000", pagina: 1 }, amb.db)).total).toBe(0);
  expect((await buscarImoveis({ q: "777", pagina: 1 }, amb.db)).total).toBe(0);
});
test("alugar inclui venda com valor de locação, e a faixa usa o valor de locação", async () => {
  // venda 2.000.000 com valorLocacao 12.000
  expect((await buscarImoveis({ finalidade: "alugar", preco: "10k-30k", pagina: 1 }, amb.db)).itens.map((i) => i.id)).toContain("cz…");
});
test("filtros de suítes e características", async () => { /* suites "2" exclui o de 1 suíte; carac ["piscina"] exclui o sem piscina */ });
```
`filtros.test.ts`: `lerFiltros(new URLSearchParams("suites=2&carac=piscina&carac=xxx&carac=academia"))` deve dar `{ suites: "2", carac: ["piscina","academia"], pagina: 1 }`, e `filtrosParaQuery` disso deve dar `"suites=2&carac=piscina&carac=academia"`. Também `rotulosFiltros` inclui "2+ suítes" e "Piscina".
`formato.test.ts`: `formatarMensal(1250) === "R$ 1.250/mês"` e `formatarAnual(4800) === "R$ 4.800/ano"` (no formato de `formatarReais`).

- [ ] **Step 2: Run** — `npx vitest run src/lib/imoveis`, FAIL.

- [ ] **Step 3: Implement**

`paraImovel` monta só os campos públicos (as características viram `{chave, rotulo}` e as desconhecidas caem fora). A busca `q` continua sobre título, bairro, cidade e código, mais o empreendimento. `combinaFinalidade("alugar", i)` passa a aceitar `i.finalidade === "venda" && i.valorLocacao !== null`. Na faixa de preço com `alugar`, o valor comparado é `i.finalidade === "locacao" ? i.valor : i.valorLocacao`.

Página do imóvel (`ImovelTela`), dentro do padrão do handoff:
- linha de especificações com Suítes, Banheiros e Área total (quando `areaTotal > area`);
- bloco "Valores" com Venda, Locação (se houver), Condomínio e IPTU;
- Andar, Ano e Empreendimento quando preenchidos;
- lista "Características".

Card: se houver `valorLocacao`, uma segunda linha de preço "ou R$ X/mês". Filtros: Suítes no padrão de Quartos/Vagas, e um grupo de Características com os rótulos de `CARACTERISTICAS_FILTRO`.

- [ ] **Step 4: Run** — `npx vitest run && npm run typecheck && npm run lint`; `npm run test:e2e -- e2e/behavior-site.spec.ts e2e/behavior.spec.ts` (sem regressão e axe ok).

- [ ] **Step 5: Commit** — `git commit -m "feat(site): ficha completa na página do imóvel, card e filtros de suítes e características"`

---

### Task 5: Senha provisória — domínio

**Files:**
- Modify: `src/lib/painel/contas.ts` (`entrar`, `lerSessao`, `paraRegistro`, `paraLogado`, novas funções)
- Modify: `src/lib/painel/regras.ts` (`UsuarioLogado`)
- Modify: `src/lib/seguranca/senha.ts` (`gerarSenhaProvisoria`)
- Test: `src/lib/painel/painel.test.ts` (ou o arquivo de testes de contas existente)

**Interfaces:**
- Produces: `UsuarioLogado` ganha `trocarSenha: boolean`.
- Produces: `export const VALIDADE_PROVISORIA_H = 72`.
- Produces: `gerarSenhaProvisoria(): string`, com 12 caracteres de um alfabeto sem ambíguos (sem 0/O/1/l/I), via `crypto.getRandomValues`, e que passa em `erroNovaSenha`.
- Produces: `definirSenhaProvisoria(admin: UsuarioLogado, usuarioId: string, agora?: number, db?: Db): Promise<{ ok: true; senha: string } | { ok: false; erro: "proibido" | "inexistente" | "desativado" }>`. Só ADMIN, nunca para a própria conta nem para outro ADMIN. Grava `senhaHash`, `situacao: "ativo"`, `trocarSenha: true`, `senhaProvisoriaExpiraEm: agora + 72h`, e apaga as sessões, os tokens e as tentativas do usuário.
- Produces: `trocarSenhaObrigatoria(usuarioId: string, nova: string, confirmacao: string, db?: Db): Promise<{ ok: true } | { ok: false; erros: ErrosSenha }>`. Exige `trocarSenha = true`. Recusa senha igual à provisória com "Use uma senha diferente da provisória.". Grava o hash novo, `trocarSenha: false` e `senhaProvisoriaExpiraEm: null`.

- [ ] **Step 1: Write the failing tests**

```ts
test("provisória: ADMIN gera, a pessoa entra e fica obrigada a trocar", async () => {
  const r = await definirSenhaProvisoria(amb.admin, amb.juliana.id, AGORA, amb.db); // juliana é pendente
  if (!r.ok) throw new Error();
  expect(erroNovaSenha(r.senha)).toBeNull();
  const e = await entrar(amb.juliana.email, r.senha, AGORA + 1000, amb.db);
  expect(e.ok).toBe(true);
  const token = await abrirSessao(amb.juliana.id, AGORA, amb.db);
  expect((await lerSessao(token, AGORA + 1000, amb.db)).usuario?.trocarSenha).toBe(true);
});
test("provisória vencida não entra", async () => {
  const r = await definirSenhaProvisoria(amb.admin, amb.juliana.id, AGORA, amb.db);
  expect((await entrar(amb.juliana.email, (r as { senha: string }).senha, AGORA + 73 * 3600_000, amb.db))).toEqual({ ok: false, erro: "credenciais" });
});
test("depois da troca, a provisória não vale mais e a flag some", async () => { /* trocarSenhaObrigatoria(nova) → entrar(provisória) falha; entrar(nova) ok; lerSessao.trocarSenha false */ });
test("igual à provisória é recusada", async () => { /* erros.nova === "Use uma senha diferente da provisória." */ });
test("só ADMIN, nunca para si nem para ADMIN; desativado recusa", async () => {
  expect(await definirSenhaProvisoria(amb.mariana, amb.ricardo.id, AGORA, amb.db)).toEqual({ ok: false, erro: "proibido" });
  expect(await definirSenhaProvisoria(amb.admin, amb.admin.id, AGORA, amb.db)).toEqual({ ok: false, erro: "proibido" });
  expect(await definirSenhaProvisoria(amb.admin, amb.paulo.id, AGORA, amb.db)).toEqual({ ok: false, erro: "desativado" });
});
test("gerar de novo derruba sessões abertas do usuário", async () => { /* abrirSessao(ricardo); definirSenhaProvisoria(ricardo); lerSessao → usuario null */ });
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** Em `entrar`: se `u.trocarSenha && u.senhaProvisoriaExpiraEm && u.senhaProvisoriaExpiraEm.getTime() < agora`, trate como credenciais erradas (conta a tentativa normalmente).
- [ ] **Step 4: Run** — `npx vitest run src/lib/painel && npm run typecheck`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(painel): senha provisória com troca obrigatória (domínio)"`

---

### Task 6: Senha provisória — telas e bloqueio

**Files:**
- Modify: `src/lib/painel/sessao.ts` (`exigirUsuario`, `usuarioDaAcao`)
- Modify: `src/lib/routes.ts` (`painel.trocarSenha = "/painel/trocar-senha"`)
- Create: `src/app/painel/(acesso)/trocar-senha/page.tsx`
- Create: `src/components/painel/acesso/FormTrocarSenha.tsx`
- Modify: `src/app/painel/_acoes/acesso.ts` (`trocarSenhaObrigatoriaAction`)
- Modify: `src/app/painel/_acoes/usuarios.ts` (`definirSenhaProvisoriaAction`)
- Modify: `src/components/painel/usuarios/ListaUsuarios.tsx`
- Test: `e2e/painel.spec.ts`

**Interfaces:**
- Consumes: Task 5.
- Produces: `definirSenhaProvisoriaAction(id: unknown): Promise<{ ok: true; senha: string } | { ok: false; erro: string }>`.
- Produces: `trocarSenhaObrigatoriaAction(anterior: EstadoDefinirSenha-like, fd: FormData)`. No sucesso, redireciona para `painel.imoveis` (ou o `inicio` atual).
- `exigirUsuario(voltar)`: se `usuario.trocarSenha`, `redirect(painel.trocarSenha)`. `usuarioDaAcao()`: se `usuario.trocarSenha`, `redirect(painel.trocarSenha)`. A action de troca obrigatória lê a sessão por `sessaoAtual()` direto, sem `usuarioDaAcao`.

- [ ] **Step 1: Write the failing e2e test**

`test("senha provisória: ADMIN gera, a pessoa troca no primeiro acesso", ...)`:
1. ADMIN em Usuários convida "Teste Provisória" (o e-mail não sai: aparece a mensagem atual).
2. Na linha dele, "Definir senha provisória": um diálogo mostra a senha (texto selecionável + "Copiar") e o aviso "Ela aparece só agora. Vale por 72 horas.".
3. Sair. Entrar com o e-mail e a senha provisória: a URL vira `/painel/trocar-senha`, com o título "Crie sua senha".
4. Ir direto a `/painel/imoveis` volta para `/painel/trocar-senha`.
5. Trocar a senha: cai em `/painel/imoveis`. Sair, e entrar com a provisória mostra "E-mail ou senha incorretos.".

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** A página `trocar-senha` usa o `CartaoAcesso` e os mesmos campos e mensagens de `FormDefinirSenha` (Nova senha, Repita a nova senha). Sem sessão, vai para Entrar. Sem `trocarSenha`, vai para `painel.imoveis`. Em `ListaUsuarios`, a ação aparece para corretores pendentes ou ativos (nunca para o ADMIN nem para desativados). O diálogo segue o padrão dos diálogos existentes (`useDialog`). Fechar o diálogo descarta a senha do estado.
- [ ] **Step 4: Run** — `npm run test:e2e -- e2e/painel.spec.ts` PASS; `npx vitest run`; lint e typecheck.
- [ ] **Step 5: Commit** — `git commit -m "feat(painel): definir senha provisória e tela de troca obrigatória"`

---

### Task 7: Importador — leitura do feed e das planilhas e mapeamento

**Files:**
- Create: `scripts/loft/vrsync.ts`, `scripts/loft/planilha.ts`, `scripts/loft/mapear.ts`
- Create: `scripts/loft/fixtures/feed.xml`, `scripts/loft/fixtures/ativos.csv`, `scripts/loft/fixtures/pendentes.csv` (anonimizados)
- Test: `scripts/loft/vrsync.test.ts`, `scripts/loft/planilha.test.ts`, `scripts/loft/mapear.test.ts`

**Interfaces:**
- Produces `vrsync.ts`: `type AnuncioVrsync = { referencia: string; titulo: string; transacao: "venda" | "locacao" | "venda-locacao"; tipoVrsync: string; descricao: string; precoVenda: number | null; precoLocacao: number | null; condominio: number | null; iptu: number | null; areaUtil: number | null; areaTerreno: number | null; quartos: number | null; suites: number | null; banheiros: number | null; vagas: number | null; andar: number | null; ano: number | null; features: string[]; endereco: string; numero: string; complemento: string; cep: string; bairro: string; cidade: string; uf: string; fotos: string[] }` (zeros viram `null`; `fotos` em ordem, com a `primary="true"` primeiro) e `lerVrsync(xml: string): AnuncioVrsync[]`. Parser: `fast-xml-parser` (adicionar em `devDependencies`; o importador só roda na máquina do dev) com `removeNSPrefix: true`, `cdataPropName` desligado e `isArray` para `Listing`, `Item` e `Feature`.
- Produces `planilha.ts`: `type LinhaPlanilha = { referencia: string; categoria: string; endereco: string; numero: string; complemento: string; quartos: number | null; valorVenda: number | null; valorAluguel: number | null; bairro: string; empreendimento: string }` e `lerPlanilha(csv: string): LinhaPlanilha[]` (`;`, aspas, BOM, decimais com ponto).
- Produces `mapear.ts`:
  - `type Origem = "feed" | "ativo-fora-do-site" | "pendente-suspenso"`
  - `type ImovelLoft = { referencia: string; situacao: SituacaoImovel; finalidade: Finalidade | null; tipo: string | null; titulo: string; descricao: string; bairro: string; cidade: string; uf: string; valor: number | null; valorLocacao: number | null; area: number | null; areaTotal: number | null; quartos, suites, banheiros, vagas, andar, anoConstrucao: number | null; condominio: number | null; iptu: number | null; caracteristicas: string[]; empreendimento: string | null; endereco, numero, complemento, cep: string | null; fotos: string[]; avisos: string[] }`
  - `mapearTipo(categoria: string | undefined, tipoVrsync: string | undefined): string | null`
  - `juntar(feed: AnuncioVrsync[], ativos: LinhaPlanilha[], pendentes: LinhaPlanilha[]): ImovelLoft[]`

- [ ] **Step 1: Criar as fixtures a partir dos arquivos reais**, anonimizando: ruas, números, complementos e CEPs trocados por fictícios (`Rua Exemplo`, `34000-000`); e-mails por `contato@exemplo.test`; fotos por `https://cdn.exemplo.test/fotos/<ref>/<n>.jpg`. As fixtures cobrem:
  - feed: 1 apartamento com `Suites` e features (inclusive "Number of stories" e uma desconhecida "Rooftop"); 1 `Land Lot` com `LivingArea` 0 e `LotArea` 633; 1 `Sale/Rent` com `RentalPrice`; 1 sem `Title`; 1 cuja descrição cita a própria rua e número;
  - `ativos.csv`: as 5 do feed + 1 que não está no feed (categoria `Apartamento Duplex`), com BOM, um campo entre aspas contendo `;`, mojibake (`Avenida dos ImarÃ©s`), decimal `13617.021276596` e uma linha em branco no fim;
  - `pendentes.csv`: 2 linhas (categoria `Área` e `Loft`).
  Os arquivos reais ficam em `../imoveis.csv`, `../imoveis filtro.csv` e numa cópia do feed (pedir a URL ao usuário). **Não copiar dados reais para a fixture.**

- [ ] **Step 2: Write the failing tests**

`vrsync.test.ts`: `lerVrsync(fixture)` tem 5 anúncios. O lote tem `areaUtil: null, areaTerreno: 633`. O Sale/Rent tem `transacao: "venda-locacao"` e `precoLocacao`. A primeira foto é a `primary`. `banheiros` 0 vira `null`.
`planilha.test.ts`: `lerPlanilha(ativos)` tem 6 linhas (a em branco é ignorada). O campo com `;` entre aspas volta inteiro. O BOM não entra no nome da primeira coluna. `valorVenda` é número.
`mapear.test.ts`:
```ts
test("tipos pela categoria da Loft, com o VRSync de reserva", () => {
  expect(mapearTipo("Apartamento Duplex", undefined)).toBe("Apartamento");
  expect(mapearTipo("Área", undefined)).toBe("Terreno");
  expect(mapearTipo("Salas/Conjuntos", undefined)).toBe("Sala / Laje corporativa");
  expect(mapearTipo("Sala Comercial", undefined)).toBe("Sala / Laje corporativa");
  expect(mapearTipo("Loft", undefined)).toBe("Loft");
  expect(mapearTipo("Studio", undefined)).toBe("Studio");
  expect(mapearTipo(undefined, "Residential / Penthouse")).toBe("Cobertura");
  expect(mapearTipo("Desconhecida", undefined)).toBeNull();
});
test("situação por origem", () => {
  const l = juntar(feed, ativos, pendentes);
  expect(l.filter((i) => i.situacao === "publicado")).toHaveLength(5);
  expect(l.find((i) => i.referencia === "<ref fora do site>")!.situacao).toBe("rascunho");
  expect(l.filter((i) => pendentesRefs.includes(i.referencia)).every((i) => i.situacao === "rascunho")).toBe(true);
});
test("área do lote vem da LotArea; areaTotal só quando maior que a privativa", () => { /* lote: area 633, areaTotal null; casa: area 500 areaTotal 5000 */ });
test("venda-locação: finalidade venda, valor de venda e valorLocacao", () => {});
test("título ausente é gerado; features mapeadas, 'Number of stories' ignorada, 'Rooftop' vira aviso", () => {
  // titulo === "Apartamento à venda no <bairro>, <cidade>"; avisos contém "Característica desconhecida: Rooftop"
});
test("título cortado por palavra em 90", () => {});
test("descrição que cita rua e número gera aviso, mas continua publicado", () => {});
test("só na planilha: sem fotos, sem descrição, cidade vazia; empreendimento e endereço vêm da planilha", () => {});
```

- [ ] **Step 3: Run** — `npx vitest run scripts/loft`, FAIL.
- [ ] **Step 4: Implement** as três funções. `juntar` usa a categoria da planilha quando existir. A finalidade de quem está só na planilha sai de `valorVenda > 0` → venda (com `valorLocacao` se `valorAluguel > 0`), e senão `valorAluguel > 0` → locação.
- [ ] **Step 5: Run** — PASS; lint e typecheck.
- [ ] **Step 6: Commit** — `git commit -m "feat(loft): leitura do feed VRSync e das planilhas e mapeamento para a ficha"`

---

### Task 8: Importador — gravação idempotente com fotos

**Files:**
- Create: `scripts/loft/importar.ts`
- Test: `scripts/loft/importar.test.ts`

**Interfaces:**
- Consumes: `ImovelLoft` (Task 7), tabela `importacaoLoft` (Task 1), `ArmazenamentoFotos` (`src/lib/armazenamento`).
- Produces:
  ```ts
  type BaixarFoto = (url: string) => Promise<{ bytes: Uint8Array; tipo: string }>;
  type LerDimensoes = (bytes: Uint8Array) => Promise<{ largura: number; altura: number }>;
  type Relatorio = { criados: string[]; atualizados: string[]; camposPreservados: { referencia: string; campos: string[] }[]; indisponibilizados: string[]; excluidosNoPainel: string[]; fotosBaixadas: number; fotosFalhas: { referencia: string; url: string; erro: string }[]; avisos: { referencia: string; aviso: string }[]; exemplosRemovidos: string[]; oportunidade: string | null };
  importarLoft(db: Db, imoveis: ImovelLoft[], o: { responsavelId: string; armazenamento: ArmazenamentoFotos; baixar: BaixarFoto; dimensoes: LerDimensoes; agora?: Date; concorrencia?: number }): Promise<Relatorio>
  ```

Regras (do spec, seção Importação):
- referência nova → `nextval('imovel_codigo_seq')`, id `cz####`, situação do `ImovelLoft`, `publicadoEm` = agora se publicado; grava `importacaoLoft` com `valores` (snapshot dos campos vindos da Loft), `fotosOrigem`, `fotoIds` e `importadoEm`;
- referência conhecida com `imovelId` → por campo: atualizar só os campos cujo valor atual no banco é igual ao do snapshot; os outros vão para `camposPreservados`. Fotos: se os `fotoIds` atuais do imóvel (ordem) são iguais aos do snapshot, sincroniza com as `fotosOrigem` novas (baixa só as URLs novas e descarta as que saíram, pelas chaves); senão, não toca;
- referência conhecida com `imovelId` nulo → `excluidosNoPainel`, não recria;
- referência em `importacaoLoft` ausente desta rodada, com o imóvel ainda igual ao snapshot → `situacao: "indisponivel"` (`indisponibilizados`); se era a Oportunidade, reatribui;
- foto: `fotos/loft-<sha1(referencia + url)>.<ext>`, que é estável. Se a chave já existe em `fotos`, reutiliza. Valida o tipo com `assinaturaConfere`. Falha de download, tipo ou dimensão → `fotosFalhas`, e segue. Concorrência padrão 4;
- primeira rodada com imóveis de exemplo (`cz1001`, `cz1009`, `cz1010` sem `importacaoLoft`) → exclui esses três e as fotos deles pelas chaves → `exemplosRemovidos`;
- Oportunidade vazia ou não publicada → a de maior `valor` entre os publicados com pelo menos 1 foto e finalidade venda;
- tudo de cada imóvel numa transação; as fotos são baixadas antes da transação.

- [ ] **Step 1: Write the failing tests** (PGlite + `armazenamento()` em memória dos testes + `baixar` falso que devolve um JPEG mínimo ou lança erro para URLs com `falha`)

```ts
test("primeira rodada: cria, define situação, responsável, fotos e Oportunidade, e remove os exemplos", async () => {
  await amb.reiniciar({ imoveis: false });
  // criar os 3 exemplos via importarImoveis(... ids: EXEMPLOS)
  const r = await importarLoft(amb.db, juntar(feed, ativos, pendentes), opcoes());
  expect(r.criados).toHaveLength(8);
  expect(r.exemplosRemovidos.sort()).toEqual(["cz1001", "cz1009", "cz1010"]);
  // todos com responsavelId = mariana.id; publicados = 5; cada publicado com as fotos da fixture na ordem
  expect(r.oportunidade).toBe(/* id do publicado de maior valor com foto */);
});
test("rodar de novo sem mudanças não cria nem baixa nada", async () => { /* criados [], fotosBaixadas 0, mesma contagem de linhas */ });
test("campo editado no painel é preservado; os outros atualizam", async () => {
  // salvarImovel muda o título de A; o feed novo muda o título e o preço de A
  // → título do painel mantido, preço novo aplicado, camposPreservados [{referencia A, campos:["titulo"]}]
});
test("reatribuir o responsável não bloqueia a atualização de preço e fotos", async () => {});
test("fotos editadas no painel não são tocadas; não editadas sincronizam (nova baixada, removida descartada)", async () => {});
test("excluído no painel não volta", async () => {});
test("sumiu do feed: indisponível; se era a Oportunidade, ela é reatribuída", async () => {});
test("foto que falha não derruba o imóvel e entra no relatório; a próxima rodada tenta de novo", async () => {});
```

- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement `importarLoft`.** Reaproveite os helpers de `src/lib/painel/imoveis.ts` (configuração/Oportunidade) exportando o necessário em vez de duplicar. Os campos do snapshot são exatamente as chaves de `ImovelLoft` que viram colunas (sem `referencia`, `fotos`, `avisos`).
- [ ] **Step 4: Run** — `npx vitest run scripts/loft && npx vitest run`, PASS.
- [ ] **Step 5: Commit** — `git commit -m "feat(loft): importação idempotente com fotos, preservação de edições e Oportunidade"`

---

### Task 9: Comando de importação, deploy e documentação

**Files:**
- Create: `scripts/importar-loft.ts`
- Modify: `package.json` (script `loft:importar`; `sharp` em `devDependencies`, com a versão já instalada pelo Next)
- Modify: `deploy/deploy.sh` (modo `importar-loft`)
- Modify: `deploy/README.md`, `CLAUDE.md`, `docs/backend.md`
- Test: `scripts/importar-loft.test.ts` (só a leitura dos argumentos)

**Interfaces:**
- `npm run loft:importar -- --feed <url|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email> [--simular]`
- `--simular`: lê, junta e imprime um resumo (contagens por situação, tipos sem mapa, avisos), sem gravar.
- `deploy/deploy.sh importar-loft --feed ... --ativos ... --pendentes ... --responsavel ...`: carrega o env, abre o túnel e repassa os argumentos. No fim, lembra de rodar `deploy/deploy.sh` para regenerar as páginas (o cache do catálogo também expira sozinho em até 5 min).
- O relatório é impresso e salvo em `relatorio-loft-<data>.json` na pasta atual (fora do git: acrescentar `relatorio-loft-*.json` ao `.gitignore`).

- [ ] **Step 1: Write the failing test** — `lerArgumentos(["--feed","f.xml","--ativos","a.csv","--pendentes","p.csv","--responsavel","x@y.test"])` devolve os quatro, e `simular: false`. Sem `--responsavel`, lança "Informe --responsavel".
- [ ] **Step 2: Run** — FAIL.
- [ ] **Step 3: Implement.** `baixar` usa `fetch` com timeout de 30 s e 2 tentativas. `dimensoes` usa `sharp(bytes).metadata()`. O armazenamento é `armazenamentoS3()` (endpoint do túnel). O responsável é procurado pelo e-mail e precisa estar ativo ou pendente.
- [ ] **Step 4: Run** — `npx vitest run`; `npm run loft:importar -- --feed <cópia local> --ativos ../imoveis.csv --pendentes "../imoveis filtro.csv" --responsavel <e-mail local> --simular` mostra 348 publicados, 74 rascunhos e 0 tipos sem mapa. Em seguida, uma rodada real contra o ambiente local (`npm run db:subir`), conferida no painel em `localhost:3000/painel`.
- [ ] **Step 5: Docs** — `deploy/README.md` ("Importar da Loft": passo a passo de produção, incluindo criar o Matheus e a senha provisória); `CLAUDE.md` (o importador e a senha provisória em Architecture); `docs/backend.md` (comando novo).
- [ ] **Step 6: Commit** — `git commit -m "feat(loft): comando de importação, modo no deploy e documentação"`

---

### Task 10: Produção

Operação; nada de código novo. Cada passo que mexe em produção é confirmado com o usuário antes.

- [ ] **Step 1:** `deploy/deploy.sh` (migrations + site com a ficha nova). Conferir que `https://carneiroziller.com.br` responde 200 e que o painel abre.
- [ ] **Step 2:** No painel (como ADMIN), convidar **Matheus Enrico Fonseca Carneiro** <`matheusenrico@hotmail.com`> e "Definir senha provisória". Passar a senha ao usuário (não registrar em lugar nenhum).
- [ ] **Step 3:** Baixar o feed atual e exportar de novo as planilhas, se o usuário quiser os dados do dia. `deploy/deploy.sh importar-loft ... --simular`, e mostrar o resumo ao usuário.
- [ ] **Step 4:** Com o OK, rodar a importação real. Mostrar o relatório (criados, rascunhos, falhas de foto, avisos).
- [ ] **Step 5:** `deploy/deploy.sh` para regenerar as páginas. Conferir a Home, `/imoveis` (contagem, filtros novos) e 2 imóveis (fotos, valores, características, nenhum endereço no HTML: `curl -s <url> | grep -c "<rua do imóvel>"` dá 0).
- [ ] **Step 6:** Atualizar a memória do projeto e avisar o usuário: credenciais do Matheus, imóveis com aviso para revisar e o próximo corte.
