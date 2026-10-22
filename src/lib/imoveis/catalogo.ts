// Consultas do site sobre a base (lib/dados). Só entram imóveis publicados;
// indisponíveis existem apenas para a página com o aviso. Funções puras, sem
// cache: ./index.ts as expõe com "use cache" para as páginas.
import { banco } from "@/lib/dados/banco";
import type { RegistroImovel } from "@/lib/dados/tipos";
import { FAIXAS_AREA, combinaFinalidade, faixasPreco, type Filtros } from "./filtros";
import { formatarArea, formatarPreco, formatarQuartos, formatarReais, rotuloEtiqueta } from "./formato";
import { regioes } from "./mock-data";
import type { Destaque, Imovel, ImovelCard, ImovelResumo, PaginaImoveis, Regiao, ResultadoImovel } from "./types";

export const POR_PAGINA = 15;
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

function completo(r: RegistroImovel): r is Completo {
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
    foto: capa ? { src: capa.src, alt: capa.alt, largura: capa.largura, altura: capa.altura } : SEM_FOTO,
    descricao: r.descricao
      .split(/\n\s*\n/)
      .map((p) => p.trim())
      .filter(Boolean),
    fotos: r.fotos.map(({ src, alt, largura, altura }) => ({ src, alt, largura, altura })),
  };
}

/** Publicados, na ordem do código. */
function publicados(): Completo[] {
  return [...banco().imoveis.values()]
    .filter((r): r is Completo => r.situacao === "publicado" && completo(r))
    .sort((a, b) => a.codigo.localeCompare(b.codigo));
}

function resumo(i: Imovel): ImovelResumo {
  const { id, codigo, finalidade, lancamento, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, foto } = i;
  return { id, codigo, finalidade, lancamento, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, foto };
}

function filtrar(filtros: Filtros): Imovel[] {
  const q = filtros.q ? normalizar(filtros.q) : "";
  const preco = faixasPreco(filtros.finalidade).find(([v]) => v === filtros.preco);
  const area = FAIXAS_AREA.find(([v]) => v === filtros.area);
  return publicados()
    .map(paraImovel)
    .filter(
      (i) =>
        combinaFinalidade(filtros.finalidade, i) &&
        (!q || normalizar(`${i.titulo} ${i.bairro} ${i.cidade} ${i.codigo}`).includes(q)) &&
        (!filtros.tipo || i.tipo === filtros.tipo) &&
        (!preco || (i.valor >= preco[2] && i.valor < preco[3])) &&
        (!area || (i.area >= area[2] && i.area < area[3])) &&
        (!filtros.quartos || (i.quartos ?? 0) >= Number(filtros.quartos)) &&
        (!filtros.vagas || (i.vagas ?? 0) >= Number(filtros.vagas)),
    );
}

export function buscarImoveis(filtros: Filtros): PaginaImoveis {
  const lista = filtrar(filtros);
  const paginas = Math.max(1, Math.ceil(lista.length / POR_PAGINA));
  const pagina = Math.min(Math.max(1, filtros.pagina), paginas);
  return {
    itens: lista.slice((pagina - 1) * POR_PAGINA, pagina * POR_PAGINA).map(resumo),
    total: lista.length,
    pagina,
    paginas,
  };
}

export function contarImoveis(filtros: Filtros): number {
  return filtrar(filtros).length;
}

export function obterImovel(id: string): ResultadoImovel {
  const r = banco().imoveis.get(id);
  if (!r || r.situacao === "rascunho") return { situacao: "inexistente" };
  if (r.situacao === "indisponivel" || !completo(r)) return { situacao: "indisponivel", codigo: r.codigo };
  return { situacao: "disponivel", imovel: paraImovel(r) };
}

/** Páginas a pré-renderizar: publicados e indisponíveis (estes respondem com o aviso). */
export function listarIdsImoveis(): string[] {
  return [...banco().imoveis.values()].filter((r) => r.situacao !== "rascunho").map((r) => r.id);
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
export function oportunidadeDeHoje(): Destaque | null {
  const id = banco().oportunidadeId;
  const r = id ? banco().imoveis.get(id) : undefined;
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
function recentes(filtro: (r: Completo) => boolean): ImovelCard[] {
  const oportunidade = banco().oportunidadeId;
  return publicados()
    .filter((r) => r.id !== oportunidade && filtro(r))
    .sort((a, b) => (b.publicadoEm ?? "").localeCompare(a.publicadoEm ?? ""))
    .slice(0, CARDS_HOME)
    .map((r) => card(paraImovel(r)));
}

/** Seção Lançamentos: automática. */
export function lancamentosHome(): ImovelCard[] {
  return recentes((r) => r.lancamento);
}

/** Seção "Imóveis em destaque", aba Venda: automática, sem lançamentos (que têm seção própria). */
export function vendaHome(): ImovelCard[] {
  return recentes((r) => r.finalidade === "venda" && !r.lancamento);
}

/** Seção "Imóveis em destaque", aba Locação: automática. */
export function locacaoHome(): ImovelCard[] {
  return recentes((r) => r.finalidade === "locacao");
}

export function regioesHome(): Regiao[] {
  return regioes;
}
