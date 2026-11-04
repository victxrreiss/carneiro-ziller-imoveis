// Relatório de cadastro para a equipe: avisos por imóvel (publicados e rascunhos) e
// prováveis duplicados. Só leitura. O CSV nunca traz endereço, número, complemento ou CEP.
import { inArray } from "drizzle-orm";
import type { Db } from "../../src/lib/dados/criar-conexao";
import { carregarImoveis } from "../../src/lib/dados/consultas";
import { imoveis } from "../../src/lib/dados/esquema";
import type { RegistroImovel } from "../../src/lib/dados/tipos";

export type LinhaProblema = { codigo: string; titulo: string; situacao: string; problemas: string[] };
export type GrupoDuplicado = { codigos: string[]; motivo: string };

const CITA_RUA = /\b(rua|r\.|avenida|av\.|alameda|al\.|travessa|praça)\s+[^\n,]{2,60},?\s*(n[º°o.]*\s*)?\d{1,5}\b/i;
/** Diferença máxima, relativa ao menor dos dois valores, para considerar "igual". */
const TOLERANCIA = 0.02;

function problemasDe(i: RegistroImovel): string[] {
  const p: string[] = [];
  if (!i.area) p.push("sem área");
  if (!i.finalidade) p.push("sem finalidade");
  if (!i.valor) p.push("sem valor");
  if (CITA_RUA.test(i.descricao)) p.push("descrição cita rua e número");
  return p;
}

function proximos(a: number | null, b: number | null): boolean {
  if (!a || !b) return false;
  return Math.abs(a - b) / Math.min(a, b) <= TOLERANCIA;
}

const norm = (s: string | null) => (s ?? "").trim().toLowerCase().replace(/\s+/g, " ");

function chaveDeGrupo(i: RegistroImovel): { chave: string; motivo: string } | null {
  if (!i.tipo) return null;
  const emp = norm(i.empreendimento);
  if (emp) return { chave: `${norm(i.tipo)}|emp|${emp}`, motivo: `mesmo tipo e empreendimento (${i.empreendimento!.trim()}), área e valor iguais ou a até 2%` };
  const bairro = norm(i.bairro);
  const cidade = norm(i.cidade);
  if (!bairro || !cidade) return null;
  return { chave: `${norm(i.tipo)}|bai|${bairro}|${cidade}`, motivo: `mesmo tipo, bairro e cidade (${i.bairro.trim()}, ${i.cidade.trim()}), área e valor iguais ou a até 2%` };
}

function duplicadosDe(lista: RegistroImovel[]): GrupoDuplicado[] {
  const porChave = new Map<string, { motivo: string; itens: RegistroImovel[] }>();
  for (const i of lista) {
    const g = chaveDeGrupo(i);
    if (!g) continue;
    const e = porChave.get(g.chave) ?? { motivo: g.motivo, itens: [] };
    e.itens.push(i);
    porChave.set(g.chave, e);
  }
  const grupos: GrupoDuplicado[] = [];
  for (const { motivo, itens } of porChave.values()) {
    // Componentes conexos: A~B e B~C põem os três juntos.
    const pai = itens.map((_, k) => k);
    const raiz = (k: number): number => (pai[k] === k ? k : (pai[k] = raiz(pai[k])));
    for (let a = 0; a < itens.length; a++)
      for (let b = a + 1; b < itens.length; b++)
        if (proximos(itens[a].area, itens[b].area) && proximos(itens[a].valor, itens[b].valor)) pai[raiz(a)] = raiz(b);
    const comp = new Map<number, string[]>();
    itens.forEach((it, k) => comp.set(raiz(k), [...(comp.get(raiz(k)) ?? []), it.codigo]));
    for (const codigos of comp.values()) if (codigos.length > 1) grupos.push({ codigos, motivo });
  }
  return grupos.sort((a, b) => a.codigos[0].localeCompare(b.codigos[0]));
}

/** Só publicados e rascunhos (indisponíveis ficam de fora). */
export async function montarRelatorio(db: Db): Promise<{ problemas: LinhaProblema[]; duplicados: GrupoDuplicado[] }> {
  const lista = await carregarImoveis(db, inArray(imoveis.situacao, ["publicado", "rascunho"]));
  const problemas = lista
    .map((i) => ({ codigo: i.codigo, titulo: i.titulo, situacao: i.situacao as string, problemas: problemasDe(i) }))
    .filter((l) => l.problemas.length > 0);
  return { problemas, duplicados: duplicadosDe(lista) };
}

function celula(valor: string): string {
  // Evita que o Excel interprete o texto como fórmula.
  const seguro = /^[=+\-@]/.test(valor) ? `'${valor}` : valor;
  return /[;"\r\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
}
const linha = (cols: string[]) => cols.map(celula).join(";");

export function paraCsv(r: { problemas: LinhaProblema[]; duplicados: GrupoDuplicado[] }): string {
  const linhas = [
    "Avisos do cadastro",
    linha(["Código", "Título", "Situação", "Avisos"]),
    ...r.problemas.map((p) => linha([p.codigo, p.titulo, p.situacao, p.problemas.join(", ")])),
    "",
    "Prováveis duplicados",
    linha(["Códigos", "Motivo"]),
    ...r.duplicados.map((d) => linha([d.codigos.join(", "), d.motivo])),
  ];
  return `\uFEFF${linhas.join("\r\n")}\r\n`;
}
