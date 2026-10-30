// npm run loft:importar -- --feed <url|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email> [--simular] [--forcar]
// Importa os imóveis da Loft (feed VRSync + as duas planilhas do CRM) para o banco e
// o S3 do ambiente atual. Em produção, rode por `deploy/deploy.sh importar-loft ...`.
// `--simular` lê, junta e mostra o resumo sem gravar nada. O relatório da rodada real
// também vai para `relatorio-loft-<data>.json` na pasta atual (fora do git).
// `--forcar` segue mesmo se o feed parecer truncado (menos de 80% dos publicados de antes).
// A URL do feed é sensível: nunca é impressa. Prefira baixar o feed para um arquivo e passar o arquivo.
import "./ambiente";
import { eq } from "drizzle-orm";
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { armazenamentoS3 } from "../src/lib/armazenamento";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { usuarios } from "../src/lib/dados/esquema";
import { importarLoft, type BaixarFoto, type LerDimensoes, type Progresso, type Relatorio } from "./loft/importar";
import { juntarDetalhado, type ImovelLoft, type Ignorados } from "./loft/mapear";
import { lerPlanilha } from "./loft/planilha";
import { lerVrsync } from "./loft/vrsync";

export type Argumentos = { feed: string; ativos: string; pendentes: string; responsavel: string; simular: boolean; forcar: boolean };

export function lerArgumentos(argv: string[]): Argumentos {
  const { values } = parseArgs({
    args: argv,
    options: {
      feed: { type: "string" },
      ativos: { type: "string" },
      pendentes: { type: "string" },
      responsavel: { type: "string" },
      simular: { type: "boolean", default: false },
      forcar: { type: "boolean", default: false },
    },
  });
  for (const nome of ["feed", "ativos", "pendentes", "responsavel"] as const) {
    if (!values[nome]) throw new Error(`Informe --${nome}.`);
  }
  return { feed: values.feed!, ativos: values.ativos!, pendentes: values.pendentes!, responsavel: values.responsavel!, simular: values.simular ?? false, forcar: values.forcar ?? false };
}

const ehUrl = (s: string) => /^https?:\/\//i.test(s);

async function esperar(url: string, tentativas: number, tempoMs: number): Promise<Uint8Array> {
  let ultimo: unknown;
  for (let k = 1; k <= tentativas; k++) {
    try {
      const r = await fetch(url, { signal: AbortSignal.timeout(tempoMs) });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return new Uint8Array(await r.arrayBuffer());
    } catch (e) {
      ultimo = e;
    }
  }
  throw ultimo instanceof Error ? ultimo : new Error(String(ultimo));
}

/** O tipo real é decidido pelos bytes em `importarLoft`; o valor devolvido aqui é só informativo. */
export const baixar: BaixarFoto = async (url) => ({ bytes: await esperar(url, 2, 30_000), tipo: "" });

export const dimensoes: LerDimensoes = async (bytes) => {
  const m = await sharp(bytes).metadata();
  return { largura: m.width ?? 0, altura: m.height ?? 0 };
};

export async function lerFeed(origem: string): Promise<{ xml: string; nome: string }> {
  if (!ehUrl(origem) && !(await stat(origem).then((s) => s.isFile(), () => false))) {
    // Não repete o valor: poderia ser uma URL digitada errado.
    throw new Error("Feed não encontrado (use um arquivo existente ou uma URL http/https).");
  }
  if (ehUrl(origem)) {
    const bytes = await esperar(origem, 1, 60_000).catch(() => {
      throw new Error("Não foi possível baixar o feed (URL oculta).");
    });
    return { xml: new TextDecoder().decode(bytes), nome: "URL (oculta)" };
  }
  return { xml: await readFile(origem, "utf8"), nome: path.basename(origem) };
}

function contar(lista: ImovelLoft[]) {
  const por = (s: string) => lista.filter((i) => i.situacao === s).length;
  const semTipo = lista.filter((i) => i.tipo === null);
  const avisos = lista.reduce((n, i) => n + i.avisos.length, 0);
  return { total: lista.length, publicados: por("publicado"), rascunhos: por("rascunho"), semTipo, avisos };
}

function linhaIgnorados(g: Ignorados): string[] {
  const total = g.feed + g.ativos + g.pendentes;
  return total ? [`  ignorados por referência vazia: ${total} (feed ${g.feed}, ativos ${g.ativos}, pendentes ${g.pendentes})`] : [];
}

function resumoSimulacao(lista: ImovelLoft[], ignorados: Ignorados): string {
  const c = contar(lista);
  return [
    `Simulação (nada foi gravado): ${c.total} imóveis.`,
    `  publicados: ${c.publicados}`,
    `  rascunhos: ${c.rascunhos}`,
    `  tipos sem mapa: ${c.semTipo.length}${c.semTipo.length ? ` (${c.semTipo.map((i) => i.referencia).join(", ")})` : ""}`,
    `  avisos: ${c.avisos} em ${lista.filter((i) => i.avisos.length).length} imóveis`,
    `  fotos a baixar: ${lista.reduce((n, i) => n + i.fotos.length, 0)}`,
    ...linhaIgnorados(ignorados),
  ].join("\n");
}

/** Uma linha por imóvel: só referência e código (nunca endereço nem URL). */
export function linhaProgresso(p: Progresso): string {
  const fotos = p.fotos ? ` (${p.fotos.ok}/${p.fotos.total} fotos)` : "";
  return `[${p.n}/${p.total}] ref ${p.referencia} → ${p.acao}${p.codigo ? ` ${p.codigo}` : ""}${fotos}`;
}

function resumoRelatorio(r: Relatorio, ignorados: Ignorados): string {
  return [
    "Importação concluída.",
    `  criados: ${r.criados.length}`,
    `  atualizados: ${r.atualizados.length}`,
    `  com campos preservados (editados no painel): ${r.camposPreservados.length}`,
    `  indisponibilizados (saíram da Loft): ${r.indisponibilizados.length}`,
    `  rascunhos ausentes (ficam como estão): ${r.ausentesRascunho.length}`,
    `  excluídos no painel (não voltam): ${r.excluidosNoPainel.length}`,
    `  fotos baixadas: ${r.fotosBaixadas}`,
    `  fotos com falha: ${r.fotosFalhas.length}`,
    `  avisos: ${r.avisos.length}`,
    `  exemplos removidos: ${r.exemplosRemovidos.length}`,
    `  Oportunidade: ${r.oportunidade ?? "inalterada"}`,
    ...linhaIgnorados(ignorados),
  ].join("\n");
}

const dataHora = (d: Date) => {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}`;
};

async function main() {
  let args: Argumentos;
  try {
    args = lerArgumentos(process.argv.slice(2));
  } catch (e) {
    // Mensagem própria (nunca a do parseArgs, que poderia repetir a URL do feed).
    const falta = e instanceof Error && e.message.startsWith("Informe --") ? `${e.message} ` : "";
    console.error(`${falta}Argumentos inválidos. Uso: npm run loft:importar -- --feed <url|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email> [--simular] [--forcar]`);
    process.exit(1);
  }

  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    // Confere o responsável antes de baixar o feed (vale também na simulação).
    const email = args.responsavel.trim().toLowerCase();
    const [resp] = await db.select({ id: usuarios.id, situacao: usuarios.situacao }).from(usuarios).where(eq(usuarios.email, email)).limit(1);
    if (!resp) throw new Error(`Responsável não encontrado: ${email}. Crie o usuário no painel antes.`);
    if (resp.situacao === "desativado") throw new Error(`O responsável ${email} está desativado: use um usuário ativo ou pendente.`);

    const feed = await lerFeed(args.feed);
    console.log(`feed: ${feed.nome}`);
    const { lista, ignorados } = juntarDetalhado(
      lerVrsync(feed.xml),
      lerPlanilha(await readFile(args.ativos, "utf8")),
      lerPlanilha(await readFile(args.pendentes, "utf8")),
    );

    if (args.simular) {
      console.log(resumoSimulacao(lista, ignorados));
      return;
    }

    const arquivo = `relatorio-loft-${dataHora(new Date())}.json`;
    const gravar = (r: Relatorio) => writeFile(arquivo, JSON.stringify({ ...r, ignorados }, null, 2));
    const relatorio = await importarLoft(db, lista, {
      responsavelId: resp.id,
      armazenamento: armazenamentoS3(),
      baixar,
      dimensoes,
      forcar: args.forcar,
      aoProgredir: (p) => console.log(linhaProgresso(p)),
      aoGravarParcial: gravar,
    });
    console.log(resumoRelatorio(relatorio, ignorados));
    await gravar(relatorio);
    console.log(`Relatório completo: ${arquivo}`);
    if (relatorio.fotosFalhas.length) process.exitCode = 2;
  } finally {
    await fechar();
  }
}

if (process.argv[1] && /importar-loft\.ts$/.test(process.argv[1])) {
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
}
