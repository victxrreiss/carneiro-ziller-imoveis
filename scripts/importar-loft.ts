// npm run loft:importar -- --feed <url|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email> [--simular]
// Importa os imóveis da Loft (feed VRSync + as duas planilhas do CRM) para o banco e
// o S3 do ambiente atual. Em produção, rode por `deploy/deploy.sh importar-loft ...`.
// `--simular` lê, junta e mostra o resumo sem gravar nada. O relatório da rodada real
// também vai para `relatorio-loft-<data>.json` na pasta atual (fora do git).
// A URL do feed é sensível: nunca é impressa.
import "./ambiente";
import { eq } from "drizzle-orm";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import sharp from "sharp";
import { armazenamentoS3 } from "../src/lib/armazenamento";
import { configBanco } from "../src/lib/config";
import { criarConexao } from "../src/lib/dados/criar-conexao";
import { usuarios } from "../src/lib/dados/esquema";
import { importarLoft, type BaixarFoto, type LerDimensoes, type Relatorio } from "./loft/importar";
import { juntar, type ImovelLoft } from "./loft/mapear";
import { lerPlanilha } from "./loft/planilha";
import { lerVrsync } from "./loft/vrsync";

export type Argumentos = { feed: string; ativos: string; pendentes: string; responsavel: string; simular: boolean };

export function lerArgumentos(argv: string[]): Argumentos {
  const { values } = parseArgs({
    args: argv,
    options: {
      feed: { type: "string" },
      ativos: { type: "string" },
      pendentes: { type: "string" },
      responsavel: { type: "string" },
      simular: { type: "boolean", default: false },
    },
  });
  for (const nome of ["feed", "ativos", "pendentes", "responsavel"] as const) {
    if (!values[nome]) throw new Error(`Informe --${nome}.`);
  }
  return { feed: values.feed!, ativos: values.ativos!, pendentes: values.pendentes!, responsavel: values.responsavel!, simular: values.simular ?? false };
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

async function lerFeed(origem: string): Promise<{ xml: string; nome: string }> {
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

function resumoSimulacao(lista: ImovelLoft[]): string {
  const c = contar(lista);
  return [
    `Simulação (nada foi gravado): ${c.total} imóveis.`,
    `  publicados: ${c.publicados}`,
    `  rascunhos: ${c.rascunhos}`,
    `  tipos sem mapa: ${c.semTipo.length}${c.semTipo.length ? ` (${c.semTipo.map((i) => i.referencia).join(", ")})` : ""}`,
    `  avisos: ${c.avisos} em ${lista.filter((i) => i.avisos.length).length} imóveis`,
    `  fotos a baixar: ${lista.reduce((n, i) => n + i.fotos.length, 0)}`,
  ].join("\n");
}

function resumoRelatorio(r: Relatorio): string {
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
    console.error(e instanceof Error ? e.message : e);
    console.error("Uso: npm run loft:importar -- --feed <url|arquivo> --ativos <csv> --pendentes <csv> --responsavel <email> [--simular]");
    process.exit(1);
  }

  const feed = await lerFeed(args.feed);
  console.log(`feed: ${feed.nome}`);
  const lista = juntar(
    lerVrsync(feed.xml),
    lerPlanilha(await readFile(args.ativos, "utf8")),
    lerPlanilha(await readFile(args.pendentes, "utf8")),
  );

  if (args.simular) {
    console.log(resumoSimulacao(lista));
    return;
  }

  const { db, fechar } = criarConexao(configBanco().urlDireta, { max: 1 });
  try {
    const email = args.responsavel.trim().toLowerCase();
    const [resp] = await db.select({ id: usuarios.id, situacao: usuarios.situacao }).from(usuarios).where(eq(usuarios.email, email)).limit(1);
    if (!resp) throw new Error(`Responsável não encontrado: ${email}. Crie o usuário no painel antes.`);
    if (resp.situacao === "desativado") throw new Error(`O responsável ${email} está desativado: use um usuário ativo ou pendente.`);

    const relatorio = await importarLoft(db, lista, { responsavelId: resp.id, armazenamento: armazenamentoS3(), baixar, dimensoes });
    console.log(resumoRelatorio(relatorio));
    const arquivo = `relatorio-loft-${dataHora(new Date())}.json`;
    await writeFile(arquivo, JSON.stringify(relatorio, null, 2));
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
