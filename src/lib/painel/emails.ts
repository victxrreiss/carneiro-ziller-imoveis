// E-mails transacionais do painel (telas 9 e 10 do design). O envio real ainda
// não existe: `enviar` guarda a mensagem na caixa de saída da base e escreve o
// link no console do servidor. Trocar pelo provedor muda só `enviar`.
import { banco } from "@/lib/dados/banco";
import { unidades } from "@/lib/site";

const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS = "'Montserrat', Arial, Helvetica, sans-serif";

export const VALIDADE_CONVITE_H = 72;
export const VALIDADE_REDEFINICAO_H = 1;

export function urlBase(): string {
  return (process.env.SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");
}

export function linkDefinirSenha(token: string): string {
  return `${urlBase()}/painel/definir-senha?token=${encodeURIComponent(token)}`;
}

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

function dataHora(ms: number): string {
  const d = new Date(ms);
  const f = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("pt-BR", { timeZone: "America/Sao_Paulo", ...o }).format(d);
  return `${f({ day: "2-digit", month: "2-digit", year: "numeric" })} às ${f({ hour: "2-digit", minute: "2-digit" }).replace(":", "h")}`;
}

function layout(preCabecalho: string, titulo: string, corpo: string, rodape: string): string {
  const logo = `${urlBase()}/logo/simbolo-carneiro-azul.svg`;
  return `<!doctype html>
<html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>${titulo}</title>
<style>@media (max-width:480px){.em-pad{padding-left:22px!important;padding-right:22px!important}h1{font-size:26px!important}}</style></head>
<body style="margin:0;background:#E7E4DC">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:#E7E4DC">${preCabecalho}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#E7E4DC;font-family:${SANS};color:#414042"><tr><td style="padding:40px 12px 48px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;margin:0 auto;border-collapse:collapse">
<tr><td class="em-pad" style="background:#FBFAF7;border-top:3px solid #78323D;padding:28px 40px 24px;border-bottom:1px solid #E7E4DC">
<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse"><tr>
<td style="padding-right:14px;vertical-align:middle"><img src="${logo}" width="40" height="40" alt="" style="display:block;width:40px;height:40px;border:0"></td>
<td style="vertical-align:middle"><div style="font-family:${SERIF};font-size:22px;line-height:1;color:#414042;white-space:nowrap">CARNEIRO <span style="color:#78323D">&amp;</span> ZILLER</div>
<div style="height:1px;background:#0F1D24;margin:6px 0 5px"></div>
<div style="font-size:8px;letter-spacing:0.9em;padding-left:0.9em;color:#6D6E71;text-align:center">IMÓVEIS</div></td>
</tr></table></td></tr>
<tr><td class="em-pad" style="background:#FFFFFF;padding:40px 40px 36px">
<div style="font-size:11px;font-weight:600;letter-spacing:0.28em;color:#78323D;margin-bottom:14px">PAINEL INTERNO</div>
<h1 style="margin:0 0 20px;font-family:${SERIF};font-weight:400;font-size:30px;line-height:1.15;color:#0F1D24">${titulo}</h1>
${corpo}
</td></tr>
<tr><td class="em-pad" style="background:#0A1419;border-top:4px solid #78323D;padding:28px 40px;font-size:12px;line-height:1.7;color:#C9C9C9">
<div style="font-family:${SERIF};font-size:17px;color:#FFFFFF;margin-bottom:8px">Carneiro &amp; Ziller Imóveis</div>
<div>${unidades.carneiro.nome} · ${unidades.carneiro.creci} · ${unidades.carneiro.telefone}<br>${unidades.ziller.nome} · ${unidades.ziller.creci} · ${unidades.ziller.telefone}</div>
<div style="margin-top:14px;color:#A8A8AA">${rodape}</div>
</td></tr></table></td></tr></table></body></html>`;
}

const p = (html: string) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.7;color:#555456">${html}</p>`;

const botao = (rotulo: string, href: string) => `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:8px 0 24px">
<tr><td style="background:#0F1D24"><a href="${esc(href)}" style="display:inline-block;padding:17px 32px;font-family:${SANS};font-size:13px;font-weight:600;letter-spacing:0.2em;color:#FFFFFF;text-decoration:none">${rotulo}</a></td></tr></table>`;

const caixa = (html: string) => `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;margin:0 0 24px">
<tr><td style="background:#F6F4F0;border:1px solid #E7E4DC;padding:14px 16px;font-size:13px;line-height:1.7;color:#414042">${html}</td></tr></table>`;

const alternativo = (href: string) => `<div style="border-top:1px solid #E7E4DC;padding-top:20px;margin-top:8px">
<p style="margin:0 0 6px;font-size:12px;line-height:1.6;color:#6D6E71">Se o botão não funcionar, copie e cole este endereço no navegador:</p>
<p style="margin:0;font-size:12px;line-height:1.6;word-break:break-all"><a href="${esc(href)}" style="color:#0F1D24">${esc(href)}</a></p></div>`;

export type Mensagem = { para: string; assunto: string; html: string; texto: string; link: string };

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export function emailConvite(o: { nome: string; email: string; convidadoPor: string; token: string; agora?: number }): Mensagem {
  const link = linkDefinirSenha(o.token);
  const expira = dataHora((o.agora ?? Date.now()) + VALIDADE_CONVITE_H * 3600_000);
  const titulo = "Você foi convidado para o painel da Carneiro &amp; Ziller";
  const html = layout(
    `Crie sua senha para acessar o painel. O link vale por ${VALIDADE_CONVITE_H} horas.`,
    titulo,
    p(`Olá, ${esc(primeiroNome(o.nome))}.`) +
      p(`${esc(o.convidadoPor)} criou o seu acesso como <strong style="color:#0F1D24;font-weight:600">Corretor</strong> no painel em que a equipe cadastra os imóveis do site. Para entrar pela primeira vez, crie a sua senha:`) +
      botao("DEFINIR MINHA SENHA", link) +
      caixa(`O link vale por <strong style="color:#0F1D24">${VALIDADE_CONVITE_H} horas</strong>, até ${expira}, e só pode ser usado uma vez. Depois disso, peça ao administrador para reenviar o convite.<br>Seu login será <strong style="color:#0F1D24">${esc(o.email)}</strong>.`) +
      alternativo(link),
    "Você recebeu este e-mail porque o administrador cadastrou este endereço no painel da Carneiro &amp; Ziller. Se não esperava o convite, ignore a mensagem.",
  );
  const texto = `Olá, ${primeiroNome(o.nome)}.\n\n${o.convidadoPor} criou o seu acesso como Corretor no painel da Carneiro & Ziller. Para entrar pela primeira vez, crie a sua senha:\n${link}\n\nO link vale por ${VALIDADE_CONVITE_H} horas, até ${expira}, e só pode ser usado uma vez. Seu login será ${o.email}.`;
  return { para: o.email, assunto: "Seu acesso ao painel da Carneiro & Ziller", html, texto, link };
}

export function emailRedefinicao(o: { nome: string; email: string; token: string; agora?: number }): Mensagem {
  const link = linkDefinirSenha(o.token);
  const expira = dataHora((o.agora ?? Date.now()) + VALIDADE_REDEFINICAO_H * 3600_000);
  const html = layout(
    "Use o link para criar uma nova senha. Ele vale por 1 hora.",
    "Redefinir sua senha",
    p(`Olá, ${esc(primeiroNome(o.nome))}.`) +
      p("Recebemos um pedido para redefinir a senha do seu acesso ao painel da Carneiro &amp; Ziller. Para criar uma nova senha, use o botão abaixo:") +
      botao("DEFINIR NOVA SENHA", link) +
      p(`O link vale por <strong style="color:#0F1D24;font-weight:600">1 hora</strong>, até ${expira}, e só pode ser usado uma vez.`) +
      caixa(`<strong style="color:#0F1D24">Se não foi você, ignore este e-mail.</strong> Sua senha atual continua valendo e ninguém consegue entrar sem ela.`) +
      alternativo(link),
    "Mensagem automática enviada a pedido da tela “Esqueci minha senha” do painel. Não responda este e-mail.",
  );
  const texto = `Olá, ${primeiroNome(o.nome)}.\n\nPara criar uma nova senha do painel da Carneiro & Ziller, acesse:\n${link}\n\nO link vale por 1 hora, até ${expira}, e só pode ser usado uma vez.\nSe não foi você, ignore este e-mail. Sua senha atual continua valendo.`;
  return { para: o.email, assunto: "Redefinição de senha — Carneiro & Ziller", html, texto, link };
}

/** Envio simulado. */
export function enviar(m: Mensagem): void {
  banco().caixaSaida.push({ ...m, em: new Date().toISOString() });
  console.info(`[e-mail simulado] Para: ${m.para} · ${m.assunto}\n  ${m.link}`);
}
