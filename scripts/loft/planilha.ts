// Leitura das exportações CSV do CRM da Loft (`;` como separador, aspas, UTF-8 com BOM, decimais com ponto).

export type LinhaPlanilha = {
  referencia: string;
  categoria: string;
  endereco: string;
  numero: string;
  complemento: string;
  quartos: number | null;
  valorVenda: number | null;
  valorAluguel: number | null;
  bairro: string;
  empreendimento: string;
};

/** Divide o CSV em linhas de campos, respeitando aspas (com `;`, quebras de linha e `""` dentro delas). */
function linhasCsv(csv: string): string[][] {
  const linhas: string[][] = [];
  let campo = "";
  let linha: string[] = [];
  let entreAspas = false;
  for (let i = 0; i < csv.length; i++) {
    const c = csv[i];
    if (entreAspas) {
      if (c === '"') {
        if (csv[i + 1] === '"') { campo += '"'; i++; } else entreAspas = false;
      } else campo += c;
    } else if (c === '"' && campo === "") entreAspas = true;
    else if (c === ";") { linha.push(campo); campo = ""; }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && csv[i + 1] === "\n") i++;
      linha.push(campo); campo = "";
      linhas.push(linha); linha = [];
    } else campo += c;
  }
  if (campo !== "" || linha.length) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => l.some((c) => c.trim() !== ""));
}

/** Zero significa "não informado". */
function numero(v: string | undefined): number | null {
  const n = Number((v ?? "").trim());
  return Number.isFinite(n) && n > 0 ? n : null;
}

export function lerPlanilha(csv: string): LinhaPlanilha[] {
  const [cab, ...corpo] = linhasCsv(csv.replace(/^﻿/, ""));
  if (!cab) return [];
  const col = (nome: string) => {
    const i = cab.map((c) => c.trim()).indexOf(nome);
    if (i < 0) throw new Error(`Planilha sem a coluna "${nome}".`);
    return i;
  };
  const idx = {
    referencia: col("Referencia"), categoria: col("Categoria"), endereco: col("Endereco"), numero: col("Endereco Numero"),
    complemento: col("Endereco Complemento"), quartos: col("Dormitorio"), venda: col("Valor venda"), aluguel: col("Valor Aluguel"),
    bairro: col("Bairro Comercial"), empreendimento: col("Empreendimento"),
  };
  const t = (l: string[], i: number) => (l[i] ?? "").trim();
  return corpo.map((l) => {
    const q = numero(l[idx.quartos]);
    return {
      referencia: t(l, idx.referencia),
      categoria: t(l, idx.categoria),
      endereco: t(l, idx.endereco),
      numero: t(l, idx.numero),
      complemento: t(l, idx.complemento),
      quartos: q == null ? null : Math.round(q),
      valorVenda: numero(l[idx.venda]),
      valorAluguel: numero(l[idx.aluguel]),
      bairro: t(l, idx.bairro),
      empreendimento: t(l, idx.empreendimento),
    };
  });
}
