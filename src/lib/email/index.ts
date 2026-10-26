// Envio de e-mail por SMTP. Interface mínima: o fornecedor (Resend, Google
// Workspace, SES, Postmark, Mailpit local...) é só configuração (SMTP_*).
import nodemailer, { type Transporter } from "nodemailer";
import { configSmtp } from "@/lib/config";

export type Mensagem = { para: string; assunto: string; html: string; texto: string };

export interface Remetente {
  enviar(m: Mensagem): Promise<void>;
}

export function remetenteSmtp(): Remetente {
  let transporte: Transporter | null = null;
  let de = "";
  return {
    async enviar(m) {
      if (!transporte) {
        const c = configSmtp();
        de = c.de;
        transporte = nodemailer.createTransport({
          host: c.host,
          port: c.porta,
          secure: c.seguro,
          auth: c.usuario ? { user: c.usuario, pass: c.senha } : undefined,
        });
      }
      await transporte.sendMail({ from: de, to: m.para, subject: m.assunto, html: m.html, text: m.texto });
    },
  };
}

/** Remetente de testes: guarda as mensagens em memória. */
export function remetenteMemoria(): Remetente & { enviadas: Mensagem[]; falhar: boolean } {
  const r = {
    enviadas: [] as Mensagem[],
    falhar: false,
    async enviar(m: Mensagem) {
      if (r.falhar) throw new Error("falha simulada de envio");
      r.enviadas.push(m);
    },
  };
  return r;
}

let atual: Remetente | null = null;

/** Troca o remetente (usado pelos testes). */
export function definirRemetente(r: Remetente | null): void {
  atual = r;
}

export function remetente(): Remetente {
  atual ??= remetenteSmtp();
  return atual;
}
