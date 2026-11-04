// Consultas do site sobre o banco (lib/dados). Só entram imóveis publicados;
// indisponíveis existem apenas para a página com o aviso. Sem cache: ./index.ts
// as expõe com "use cache" para as páginas. O último parâmetro é o banco
// (padrão: conexão do app; os testes passam um PGlite).
import { eq } from "drizzle-orm";
import { conexao, type Db } from "@/lib/dados/conexao";
import { carregarImovel, carregarImoveis } from "@/lib/dados/consultas";
import { configuracaoSite, imoveis } from "@/lib/dados/esquema";
import type { RegistroImovel } from "@/lib/dados/tipos";
import { FAIXAS_AREA, TIPOS, combinaFinalidade, faixasPreco, type Faixa, type FinalidadeFiltro, type Filtros } from "./filtros";
import { formatarArea, formatarPreco, formatarQuartos, formatarReais, rotuloEtiqueta } from "./formato";
import { rotuloCaracteristica } from "./caracteristicas";
import { regioes } from "./mock-data";
import type { Destaque, Imovel, ImovelCard, ImovelResumo, PaginaImoveis, Regiao, ResultadoImovel } from "./types";

export const POR_PAGINA = 24;
/** Cards por seção automática da Home. */
export const CARDS_HOME = 4;

const normalizar = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .trim();

/** Publicado com todos os campos que o site exibe (a publicação exige todos). */
type Completo = RegistroImovel & { finalidade: NonNullable<RegistroImovel["finalidade"]>; tipo: string; valor: number; area: number };

export function completo(r: RegistroImovel): r is Completo {
  return r.finalidade !== null && r.tipo !== null && r.valor !== null && r.area !== null;
}

/** Card do grid de um imóvel publicado sem fotos (a página mostra "FOTOS EM BREVE"). */
const SEM_FOTO = { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 };

function paraImovel(r: Completo): Imovel {
  const capa = r.fotos[0];
  return {
    id: r.id,
    codigo: r.codigo,
    finalidade: r.finalidade,
    lancamento: r.lancamento,
    tipo: r.tipo,
    titulo: r.titulo,
    bairro: r.bairro,
    cidade: r.cidade,
    uf: r.uf,
    valor: r.valor,
    area: r.area,
    quartos: r.quartos,
    vagas: r.vagas,
    suites: r.suites,
    valorLocacao: r.valorLocacao,
    banheiros: r.banheiros,
    areaTotal: r.areaTotal,
    condominio: r.condominio,
    iptu: r.iptu,
    andar: r.andar,
    anoConstrucao: r.anoConstrucao,
    empreendimento: r.empreendimento,
    caracteristicas: r.caracteristicas.flatMap((chave) => {
      const rotulo = rotuloCaracteristica(chave);
      return rotulo ? [{ chave, rotulo }] : [];
    }),
    foto: capa ? { src: capa.src, alt: capa.alt, largura: capa.largura, altura: capa.altura } : SEM_FOTO,
    descricao: r.descricao
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    fotos: r.fotos.map(({ src, alt, largura, altura }) => ({ src, alt, largura, altura })),
  };
}

/** Publicados, na ordem do código. */
async function publicados(db: Db): Promise<Completo[]> {
  return (await carregarImoveis(db, eq(imoveis.situacao, "publicado"))).filter(completo);
}

async function oportunidadeId(db: Db): Promise<string | null> {
  const [c] = await db.select({ id: configuracaoSite.oportunidadeId }).from(configuracaoSite).where(eq(configuracaoSite.id, 1)).limit(1);
  return c?.id ?? null;
}

function resumo(i: Imovel): ImovelResumo {
  const { id, codigo, finalidade, lancamento, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, suites, valorLocacao, foto } = i;
  return { id, codigo, finalidade, lancamento, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, suites, valorLocacao, foto };
}

/** Em "Alugar", a faixa vale para o aluguel: o valor de locação de um imóvel à venda. */
function naFaixaDePreco(filtros: Filtros, faixa: Faixa | undefined, i: Imovel): boolean {
  if (!faixa) return true;
  const valor = filtros.finalidade === "alugar" && i.finalidade === "venda" ? i.valorLocacao : i.valor;
  return valor !== null && valor >= faixa[2] && valor < faixa[3];
}

/** Mais recente primeiro; sem data de publicação por último; empate pelo código. */
function maisRecentes(a: Completo, b: Completo): number {
  if (a.publicadoEm !== b.publicadoEm) {
    if (a.publicadoEm === null) return 1;
    if (b.publicadoEm === null) return -1;
    return b.publicadoEm.localeCompare(a.publicadoEm);
  }
  return a.codigo.localeCompare(b.codigo);
}

/** "<Cidade>" ou "<Bairro>, <Cidade>" (a vírgula separa pela última). Local desconhecido não casa com nada. */
function noLocal(local: string, i: Pick<Imovel, "bairro" | "cidade">): boolean {
  const virgula = local.lastIndexOf(",");
  if (virgula === -1) return normalizar(i.cidade) === normalizar(local);
  return normalizar(i.bairro) === normalizar(local.slice(0, virgula)) && normalizar(i.cidade) === normalizar(local.slice(virgula + 1));
}

/** Valor que a ordenação por preço usa: em "Alugar", o aluguel; em lançamentos, a venda. */
function valorParaOrdem(filtros: Filtros, i: Imovel): number | null {
  return filtros.finalidade === "alugar" && i.finalidade === "venda" ? i.valorLocacao : i.valor;
}

/** Ordena sem alterar a ordem de entrada (já a padrão) nos empates; sem valor vai por último. */
function ordenar(lista: Imovel[], filtros: Filtros): Imovel[] {
  if (!filtros.ordem) return lista;
  const { ordem } = filtros;
  if (ordem === "maior-area") return [...lista].sort((a, b) => b.area - a.area);
  const sinal = ordem === "maior-preco" ? -1 : 1;
  return [...lista].sort((a, b) => {
    const va = valorParaOrdem(filtros, a);
    const vb = valorParaOrdem(filtros, b);
    if (va === null || vb === null) return va === vb ? 0 : va === null ? 1 : -1;
    return sinal * (va - vb);
  });
}

async function filtrar(filtros: Filtros, db: Db): Promise<Imovel[]> {
  const q = filtros.q ? normalizar(filtros.q) : "";
  const preco = faixasPreco(filtros.finalidade).find(([v]) => v === filtros.preco);
  const area = FAIXAS_AREA.find(([v]) => v === filtros.area);
  const local = filtros.local;
  const lista = (await publicados(db))
    .sort(maisRecentes)
    .map(paraImovel)
    .filter(
      (i) =>
        combinaFinalidade(filtros.finalidade, i) &&
        (!local || noLocal(local, i)) &&
        (!q || normalizar(`${i.titulo} ${i.bairro} ${i.cidade} ${i.codigo} ${i.empreendimento ?? ""}`).includes(q)) &&
        (!filtros.tipo || i.tipo === filtros.tipo) &&
        naFaixaDePreco(filtros, preco, i) &&
        (!area || (i.area >= area[2] && i.area < area[3])) &&
        (!filtros.quartos || (i.quartos ?? 0) >= Number(filtros.quartos)) &&
        (!filtros.vagas || (i.vagas ?? 0) >= Number(filtros.vagas)) &&
        (!filtros.suites || (i.suites ?? 0) >= Number(filtros.suites)) &&
        (filtros.carac ?? []).every((c) => i.caracteristicas.some((x) => x.chave === c)),
    );
  return ordenar(lista, filtros);
}

/** Cidades e bairros dos publicados, em ordem alfabética (pt-BR). */
export async function opcoesLocalizacao(db: Db = conexao()): Promise<{ cidade: string; bairros: string[] }[]> {
  const porCidade = new Map<string, Set<string>>();
  for (const r of await publicados(db)) {
    if (!porCidade.has(r.cidade)) porCidade.set(r.cidade, new Set());
    porCidade.get(r.cidade)?.add(r.bairro);
  }
  const alfa = (a: string, b: string) => a.localeCompare(b, "pt-BR");
  return [...porCidade]
    .sort(([a], [b]) => alfa(a, b))
    .map(([cidade, bairros]) => ({ cidade, bairros: [...bairros].sort(alfa) }));
}

/** Remove `local` que não exista nas opções e reescreve o que existe para a grafia do catálogo. */
export function validarLocal(filtros: Filtros, opcoes: { cidade: string; bairros: string[] }[]): Filtros {
  const { local, ...resto } = filtros;
  if (!local) return filtros;
  const alvo = normalizar(local);
  for (const { cidade, bairros } of opcoes) {
    if (normalizar(cidade) === alvo) return { ...resto, local: cidade };
    const bairro = bairros.find((b) => normalizar(`${b}, ${cidade}`) === alvo);
    if (bairro) return { ...resto, local: `${bairro}, ${cidade}` };
  }
  return resto;
}

/** Imóveis por tipo para a finalidade, só os tipos com algum, na ordem de TIPOS. */
export async function contarPorTipo(finalidade: FinalidadeFiltro | undefined, db: Db = conexao()): Promise<{ tipo: string; total: number }[]> {
  const candidatos = (await publicados(db)).filter((r) => combinaFinalidade(finalidade, r));
  return TIPOS.map((tipo) => ({ tipo, total: candidatos.filter((r) => r.tipo === tipo).length })).filter((t) => t.total > 0);
}

export async function buscarImoveis(filtros: Filtros, db: Db = conexao()): Promise<PaginaImoveis> {
  const lista = await filtrar(filtros, db);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, filtros.pagina), paginas);
  return {
    itens: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(resumo),
    total: lista.length,
    pagina,
    paginas,
  };
}

export async function contarImoveis(filtros: Filtros, db: Db = conexao()): Promise<number> {
  return (await filtrar(filtros, db)).length;
}

export async function obterImovel(id: string, db: Db = conexao()): Promise<ResultadoImovel> {
  const r = await carregarImovel(db, id);
  if (!r || r.situacao === "rascunho") return { situacao: "inexistente" };
  if (r.situacao === "indisponivel" || !completo(r)) return { situacao: "indisponivel", codigo: r.codigo };
  return { situacao: "disponivel", imovel: paraImovel(r) };
}

/** Páginas a pré-renderizar: publicados e indisponíveis (estes respondem com o aviso). */
export async function listarIdsImoveis(db: Db = conexao()): Promise<string[]> {
  const todos = await carregarImoveis(db);
  return todos.filter((r) => r.situacao !== "rascunho").map((r) => r.id);
}

// ---------- Home ----------

function card(i: Imovel): ImovelCard {
  return {
    id: i.id,
    badge: rotuloEtiqueta(i),
    title: i.titulo,
    location: `${i.bairro}, ${i.cidade}`,
    price: formatarPreco(i.valor, i.finalidade),
    area: formatarArea(i.area),
    beds: i.quartos ? formatarQuartos(i.quartos) : undefined,
    img: i.foto.src,
    alt: i.foto.alt || i.titulo,
  };
}

/** Oportunidade de hoje: escolha manual do ADMIN. Sem imóvel publicado escolhido, a seção some. */
export async function oportunidadeDeHoje(db: Db = conexao()): Promise<Destaque | null> {
  const id = await oportunidadeId(db);
  const r = id ? await carregarImovel(db, id) : null;
  if (!r || r.situacao !== "publicado" || !completo(r)) return null;
  const i = paraImovel(r);
  const capa = i.fotos[0] ?? SEM_FOTO;
  return {
    id: i.id,
    codigo: i.codigo,
    tipo: i.tipo,
    titulo: i.titulo,
    local: `${i.bairro}, ${i.cidade} - ${i.uf}`,
    descricao: i.descricao[0] ?? "",
    area: formatarArea(i.area),
    quartos: i.quartos ? String(i.quartos) : undefined,
    vagas: i.vagas ? String(i.vagas) : undefined,
    valor: formatarReais(i.valor) + (i.finalidade === "locacao" ? "/mês" : ""),
    img: capa.src,
    alt: capa.alt || i.titulo,
  };
}

/** Mais recentes pela data da primeira publicação, sem repetir a Oportunidade de hoje. */
async function recentes(filtro: (r: Completo) => boolean, db: Db): Promise<ImovelCard[]> {
  const [oportunidade, todos] = await Promise.all([oportunidadeId(db), publicados(db)]);
  return todos
    .filter((r) => r.id !== oportunidade && filtro(r))
    .sort((a, b) => (b.publicadoEm ?? "").localeCompare(a.publicadoEm ?? ""))
    .slice(0, CARDS_HOME)
    .map((r) => card(paraImovel(r)));
}

/** Seção Lançamentos: automática. */
export function lancamentosHome(db: Db = conexao()): Promise<ImovelCard[]> {
  return recentes((r) => r.lancamento, db);
}

/** Há ao menos um lançamento publicado? Decide se o menu mostra "Lançamentos". */
export async function temLancamentos(db: Db = conexao()): Promise<boolean> {
  return (await publicados(db)).some((r) => r.lancamento);
}

/** Seção "Imóveis em destaque", aba Venda: automática, sem lançamentos (que têm seção própria). */
export function vendaHome(db: Db = conexao()): Promise<ImovelCard[]> {
  return recentes((r) => r.finalidade === "venda" && !r.lancamento, db);
}

/** Seção "Imóveis em destaque", aba Locação: automática. */
export function locacaoHome(db: Db = conexao()): Promise<ImovelCard[]> {
  return recentes((r) => r.finalidade === "locacao", db);
}

export function regioesHome(): Regiao[] {
  return regioes;
}
