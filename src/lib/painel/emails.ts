// E-mails transacionais do painel (telas 9 e 10 do design). O envio é por SMTP
// (lib/email); aqui ficam só os modelos das mensagens.
import { urlDoSite } from "@/lib/config";
import { remetente, type Mensagem as MensagemEnvio } from "@/lib/email";
import { unidades } from "@/lib/site";

const SERIF = "'DM Serif Display', Georgia, 'Times New Roman', serif";
const SANS = "'Montserrat', Arial, Helvetica, sans-serif";

export const VALIDADE_CONVITE_H = 72;
export const VALIDADE_REDEFINICAO_H = 1;

export const urlBase = urlDoSite;

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

/** O `link` serve aos testes; não é enviado nem registrado em log. */
export type Mensagem = MensagemEnvio & { link: string };

const primeiroNome = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;

export function emailConvite(o: {
  nome: string;
  email: string;
  convidadoPor: string;
  token: string;
  agora?: number;
  papel?: "Corretor" | "Administrador";
}): Mensagem {
  const papel = o.papel ?? "Corretor";
  const quemPodeReenviar = papel === "Administrador" ? "a equipe técnica do site" : "o administrador";
  const link = linkDefinirSenha(o.token);
  const expira = dataHora((o.agora ?? Date.now()) + VALIDADE_CONVITE_H * 3600_000);
  const titulo = "Você foi convidado para o painel da Carneiro &amp; Ziller";
  const html = layout(
    `Crie sua senha para acessar o painel. O link vale por ${VALIDADE_CONVITE_H} horas.`,
    titulo,
    p(`Olá, ${esc(primeiroNome(o.nome))}.`) +
      p(`${esc(o.convidadoPor)} criou o seu acesso como <strong style="color:#0F1D24;font-weight:600">${papel}</strong> no painel em que a equipe cadastra os imóveis do site. Para entrar pela primeira vez, crie a sua senha:`) +
      botao("DEFINIR MINHA SENHA", link) +
      caixa(`O link vale por <strong style="color:#0F1D24">${VALIDADE_CONVITE_H} horas</strong>, até ${expira}, e só pode ser usado uma vez. Depois disso, peça a ${quemPodeReenviar} para reenviar o convite.<br>Seu login será <strong style="color:#0F1D24">${esc(o.email)}</strong>.`) +
      alternativo(link),
    "Você recebeu este e-mail porque o administrador cadastrou este endereço no painel da Carneiro &amp; Ziller. Se não esperava o convite, ignore a mensagem.",
  );
  const texto = `Olá, ${primeiroNome(o.nome)}.\n\n${o.convidadoPor} criou o seu acesso como ${papel} no painel da Carneiro & Ziller. Para entrar pela primeira vez, crie a sua senha:\n${link}\n\nO link vale por ${VALIDADE_CONVITE_H} horas, até ${expira}, e só pode ser usado uma vez. Seu login será ${o.email}.`;
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

/** Aviso interno de novo interesse (lead) vindo do formulário do imóvel. */
export function emailInteresse(o: {
  para: string;
  imovel: { id: string; codigo: string; titulo: string } | null;
  codigo: string;
  nome: string;
  telefone: string;
  email: string;
  observacoes: string;
  agora?: number;
}): Mensagem {
  const quando = dataHora(o.agora ?? Date.now());
  const linkImovel = o.imovel ? `${urlBase()}/imovel/${o.imovel.id}` : "";
  const linkPainel = o.imovel ? `${urlBase()}/painel/imoveis/${o.imovel.id}` : `${urlBase()}/painel`;
  const ref = o.imovel ? `${o.imovel.codigo.toUpperCase()} · ${o.imovel.titulo}` : o.codigo.toUpperCase();
  const zap = o.telefone.replace(/\D/g, "");
  const titulo = "Novo interesse em um imóvel";
  const html = layout(
    `${o.nome} pediu contato sobre ${ref}.`,
    titulo,
    p(`Um visitante do site pediu contato sobre <strong style="color:#0F1D24;font-weight:600">${esc(ref)}</strong> em ${quando}.`) +
      caixa(
        `<strong style="color:#0F1D24">${esc(o.nome)}</strong><br>` +
          `Telefone: <a href="https://wa.me/${zap}" style="color:#0F1D24">${esc(o.telefone)}</a><br>` +
          `E-mail: <a href="mailto:${esc(o.email)}" style="color:#0F1D24">${esc(o.email)}</a>` +
          (o.observacoes ? `<br><br>${esc(o.observacoes).replace(/\n/g, "<br>")}` : ""),
      ) +
      (linkImovel ? botao("VER O IMÓVEL", linkImovel) : "") +
      alternativo(linkPainel),
    "Você recebeu este aviso por ser o corretor responsável pelo imóvel, o administrador do painel ou um endereço cadastrado para receber os interesses do site.",
  );
  const texto = `${titulo}\n\n${o.nome} pediu contato sobre ${ref} em ${quando}.\n\nTelefone: ${o.telefone}\nE-mail: ${o.email}${o.observacoes ? `\n\n${o.observacoes}` : ""}\n\n${linkImovel || linkPainel}`;
  return { para: o.para, assunto: `Interesse em ${o.imovel ? o.imovel.codigo.toUpperCase() : o.codigo.toUpperCase()}: ${o.nome}`, html, texto, link: linkImovel || linkPainel };
}

/** Envia pelo SMTP configurado. Lança se o envio falhar: quem chama decide o que responder. */
export async function enviar(m: Mensagem): Promise<void> {
  await remetente().enviar({ para: m.para, assunto: m.assunto, html: m.html, texto: m.texto });
}
