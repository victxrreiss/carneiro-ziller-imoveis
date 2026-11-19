import { describe, expect, it } from "vitest";
import { emailConvite, emailInteresse, emailRedefinicao } from "./emails";

describe("emailInteresse", () => {
  it("o Responder vai para o visitante, não para o remetente do site", () => {
    const m = emailInteresse({ para: "corretor@exemplo.com", imovel: null, codigo: "", nome: "Ana", telefone: "(31) 99999-0000", email: "ana@cliente.com", observacoes: "" });
    expect(m.responderPara).toBe("ana@cliente.com");
  });

  it("escapa HTML no pré-cabeçalho (nome e título do imóvel)", () => {
    const m = emailInteresse({
      para: "corretor@exemplo.com",
      imovel: { id: "abc", codigo: "ap-1", titulo: "Cobertura <b>luxo</b>" },
      codigo: "ap-1",
      nome: "<script>alert(1)</script>",
      telefone: "(31) 99999-0000",
      email: "a@b.com",
      observacoes: "",
    });
    const pre = m.html.match(/opacity:0;color:#E7E4DC">(.*?)<\/div>/)![1];
    expect(pre).toContain("&lt;script&gt;");
    expect(pre).toContain("&lt;b&gt;luxo&lt;/b&gt;");
    expect(m.html).not.toContain("<script>");
    expect(m.html).not.toContain("<b>luxo</b>");
  });
});

describe("identidade nos e-mails", () => {
  const mensagens = () => [
    emailConvite({ nome: "Ana Lima", email: "ana@exemplo.com", convidadoPor: "Paula", token: "t" }),
    emailRedefinicao({ nome: "Ana Lima", email: "ana@exemplo.com", token: "t" }),
    emailInteresse({ para: "a@exemplo.com", imovel: null, codigo: "", nome: "João", telefone: "(31) 99999-9999", email: "j@exemplo.com", observacoes: "" }),
  ];

  it("usam as fontes da identidade nova, com alternativas que todo cliente de e-mail tem", () => {
    for (const { html } of mensagens()) {
      expect(html).toContain("'Cormorant Garamond', Georgia, 'Times New Roman', serif");
      expect(html).toContain("'Jost', 'Helvetica Neue', Helvetica, Arial, sans-serif");
      expect(html).not.toMatch(/DM Serif|Montserrat/);
    }
  });

  it("o cabeçalho é o nome da marca em texto, sem imagem (SVG não abre nos clientes de e-mail)", () => {
    for (const { html } of mensagens()) {
      expect(html).not.toContain("<img");
      expect(html).not.toContain("/logo/");
      expect(html).toMatch(/CARNEIRO <span[^>]*>&amp;<\/span> ZILLER/);
      expect(html).toContain("IMÓVEIS");
    }
  });
});
