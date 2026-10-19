// Regras do formulário de interesse (README do handoff, "Formulário — regras").
// Validação no cliente é conforto; o backend que receber o lead valida de novo.

export type CamposInteresse = {
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
};

export type ErrosInteresse = Partial<Record<"nome" | "telefone" | "email", string>>;

export const LIMITES = { nome: 120, telefone: 16, email: 120, observacoes: 1000 } as const;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const digitos = (v: string) => v.replace(/\D/g, "");

/** (DD) DDDD-DDDD ou (DD) DDDDD-DDDD, aplicada enquanto a pessoa digita. */
export function mascararTelefone(valor: string): string {
  const d = digitos(valor).slice(0, 11);
  if (!d) return "";
  if (d.length < 3) return `(${d}`;
  const ddd = `(${d.slice(0, 2)}) `;
  const resto = d.slice(2);
  if (d.length <= 10) return ddd + (resto.length > 4 ? `${resto.slice(0, 4)}-${resto.slice(4)}` : resto);
  return `${ddd}${resto.slice(0, 5)}-${resto.slice(5)}`;
}

export function telefoneE164(valor: string): string {
  return `+55${digitos(valor)}`;
}

export function validarInteresse(v: CamposInteresse): ErrosInteresse {
  const erros: ErrosInteresse = {};
  if (v.nome.trim().length < 2) erros.nome = "Informe seu nome.";
  const tel = digitos(v.telefone);
  if (!tel) erros.telefone = "Informe seu telefone.";
  else if (tel.length < 10) erros.telefone = "Telefone incompleto. Use DDD + número, ex.: (31) 99999-9999.";
  const email = v.email.trim();
  if (!email) erros.email = "Informe seu e-mail.";
  else if (!EMAIL.test(email)) erros.email = "E-mail inválido. Use o formato nome@email.com.";
  return erros;
}
