# Prioridade 2: nova direção visual e destaques escolhidos no painel

Data: 2026-11-13. Origem: reunião com o cliente (feedback de 2026-11-04) e a proposta visual
aprovada pelo usuário em 2026-11-13 ("gostei desse novo redesign, vamos seguir com ele"). A
proposta está em `.superpowers/design/2026-11-04-p2/` (fora do git): `DIRECAO.md`, os mockups
`mockups/{home,home-mobile,imoveis,imovel}.html` e as logos em `logo/`. **Os mockups são a
referência visual desta etapa**; este spec diz o que muda e as regras que os mockups não mostram.

O rastreamento (Google Tag Manager e Meta Pixel) foi feito à parte, na branch `rastreamento`.

## Decisões do usuário (2026-11-13)
- Seguir a proposta como está: logo B (refinamento), acento champanhe, Cormorant Garamond +
  Jost, sem a barra de utilidades no topo, abas Comprar/Alugar/Lançamentos acima da busca e os
  pares de região propostos (Belvedere e Vila da Serra; Lourdes e Savassi).
- Sem vídeo por enquanto: a abertura usa algumas imagens com movimento lento, e o vídeo entra
  depois sem refazer a seção.
- **Destaques da página inicial escolhidos no painel.** Motivo do cliente: a seleção
  automática mostrou um imóvel que nem estava mais anunciado.

## Rulings (minhas, ajustáveis)
- **Marca d'água só sobreposta na exibição** (CSS sobre a foto), sem gravar no arquivo. É
  reversível, não toca nas 6.516 fotos e evita duas marcas nas fotos da Loft, que já têm
  "Carneiro Invest" gravado. Gravar no upload fica para depois, se o cliente pedir.
- **O vinho continua**, como na proposta aprovada (o "&" da logo e o itálico dos títulos em fundo
  claro). O pedido antigo de "tirar o bordô" foi superado pela aprovação.
- A seção "Oportunidade de hoje" e as abas automáticas Venda/Locação saem e dão lugar aos
  **Destaques**. A atual Oportunidade (CZ1115, área industrial) não migra.
- Lançamentos continuam escondidos (menu, aba e seção) enquanto não houver lançamento publicado.
- Os textos do Sobre continuam provisórios até o cliente mandar a trajetória.

## Escopo

### 1. Identidade
- Logo B em SVG com o texto **convertido em curvas** (sem depender de fonte), em versão
  positiva e negativa, no cabeçalho, no rodapé, no painel (tela de entrada) e nos e-mails.
  Favicon a partir do símbolo.
- Tokens da proposta (paleta com hex no `DIRECAO.md`) e fontes Cormorant Garamond + Jost
  via `next/font/google`, substituindo DM Serif Display + Montserrat no site. O painel mantém
  o visual próprio, mas usa a logo nova.
- Sai a barra de utilidades (`UtilityBar`). Telefone, WhatsApp e CRECI ficam no rodapé e no
  menu do celular.

### 2. Página inicial
- Abertura em tela cheia: 3 imagens alternando com zoom lento e véu azul-noite; 4 frases
  originais alternando (as da `DIRECAO.md`); busca com abas Comprar/Alugar(/Lançamentos) e
  **Tipo, Cidade, Bairro, Quartos**, mais o link "Filtros avançados" (abre `/imoveis` com o
  painel de filtros avançados aberto). Com `prefers-reduced-motion`, uma imagem e uma frase
  fixas.
- Vídeo: a seção aceita um vídeo (`<video autoplay muted loop playsinline>` com pôster)
  configurado num único lugar (`src/lib/site.ts`, hoje `null`). Sem vídeo, usa as imagens.
- "O que você procura?": cards por tipo (Apartamentos, Coberturas, Casas em condomínio,
  Casas; Terrenos se couber no layout), cada um com link para `/imoveis?tipo=…`. Tipo sem
  imóvel publicado não aparece.
- "Onde você quer morar?": cards de região. "Belvedere e Vila da Serra" é o card grande. Os
  demais: Lourdes e Savassi, Alphaville Lagoa dos Ingleses, Vale dos Cristais e Vale do
  Sereno. Cada um abre a busca filtrada pela região (seção 4). Região sem imóvel publicado
  não aparece.
- "Imóveis em destaque": os destaques escolhidos no painel (seção 3), na ordem definida. Sem
  nenhum, a seção some.
- Bloco institucional escuro e rodapé, como no mockup. O texto institucional fala de **uma
  empresa** (marca única); nada de "duas unidades".

### 3. Destaques escolhidos no painel
- O ADMIN marca quantos imóveis quiser como destaque. Só imóvel **publicado** pode ser
  marcado, e a Home mostra **no máximo 6**, na ordem escolhida.
- No formulário do imóvel, a opção "Destaque na página inicial" (só ADMIN, só publicado)
  substitui "Usar na Oportunidade de hoje".
- Nova tela **Painel → Página inicial** (só ADMIN): lista os destaques na ordem, com subir,
  descer e remover, e link para cada imóvel. Mostra quantos aparecem na Home (até 6) e avisa
  quando a lista está vazia.
- Quando um destaque deixa de estar publicado (rascunho, indisponível ou excluído), sai da
  lista sozinho, e o ADMIN vê na tela Página inicial quem o tirou e quando, como o aviso
  atual da Oportunidade.
- Dados: a lista substitui `configuracao_site.oportunidade_id` (migração). A Home lê pela
  camada com cache (`src/lib/imoveis/index.ts`), e salvar ou reordenar invalida a tag
  `imoveis`.

### 4. Busca (/imoveis)
- Visíveis: abas de finalidade e **Tipo, Cidade, Bairro, Quartos**. Recolhidos em "Filtros
  avançados": busca por texto ou código, preço, área, vagas, suítes, características e
  ordenação. Os parâmetros da URL continuam valendo (`lerFiltros`/`urlGrid`).
- **Regiões:** novo parâmetro `regiao` com os slugs de uma lista fixa em código (nome,
  slug, pares bairro + cidade, imagem): `belvedere-vila-da-serra` (Belvedere / Belo
  Horizonte + Vila da Serra / Nova Lima), `lourdes-savassi` (Lourdes e Savassi / Belo
  Horizonte), mais as regiões de um bairro só usadas nos cards. Slug desconhecido é
  descartado como os demais filtros. Os pares aparecem também no select de Bairro, num grupo
  "Regiões". Cidade e Bairro continuam gerando o `local` atual.
- Cards de imóvel limpos (proposta): foto 4:3 com marca d'água, etiqueta de finalidade,
  bairro · cidade, título, área · quartos · vagas, preço.
- Os atalhos por tipo acima do grid saem (o tipo virou filtro principal).

### 5. Página do imóvel
- Galeria em mosaico na dobra (1 grande + 2) e botão "Ver as N fotos" que abre a **tela
  cheia** com setas, teclado (←, →, Esc), contador e **deslizar com o dedo** no celular. No
  celular, uma foto 4:3 com o mesmo botão.
- Marca d'água (símbolo + nome, branco translúcido, centralizada embaixo) em toda foto de
  imóvel: galeria, tela cheia e cards.
- Ficha: eyebrow "Tipo · Bairro, Cidade", título com o **nome do condomínio** logo abaixo
  quando houver, linha de dados (m², quartos, suítes, vagas), descrição, características e
  "Sobre o edifício", como no mockup.
- Card lateral fixo com valor, condomínio e IPTU, WhatsApp, Agendar visita e o formulário
  curto. No celular, a barra fixa (preço + WhatsApp) que já existe, no visual novo.
- **Compartilhar:** botão que usa o compartilhamento nativo do aparelho quando existe e, sem
  ele, oferece WhatsApp e "Copiar link".
- **Imóveis semelhantes** no fim: até 3 publicados, mesmo tipo e mesma cidade, preço a até
  30% (mesma finalidade), mais próximos em preço primeiro; completa com o mesmo tipo em
  qualquer cidade se faltar. Nunca o próprio imóvel. Sem nenhum, a seção some.
- Imóvel indisponível: mantém o aviso atual e mostra os semelhantes.

### 6. Demais páginas
- Contato, Sobre e Política de privacidade, o 404 e o "Voltar aos resultados" passam ao
  visual novo, sem mudar o conteúdo.

## Fora do escopo
- Vídeo da abertura (o cliente vai produzir), páginas de condomínio e bairro, favoritos,
  "Anuncie seu imóvel", gravar a marca d'água no arquivo e o banner de consentimento de
  cookies.
- Nenhuma mudança nos dados dos imóveis em produção além da migração da configuração.

## Restrições
- Endereço de imóvel (rua, número, CEP) nunca aparece em nada público.
- Os contatos vêm de `src/lib/site.ts`; nenhum texto inventa números, anos ou prêmios.
- Os nomes acessíveis usados pelos testes e2e mudam só junto com os testes; continuam valendo
  sem rolagem horizontal, o menu em gaveta abaixo de 900px e o axe WCAG 2 A/AA.
- Imagens servidas pelo `next/image` como hoje; nada de foto original em tamanho cheio nos cards.
