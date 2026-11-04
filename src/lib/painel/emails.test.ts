import { describe, expect, it } from "vitest";
import { emailInteresse } from "./emails";

describe("emailInteresse", () => {
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
