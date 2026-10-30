import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, test } from "vitest";
import { lerPlanilha } from "./planilha";

const ler = (n: string) => readFileSync(join(process.cwd(), "scripts/loft/fixtures", n), "utf8");

describe("lerPlanilha", () => {
  const linhas = lerPlanilha(ler("ativos.csv"));

  test("ignora a linha em branco do fim", () => {
    expect(linhas).toHaveLength(6);
  });

  test("campo entre aspas com ponto e vírgula volta inteiro", () => {
    expect(linhas[0].empreendimento).toBe("Edifício Exemplo; Torre A");
  });

  test("o BOM não entra no nome da primeira coluna", () => {
    expect(linhas[0].referencia).toBe("901");
  });

  test("valores numéricos, com decimais com ponto, e zeros viram null", () => {
    expect(linhas[0].valorVenda).toBe(990_000);
    expect(linhas[0].valorAluguel).toBeNull();
    expect(linhas[0].quartos).toBe(2);
    expect(linhas[1].quartos).toBeNull();
    expect(linhas[2].valorAluguel).toBe(15_000);
  });

  test("espaços sobrando são removidos e o texto fora do padrão é mantido", () => {
    expect(linhas[0].endereco).toBe("Rua Exemplo");
    expect(linhas[5].endereco).toBe("Avenida dos ExemplÃ£o");
    expect(linhas[5].categoria).toBe("Apartamento Duplex");
    expect(linhas[1].complemento).toBe("");
  });

  test("pendentes", () => {
    const p = lerPlanilha(ler("pendentes.csv"));
    expect(p.map((l) => [l.referencia, l.categoria, l.bairro])).toEqual([
      ["907", "Área", "Bairro Exemplo"],
      ["908", "Loft", "Bairro Exemplo"],
    ]);
  });
});

test("aspas no meio do campo são literais", () => {
  const csv = 'Referencia;Categoria;Endereco;Endereco Numero;Endereco Complemento;Dormitorio;Valor venda;Valor Aluguel;Bairro Comercial;Empreendimento\n1;Casa;Rua 5" X;1;;0;0;0;B;Ed "Z"; W\n';
  const [l] = lerPlanilha(csv);
  expect(l.endereco).toBe('Rua 5" X');
  expect(l.empreendimento).toBe('Ed "Z"; W'.split(";")[0]);
});
