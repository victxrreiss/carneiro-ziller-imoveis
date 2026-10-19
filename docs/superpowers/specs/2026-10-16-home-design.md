# Home — Carneiro & Ziller Imóveis (design)

Data: 2026-10-16

## Objetivo

Implementar a Home do handoff (`docs/handoff/home/`) em Next.js, com paridade visual com o `Home.html` em 1440px e 390px. Só frontend e navegação; o backend vem depois.

## Fonte da verdade

1. `docs/handoff/home/Home.html`, que tem os valores exatos.
2. `docs/handoff/home/referencia/*.png`.
3. `docs/handoff/home/README.md`, que define tokens, comportamentos e as Lacunas.

## Mudanças em relação ao handoff (decididas pelo usuário)

- **Sem favoritos.** Sai o botão de coração dos cards e o link "Favoritos" do rodapé.
- **Sem "Anunciar imóvel".** Sai o botão do header, o link do rodapé e a seção CTA "Proprietários" inteira.
- Sem a seção CTA, a seção "Imóveis em destaque" ganha `padding-bottom: 120px`, que é o mesmo respiro que a CTA dava antes do rodapé.

## Lacunas do README, implementadas como o README manda

1. Menu hambúrguer abaixo de 900px, em um dropdown com os links do menu.
2. Tiles de região com 280px de altura abaixo de 600px.
3. Composição do hero abaixo do texto no mobile, a 100% da largura.
4. A busca envia para o grid `/imoveis?finalidade=<comprar|alugar|lancamentos>&q=<texto>`. "Busca avançada" leva para `/imoveis`. Menu (decisão do usuário, 2026-10-16): Home, Lançamentos (`/imoveis?finalidade=lancamentos`), Imóveis (`/imoveis`), Contato, Sobre nós.
5. Links usam as rotas do projeto, centralizadas em `src/lib/routes.ts`. As páginas ainda não existem e caem no 404 padrão do Next.
6. Imagens via `next/image` (WebP/AVIF, `srcset`, `lazy` abaixo da dobra, dimensões declaradas).

## Arquitetura

- Next.js 16 (App Router), React 19, TypeScript strict, Tailwind v4 (tokens em `@theme`), `next/font/local` com os woff2 do handoff, npm.
- `src/app/layout.tsx`: fontes e `<body>`. Renderiza `UtilityBar`, `{children}` e `Footer`.
- O `Header` fica dentro do hero, como no design (fundo `#FBFAF7` e pontos atrás). Cada página futura decide onde colocar o seu.
- A camada de dados `src/lib/imoveis/` expõe funções assíncronas que hoje leem um mock tipado (`dados-exemplo.json`). Quando o backend chegar, troca-se só a implementação.
- `src/lib/site.ts` guarda telefones, CRECIs, e-mails, endereço e redes sociais.

## Testes

- **Vitest + Testing Library**, para as abas (clique, setas, Home/End, `aria-selected`, troca de painel), a busca (action, `finalidade` e `q` no formulário), o menu mobile (abrir, fechar, Esc, retorno de foco) e a camada de dados.
- **Playwright**:
  - Paridade: compara pixel a pixel (pixelmatch) cada seção da página Next com a mesma seção do `Home.html`, servido localmente, em 1440 e 390px. Antes da captura, o `Home.html` recebe só as remoções aprovadas acima e as regras das Lacunas, para os dois lados ficarem comparáveis. As imagens de diff são salvas em `test-results/`.
  - Comportamento: hover do card e do tile, foco visível, nada de rolagem horizontal em 390px, menu hambúrguer abaixo de 900px e axe (WCAG 2 A/AA).

## Fora de escopo

Grid de anúncios, página do imóvel, formulário com webhook, login, cadastro de imóveis, admin e backend.

## Pendências do cliente (README)

"4 quartos" e "5 vagas" do destaque, os textos do hero e do institucional, e os links das redes sociais. As fotos, fora o `hero-predio.png`, são provisórias.
