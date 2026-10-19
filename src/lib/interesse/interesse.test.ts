import { describe, expect, test } from "vitest";
import { mascararTelefone, telefoneE164, validarInteresse } from "./validacao";

describe("mascararTelefone", () => {
  test("fixo e celular", () => {
    expect(mascararTelefone("3133334444")).toBe("(31) 3333-4444");
    expect(mascararTelefone("31998765432")).toBe("(31) 99876-5432");
  });

  test("parcial e com lixo", () => {
    expect(mascararTelefone("3")).toBe("(3");
    expect(mascararTelefone("31a9")).toBe("(31) 9");
    expect(mascararTelefone("319987")).toBe("(31) 9987");
    expect(mascararTelefone("31998765432999")).toBe("(31) 99876-5432");
    expect(mascararTelefone("")).toBe("");
  });

  test("E.164", () => {
    expect(telefoneE164("(31) 99876-5432")).toBe("+5531998765432");
  });
});

describe("validarInteresse", () => {
  const ok = { nome: "Mariana Duarte", telefone: "(31) 99876-5432", email: "mariana@email.com", observacoes: "" };

  test("válido", () => {
    expect(validarInteresse(ok)).toEqual({});
  });

  test("mensagens do handoff", () => {
    expect(validarInteresse({ nome: " a ", telefone: "", email: "", observacoes: "" })).toEqual({
      nome: "Informe seu nome.",
      telefone: "Informe seu telefone.",
      email: "Informe seu e-mail.",
    });
    expect(validarInteresse({ ...ok, telefone: "(31) 9987", email: "mariana.duarte@" })).toEqual({
      telefone: "Telefone incompleto. Use DDD + número, ex.: (31) 99999-9999.",
      email: "E-mail inválido. Use o formato nome@email.com.",
    });
  });
});
