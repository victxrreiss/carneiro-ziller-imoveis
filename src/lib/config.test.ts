import { describe, expect, test } from "vitest";
import { ConfigAusente, configBanco, configBlob, configS3, configSmtp, emailsDeLeads, provedorFotos, urlDoSite, validarConfigProducao } from "./config";

const completo = {
  DATABASE_URL: "postgres://u:p@host/db",
  S3_ENDPOINT: "https://s3.exemplo.test",
  S3_REGIAO: "auto",
  S3_BUCKET: "fotos",
  S3_ACCESS_KEY_ID: "chave",
  S3_SECRET_ACCESS_KEY: "segredo",
  FOTOS_URL_PUBLICA: "https://fotos.exemplo.test/",
  SMTP_HOST: "smtp.exemplo.test",
  SMTP_PORTA: "587",
  EMAIL_DE: "Carneiro & Ziller <painel@exemplo.test>",
  SITE_URL: "https://site.exemplo.test/",
  NODE_ENV: "production",
};

describe("configuração", () => {
  test("em produção, banco, fotos ou endereço faltando derruba a inicialização dizendo tudo o que falta", () => {
    expect(() => validarConfigProducao({ NODE_ENV: "production" })).toThrow(/DATABASE_URL.*S3_ENDPOINT.*SITE_URL/);
    expect(() => validarConfigProducao({ ...completo, S3_BUCKET: "", DATABASE_URL: "" })).toThrow(/DATABASE_URL.*S3_BUCKET/);
    expect(validarConfigProducao(completo)).toEqual({ alertas: [] });
  });

  test("sem e-mail o site sobe, com alerta", () => {
    const { alertas } = validarConfigProducao({ ...completo, SMTP_HOST: "", SMTP_PORTA: undefined });
    expect(alertas).toHaveLength(1);
    expect(alertas[0]).toMatch(/SMTP_HOST.*SMTP_PORTA/);
  });

  test("cada grupo diz qual variável falta", () => {
    expect(() => configBanco({})).toThrow(ConfigAusente);
    expect(() => configBanco({})).toThrow("DATABASE_URL");
    expect(() => configS3({ S3_ENDPOINT: "x" })).toThrow(/S3_REGIAO/);
  });

  test("normaliza URLs e valores", () => {
    expect(configS3(completo).urlPublica).toBe("https://fotos.exemplo.test");
    expect(configS3({ ...completo, S3_FORCE_PATH_STYLE: "true" }).forcePathStyle).toBe(true);
    expect(urlDoSite(completo)).toBe("https://site.exemplo.test");
    expect(configBanco({ DATABASE_URL: "a" }).urlDireta).toBe("a");
    expect(configBanco({ DATABASE_URL: "a", DATABASE_URL_DIRETA: "b" }).urlDireta).toBe("b");
  });

  test("SMTP: porta numérica e usuário e senha sempre em par", () => {
    expect(configSmtp(completo)).toMatchObject({ porta: 587, usuario: undefined, seguro: false });
    expect(() => configSmtp({ ...completo, SMTP_PORTA: "abc" })).toThrow(/SMTP_PORTA/);
    expect(() => configSmtp({ ...completo, SMTP_USUARIO: "u" })).toThrow(/SMTP_SENHA/);
    expect(configSmtp({ ...completo, SMTP_USUARIO: "u", SMTP_SENHA: "s", SMTP_SEGURO: "true" })).toMatchObject({ usuario: "u", senha: "s", seguro: true });
  });

  test("SITE_URL: obrigatória em produção; em dev cai em localhost", () => {
    expect(() => urlDoSite({ NODE_ENV: "production" })).toThrow("SITE_URL");
    expect(urlDoSite({ NODE_ENV: "development" })).toBe("http://localhost:3000");
  });
});

describe("configuração na Vercel (integrações Neon e Blob)", () => {
  const blob = { BLOB_READ_WRITE_TOKEN: "vercel_blob_rw_AbC123xyz_segredoQualquer" };

  test("com BLOB_READ_WRITE_TOKEN, usa o Vercel Blob e dispensa as variáveis S3", () => {
    expect(provedorFotos(blob)).toBe("blob");
    expect(provedorFotos({})).toBe("s3");
    expect(configBlob(blob).urlPublica).toBe("https://abc123xyz.public.blob.vercel-storage.com");
    expect(configBlob({ ...blob, FOTOS_URL_PUBLICA: "https://fotos.dominio.test/" }).urlPublica).toBe("https://fotos.dominio.test");
    expect(() => configBlob({ BLOB_READ_WRITE_TOKEN: "invalido" })).toThrow(ConfigAusente);
    const semS3 = { DATABASE_URL: completo.DATABASE_URL, SMTP_HOST: "smtp", SMTP_PORTA: "587", EMAIL_DE: "x@y.test", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "site.test", NODE_ENV: "production", ...blob };
    expect(() => validarConfigProducao(semS3)).not.toThrow();
  });

  test("URL direta: DATABASE_URL_DIRETA, senão DATABASE_URL_UNPOOLED (Neon), senão DATABASE_URL", () => {
    expect(configBanco({ DATABASE_URL: "a" }).urlDireta).toBe("a");
    expect(configBanco({ DATABASE_URL: "a", DATABASE_URL_UNPOOLED: "b" }).urlDireta).toBe("b");
    expect(configBanco({ DATABASE_URL: "a", DATABASE_URL_UNPOOLED: "b", DATABASE_URL_DIRETA: "c" }).urlDireta).toBe("c");
  });

  test("endereço do site: SITE_URL, senão o domínio de produção da Vercel, senão o da branch", () => {
    expect(urlDoSite({ VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "carneiroziller.com.br", NODE_ENV: "production" })).toBe("https://carneiroziller.com.br");
    expect(urlDoSite({ VERCEL_ENV: "preview", VERCEL_BRANCH_URL: "cz-git-develop.vercel.app", VERCEL_URL: "cz-abc.vercel.app" })).toBe("https://cz-git-develop.vercel.app");
    expect(urlDoSite({ SITE_URL: "https://outro.test/", VERCEL_ENV: "production", VERCEL_PROJECT_PRODUCTION_URL: "x.test" })).toBe("https://outro.test");
  });

  test("LEADS_EMAIL aceita vários endereços", () => {
    expect(emailsDeLeads({ LEADS_EMAIL: " A@x.test, b@y.test;;" })).toEqual(["a@x.test", "b@y.test"]);
    expect(emailsDeLeads({})).toEqual([]);
  });
});
