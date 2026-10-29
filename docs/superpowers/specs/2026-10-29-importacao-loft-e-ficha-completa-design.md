# Importação da Loft e ficha completa do imóvel (design)

Data: 2026-10-29

## Intenção

A Carneiro & Ziller usa hoje o CRM da Loft (antigo Vista, `crmx.novovista.com.br`) e vai parar de usá-lo. A partir de agora, o painel do site (`/painel`) é onde a equipe cadastra e gerencia os imóveis. **O site passa a ser a fonte da verdade.** O GranCRM e outros sistemas receberão dados do site no futuro, nunca o contrário.

Para isso:
1. **Importar uma vez** os imóveis que estão no CRM, para a equipe não recadastrar centenas de anúncios à mão.
2. **Aproveitar os dados mais ricos da Loft para melhorar a ficha do imóvel.** Hoje a ficha tem só quartos, vagas e uma área. Ela vai ganhar banheiros, suítes, condomínio, IPTU, áreas separadas, características etc. A melhoria vale no painel (cadastro e filtros), no grid público (filtros) e na página do imóvel.

O cliente não deu opinião detalhada. O usuário aprovou a proposta abaixo e prefere entregar e ajustar conforme o retorno do cliente. Por isso, as escolhas abaixo seguem o que o feed traz e o padrão do mercado imobiliário. Nada de funcionalidade especulativa.

## Fonte dos dados

Os dados vêm do feed XML no formato **VRSync** (Viva Real), que o CRM gera para a integração ativa "Viva Real VRSync":

- A URL fica em Portais → Viva Real VRSync no CRM. **É sensível**: dá acesso aos dados de todos os anúncios, inclusive endereço e e-mail de contato. Ela não entra no repositório e vai como variável de ambiente ou argumento do script.
- O feed é regenerado pelo CRM continuamente. Em 2026-10-29 tinha **348 anúncios**, contra 372 imóveis no CRM. A diferença são os imóveis não marcados com "Exibir no site", que são justamente os que não devem ir para o site.
- Namespace: `http://www.vivareal.com/schemas/1.0/VRSync`. A estrutura de cada `<Listing>` e a presença de cada campo nos 348 anúncios:

| Campo VRSync | Presença | Observação |
|---|---|---|
| `ListingID` | 348 | Referência do imóvel na Loft (ex.: 442) |
| `Title` | 346 | Ex.: "Apartamento à venda no Vila da Serra, Nova Lima" |
| `TransactionType` | 348 | `For Sale` (344), `Sale/Rent` (4) |
| `Details/PropertyType` | 348 | Apartment 170, Condo 71, Land Lot 57, Penthouse 24, Office 9, Home 9, Studio 5, Building 3 |
| `Details/Description` | 346 | CDATA, texto corrido |
| `Details/ListPrice` | 348 | Venda, em reais (1.150 a 50.000.000) |
| `Details/RentalPrice` | 4 | Locação mensal, nos `Sale/Rent` |
| `Details/PropertyAdministrationFee` | 348 | Condomínio mensal (0 = não informado) |
| `Details/YearlyTax` | 348 | IPTU anual (0 = não informado) |
| `Details/LivingArea` | 348 | Área privativa/útil, m² |
| `Details/LotArea` | 348 | Área total/terreno, m² (0 = não informado) |
| `Details/Bedrooms`, `Suites`, `Bathrooms`, `Garage` | 348 / 255 / 348 / 248 | `Bathrooms` vem 0 em muitos (não informado) |
| `Details/UnitFloor`, `Floors`, `YearBuilt` | 25 / 25 / 34 | Raros |
| `Details/Features/Feature` | 81 imóveis | Lista em inglês (Gym, Pool, Gourmet Area...) |
| `Location/*` | Address, StreetNumber, Complement, PostalCode, Neighborhood, City, State@abbreviation | Endereço completo, até o número do apartamento |
| `Media/Item` | 1 a 50 por imóvel (média 19) | URL pública no `cdn.vistahost.com.br`, `primary="true"` marca a capa |
| `ContactInfo` | 348 | E-mail e nome da imobiliária, igual em todos. Não importar |

O feed **não indica lançamento** (todos `PublicationType=STANDARD`) **nem corretor responsável**.

Fatos conferidos no feed de 2026-10-29 que afetam o mapeamento:
- `LivingArea` vem **0 em todos os 57 Land Lot e nos 3 Building** (também em 2 Condo, 2 Studio e 1 Office). Para esses, a área do site (`area`) recebe `LotArea`. Sem isso, os terrenos não passam na regra "área obrigatória para publicar".
- `LotArea` vem 0 em quase todos os apartamentos e coberturas: aí `areaTotal` fica vazia.
- `Bathrooms` vem 0 em 166 anúncios (não informado → vazio).
- Lista completa de `Feature` no feed (com contagem): Gym 165, Maids Quarters 155, Party Room 138, Kitchen 134, Gourmet Area 123, Playground 118, Cooling 74, Pool 63, Intercom 53, Fenced Yard 51, Game room 48, Tennis court 42, BBQ 40, Garden Area 37, Exterior View 29, Spa 28, Home Office 27, Number of stories 25, Elevator 24, Furnished 23, Sauna 21, TV Security 20, Backyard 19, Fireplace 15, Laundry 15, Internet Connection 10, Balcony 3, Reception room 2, Heating 2, Ocean View 2, Warehouse 1. "Number of stories" não é característica: é ignorada (o andar vem de `UnitFloor`/`Floors`).
- Endereço na descrição: 14 descrições ou títulos citam a rua do próprio imóvel, e 4 deles citam rua e número.
- Uma cópia do feed baixada em 2026-10-29 está fora do repositório, na pasta temporária da sessão. Quem for implementar baixa de novo pela URL (com o usuário) para extrair a fixture anonimizada dos testes e conferir o mapa de tipos.

## Objetivos

1. **Script de importação** idempotente, que lê o feed (URL ou arquivo) e cria ou atualiza os imóveis no banco, com as fotos copiadas para o armazenamento do site.
2. **Ficha do imóvel ampliada** no banco, no painel, no grid público e na página do imóvel, com os campos novos listados abaixo.
3. **Filtros melhores** no painel e no grid público, aproveitando os campos novos.

## Fora do escopo (não-objetivos)

- Sincronização contínua com a Loft. Caminho A: a importação roda até o corte, e depois a Loft é desligada.
- Importar clientes, proprietários, negócios, agenda ou leads do CRM. São só os imóveis.
- Mostrar endereço completo no site público.
- Mapa, tour virtual e vídeos (o feed não traz).
- Mudar o visual do site além do necessário para mostrar os campos novos. O handoff continua sendo a referência visual: os campos novos seguem os padrões que as telas já usam.

## Anti-objetivos (seria falha mesmo funcionando)

- **Expor o endereço completo, o número do apartamento ou o CEP no site**, no HTML, na resposta de uma action ou em metadados. Quem compra um imóvel de alto padrão não quer o endereço do proprietário no Google, e a imobiliária perde o intermédio. O feed já marca `displayAddress="Neighborhood"`.
- **Site dependente da Loft depois do corte.** Fotos linkadas direto no `cdn.vistahost.com.br` somem quando o contrato acabar. As fotos são copiadas.
- **Rodar a importação de novo e duplicar imóveis ou fotos**, ou apagar o que a equipe já editou no painel sem querer.
- **Quebrar o fluxo atual do painel** (permissões, rascunho/publicação, Oportunidade da Home, upload de fotos) ou os testes existentes.

## Campos novos da ficha

Decisões do usuário: os campos da proposta. Detalhamento e nomes são decisão minha:

| Campo (banco) | Tipo | Painel | Site público | Origem no feed |
|---|---|---|---|---|
| `banheiros` | int, opcional | sim | página do imóvel | `Bathrooms` (0 → vazio) |
| `suites` | int, opcional | sim | página + filtro mínimo | `Suites` |
| `areaTotal` | int m², opcional | sim | página (quando maior que a privativa) | `LotArea` (0 → vazio) |
| `area` (existente) | | rotulada "Área privativa" | | `LivingArea` |
| `condominio` | bigint reais/mês, opcional | sim | página | `PropertyAdministrationFee` (0 → vazio) |
| `iptu` | bigint reais/ano, opcional | sim | página (anual) | `YearlyTax` (0 → vazio) |
| `valorLocacao` | bigint reais/mês, opcional | sim, só com finalidade venda ("também para locação") | página e card | `RentalPrice` nos `Sale/Rent` |
| `caracteristicas` | lista de chaves de uma lista fixa | checkboxes agrupadas | página (lista) + filtro | `Features` mapeadas |
| `andar` | int, opcional | sim | página | `UnitFloor` |
| `anoConstrucao` | int, opcional | sim | página | `YearBuilt` |
| `endereco`, `numero`, `complemento`, `cep` | texto, opcional | sim, seção "Endereço (uso interno — não aparece no site)" | **nunca** | `Location/*` |
| `referenciaLoft` | texto, opcional, único | só leitura ("Ref. Loft 442") e busca | nunca | `ListingID` / `Referencia` |
| `empreendimento` | texto, opcional | sim, e busca | página do imóvel | planilha `Empreendimento` |

**Características:** uma lista fixa em português, no código (`src/lib/imoveis/caracteristicas.ts` ou parecido), com o mapa inglês → chave para a importação. Ela cobre ao menos todas as `Feature` que aparecem no feed. O builder extrai a lista completa do arquivo. As mais frequentes: Gym→Academia, Maids Quarters→Dependência de empregada, Party Room→Salão de festas, Kitchen→Cozinha, Gourmet Area→Área gourmet, Playground→Playground, Cooling→Ar-condicionado, Pool→Piscina, Intercom→Interfone, Fenced Yard→Área cercada/condomínio fechado (o builder escolhe o rótulo mais fiel), Game room→Salão de jogos, Tennis court→Quadra de tênis, BBQ→Churrasqueira, Garden Area→Jardim, Exterior View→Vista panorâmica. Feature desconhecida na importação é registrada no relatório e ignorada, sem quebrar.

**Tipos:** "Studio" e "Loft" entram em `TIPOS`. A fonte do tipo é a Categoria da planilha (ver "Status da Loft e as duas planilhas"). O mapa VRSync → `TIPOS` (Apartment→Apartamento, Penthouse→Cobertura, Condo→Casa em condomínio, Home→Casa, Land Lot→Terreno, Office→Sala / Laje corporativa, Building→Prédio comercial, Studio→Studio) só vale se faltar a categoria.

**Obrigatoriedade para publicar:** continua a atual (finalidade, tipo, título, bairro, cidade, UF, valor, área, descrição). Os campos novos são opcionais.

## Importação

- É um script em `scripts/` (padrão dos existentes: `tsx --conditions=react-server`, lê o env), com entrada no `deploy/deploy.sh` (ex.: `deploy.sh importar-loft <url>`), rodando pelo túnel como `admin` e `exemplos`. O script aceita arquivo local para testes.
- **Idempotente pela `referenciaLoft`**, com uma tabela de controle da importação (ex.: `importacao_loft`: referência → `imovelId` anulável, foto instantânea dos valores importados, data). Decisões minhas, a partir da revisão:
  - **Imóvel novo** (referência nunca vista): cria, com código novo da sequence (`CZ1011`, `CZ1012`...). Os códigos `CZ####` não são substituídos pela referência da Loft: o padrão do site é CZ, e a referência fica guardada e buscável.
  - **Imóvel já importado:** a atualização é **por campo**. Um campo vindo do feed só é atualizado se o valor atual no banco ainda for igual ao da última importação, ou seja, se ninguém mexeu nele no painel. Os editados são mantidos e listados no relatório. Assim, reatribuir o corretor ou marcar lançamento não bloqueia a atualização de preço e fotos. A lista de fotos conta como um campo: se a equipe mexeu nas fotos (ordem, remoção, envio), a importação não toca nelas.
  - **Excluído no painel:** a linha de controle fica com `imovelId` nulo (FK `on delete set null`), e a referência **não é recriada** nas rodadas seguintes. Aparece no relatório como "excluído no painel, ignorado".
  - **Sumiu do feed** (vendido, retirado ou desmarcado de "Exibir no site" na Loft): se o imóvel ainda está como foi importado, passa para **indisponível** (a situação que o site já trata, com a tela de "imóvel indisponível" e `noindex`). Se a equipe já editou algo nele, não muda, e só entra no relatório. Se ele era a Oportunidade da Home, a Oportunidade é reatribuída pela regra abaixo.
  - **Foto:** não baixar de novo se já existir. A chave estável vem do id do imóvel + URL de origem.
- **Fotos:** **todas as fotos de cada imóvel** (decisão do usuário). `LIMITES.fotos` sobe de 40 para 60, no painel também. Baixar do CDN, validar o tipo (JPEG/PNG/WebP) e as dimensões reais (o `next/image` exige largura e altura), enviar ao armazenamento e criar `fotos` confirmadas e `imovel_fotos` na ordem do feed, com a `primary` primeiro. O alt text é gerado (ex.: "Apartamento no Vila da Serra — foto 3 de 18").
- **Situação** (decisão do usuário: "os mesmos status que eles têm no sistema antigo", nada vira rascunho por decisão nossa): os anúncios do feed são os marcados "Exibir no site" na Loft e entram como **publicado**, inclusive os incompletos e os que citam a rua na descrição (estes vão para o relatório). Título ausente é gerado como os da Loft ("Apartamento à venda no Vila da Serra, Nova Lima"). Descrição ausente fica vazia. Para os imóveis fora do feed (372 no CRM contra 348 no feed) e para o status exato de cada um, ver "Status da Loft" abaixo (pendente).
- **Responsável** (decisão do usuário): **Matheus Enrico Fonseca Carneiro** (`matheusenrico@hotmail.com`, dono da conta na Loft), criado como **Corretor**. O sistema tem um único ADMIN (o usuário, por enquanto). A importação recebe o e-mail do responsável como parâmetro e falha se ele não existir.

## Acesso inicial sem e-mail (senha provisória)

Ainda não há SMTP, então o convite por e-mail do painel não chega. Decisão do usuário: **senha inicial definida pelo ADMIN, com troca obrigatória no primeiro acesso**. Detalhamento (decisão minha):
- Ao convidar alguém (ou num usuário pendente), o ADMIN pode escolher "Definir senha provisória". O sistema **gera uma senha aleatória** e a mostra **uma vez** para o ADMIN repassar (WhatsApp, pessoalmente). Não é uma senha fixa igual para todos: uma senha padrão conhecida deixaria qualquer conta nova aberta para quem a conhece até o primeiro acesso.
- O usuário fica marcado como "precisa trocar a senha". No primeiro login, antes de qualquer outra tela do painel, ele é levado a definir a própria senha (mesmas regras de `erroNovaSenha`). Até trocar, nenhuma outra action do painel funciona para ele.
- A senha provisória expira em 72 h (o mesmo prazo do convite). Depois disso, o ADMIN gera outra.
- O fluxo por e-mail continua existindo: quando o SMTP for configurado, o convite por link volta a ser o padrão.
- Matheus é criado por esse fluxo.
- **Lançamento:** `false` para todos. A equipe marca no painel.
- **Título:** o do feed, cortado em `LIMITES.titulo` (90) por palavra.
- **Área:** `area` = `LivingArea`; se for 0, `LotArea`. `areaTotal` = `LotArea` só quando a `area` veio da `LivingArea` e a `LotArea` é maior que ela.
- **Exemplos atuais:** os 3 imóveis de exemplo (`cz1001`, `cz1009`, `cz1010`, com fotos provisórias do handoff) são removidos na primeira importação real, junto com as fotos deles no bucket (só as chaves desses imóveis, nunca uma limpeza em massa). A Oportunidade da Home passa para um imóvel importado: o de maior valor publicado com foto (decisão minha, e o ADMIN troca no painel).
- **Relatório** ao final: criados, atualizados, pulados (editados no painel), rascunhos e motivo, fotos baixadas/falhas, features desconhecidas e tipos sem mapa.
- **Carga:** 348 imóveis × ~19 fotos ≈ 6.500 fotos (algumas centenas de MB). Baixar com concorrência limitada (algo como 4 ao mesmo tempo) e retomável: rodar de novo continua de onde parou. O disco da VPS tem 39 GB livres.
- O feed pode ter sido regenerado entre uma rodada e outra. A última rodada é no dia do corte, quando a equipe para de usar a Loft.

## Status da Loft e as duas planilhas

O CRM tem 422 imóveis, em 9 status. O feed não traz status, e a configuração de colunas da listagem não oferece a coluna Status. Por isso os status vieram de **exportações da busca de imóveis filtradas por grupo de status** (CSV `;`, UTF-8 com BOM), salvas pelo usuário em 2026-10-29 na pasta acima do repositório (`carneir-ziller-site/`). Elas não entram no git, porque têm endereço completo:

| Arquivo | Filtro de status | Linhas |
|---|---|---|
| `imoveis.csv` | Venda, Aluguel, Venda e Aluguel (ativos) | 372 (os 348 do feed + 24 sem "Exibir no site") |
| `imoveis filtro.csv` | Pendente, Suspenso | 50 |
| (nenhum) | Vendido/Alugado Imobiliária/Terceiros | 0 |

As colunas das duas: `Referencia; Categoria; Endereco; Endereco Numero; Endereco Complemento; Dormitorio; Valor venda; Valor Aluguel; Bairro Comercial; Empreendimento; Valor M2 Aluguel; Valor M2 venda; Valor total aluguel`. Não há cidade, UF, área, fotos nem descrição.

**Mapeamento de situação** (decisão do usuário: "os mesmos status do sistema antigo"):
- No feed (ativo + "Exibir no site"): **publicado**.
- Ativo sem "Exibir no site" (24): **rascunho**. Decisão minha: na Loft eles escolheram não mostrar esses imóveis no site, então o equivalente é ficarem fora do site novo.
- Pendente/Suspenso (50): **rascunho**.
- Vendido/Alugado: não há nenhum hoje. Se aparecer numa rodada futura, vira **indisponível**.

**Imóveis só na planilha (74):** a importação usa os dados que a planilha traz (categoria → tipo, bairro, dormitórios → quartos, valor de venda/aluguel → finalidade e valores, endereço interno, empreendimento, referência). Eles ficam sem fotos e sem descrição, e a cidade e a área ficam vazias, porque a planilha não tem esses dados. Como são rascunhos, isso não afeta o site. A equipe completa no painel se for publicar algum.

**A planilha também enriquece os 348 do feed:**
- **Empreendimento** (nome do prédio/condomínio, preenchido em 133 dos 372) vira um campo novo da ficha, `empreendimento` (texto, opcional). Ele aparece no painel, na busca do painel e na página do imóvel, porque o nome do condomínio é argumento de venda e não revela a unidade.
- A **Categoria** da Loft (em português, mais fiel que o `PropertyType` do VRSync) é a fonte preferida do tipo. Categorias encontradas: Apartamento 178+27, Casa em Condomínio 76+8, Terreno 59+9, Cobertura 25+5, Casa 13+1, Sala Comercial 7, Studio 5, Salas/Conjuntos 3, Área 3, Loft 2, Apartamento Duplex 1. Mapa (decisão minha): Apartamento e Apartamento Duplex→Apartamento, Casa em Condomínio→Casa em condomínio, Terreno e Área→Terreno, Cobertura→Cobertura, Casa→Casa, Sala Comercial e Salas/Conjuntos→Sala / Laje corporativa, Studio→Studio (novo em `TIPOS`), Loft→Loft (novo em `TIPOS`). O `PropertyType` do feed fica só como reserva.

**Uso:** o script recebe o feed (URL ou arquivo) e os caminhos das planilhas. Ele junta tudo pela referência, e a planilha decide a situação. Feed e planilhas podem ser atualizados e reexportados até o corte.

## Filtros

**Grid público** (`/imoveis`, filtros na URL em `src/lib/imoveis/filtros.ts`):
- Novo: **suítes mínimas** (1–4+), no padrão de quartos e vagas.
- Novo: **características**, com algumas das mais procuradas (piscina, academia, área gourmet, varanda se existir no feed), multisseleção. O builder escolhe a forma de mostrar dentro do padrão visual do painel de filtros.
- Busca textual (`q`): incluir o código e a referência Loft, nunca o endereço.
- "Alugar" passa a incluir imóveis de venda com `valorLocacao`.
- A faixa de preço de locação usa o `valorLocacao` quando a finalidade é venda.

**Painel** (`ListaImoveis`): hoje busca por código ou título, com filtros de situação, finalidade, responsável e lançamento. Novo:
- busca também por bairro e referência Loft;
- filtro por tipo e por cidade.

Com centenas de imóveis, a lista precisa continuar rápida. Paginação, se ainda não houver, fica a critério do builder.

## Página do imóvel e cards

- **Página:** mostrar banheiros, suítes, área total (quando houver e for maior que a privativa), condomínio, IPTU, andar e ano quando preenchidos, e a lista de características. Valor de locação junto ao de venda quando houver. O layout segue o handoff.
- **Card do grid:** sem mudanças além do valor de locação, se houver espaço no padrão atual.

## Restrições

- Next 16 com `cacheComponents`: o catálogo continua atrás de `"use cache"` + `TAG_IMOVEIS`, e a importação precisa invalidar o cache. Como o script roda fora do app, o caminho mais simples é um redeploy ou o próprio TTL de 5 min (o builder escolhe e documenta).
- Migrations novas pelo Drizzle (`npm run db:gerar`), aplicadas pelo `deploy.sh` como hoje.
- Testes no padrão do projeto: Vitest com PGlite para importação, regras e filtros, e o feed de teste como fixture pequena e anonimizada, sem a URL real nem endereços reais. Os E2E existentes continuam passando.
- Endereço: garantir que a camada pública (`src/lib/imoveis/catalogo.ts` → tipos `Imovel`/`ImovelResumo`) **não seleciona** os campos de endereço, e um teste confirma isso.
- A VPS é compartilhada: nada de limpeza em massa no bucket ou no banco. Remover só chaves e linhas identificadas.

## Fica a critério do builder

- Nomes exatos de colunas e tipos, e se `caracteristicas` vira `text[]` ou uma tabela de ligação.
- O layout fino dos campos novos no painel e na página do imóvel, dentro do padrão existente.
- Quais características viram filtro rápido no grid.
- Paginação da lista do painel.
- Como invalidar o cache depois da importação.
