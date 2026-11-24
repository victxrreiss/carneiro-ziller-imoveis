import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, test, vi } from "vitest";
import type { Imovel, ImovelCard } from "@/lib/imoveis";
import type { ContextoVolta } from "@/lib/imoveis/filtros";
import { ImovelAusente, ImovelTela } from "./ImovelTela";

vi.mock("next/navigation", () => ({ useRouter: () => ({ back: vi.fn(), push: vi.fn() }) }));

const URL_IMOVEL = "https://carneiroziller.com.br/imovel/cz1009";
const volta: ContextoVolta = { href: "/imoveis", rotulo: "VOLTAR AOS RESULTADOS", resumo: undefined };

const card = (n: number): ImovelCard => ({
  id: `cz20${n}`,
  codigo: `CZ20${n}`,
  finalidade: "venda",
  lancamento: false,
  tipo: "Cobertura",
  titulo: `Cobertura semelhante ${n}`,
  bairro: "Lourdes",
  cidade: "Belo Horizonte",
  valor: 5_000_000 + n,
  area: 400,
  quartos: 4,
  vagas: 4,
  suites: 2,
  valorLocacao: null,
  foto: { src: "/images/sem-foto.svg", alt: "", largura: 1600, altura: 1200 },
});

const imovel: Imovel = {
  id: "cz1009",
  codigo: "CZ1009",
  finalidade: "venda",
  lancamento: false,
  tipo: "Cobertura",
  titulo: "Cobertura no Belvedere",
  bairro: "Belvedere",
  cidade: "Belo Horizonte",
  uf: "MG",
  valor: 9_800_000,
  area: 520,
  quartos: 4,
  vagas: 6,
  suites: 4,
  valorLocacao: null,
  banheiros: 5,
  areaTotal: null,
  condominio: 4900,
  iptu: 18000,
  andar: 18,
  anoConstrucao: 2019,
  empreendimento: "Edifício Aurora",
  caracteristicas: [
    { chave: "varanda", rotulo: "Varanda", grupo: "imovel" },
    { chave: "piscina-coletiva", rotulo: "Piscina", grupo: "condominio" },
  ],
  foto: { src: "/a.jpg", alt: "", largura: 1600, altura: 1067 },
  descricao: ["Cobertura com vista aberta."],
  fotos: [{ src: "/a.jpg", alt: "Sala", largura: 1600, altura: 1067 }],
};

const montar = (i: Imovel, semelhantes = [1, 2].map(card)) =>
  render(<ImovelTela imovel={i} volta={volta} url={URL_IMOVEL} semelhantes={semelhantes} />);

describe("ImovelTela", () => {
  test("nome do condomínio aparece logo abaixo do título quando existe", () => {
    const { unmount } = montar(imovel);
    const titulo = screen.getByRole("heading", { level: 1, name: "Cobertura no Belvedere" });
    const condominio = titulo.nextElementSibling;
    expect(condominio).toHaveClass("im-condo");
    expect(condominio).toHaveTextContent("Edifício Aurora");
    unmount();

    montar({ ...imovel, empreendimento: null });
    expect(document.querySelector(".im-condo")).toBeNull();
  });

  test("ficha: eyebrow com tipo, bairro e cidade, dados principais e valores", () => {
    montar(imovel);
    expect(screen.getByText("Cobertura · Belvedere, Belo Horizonte")).toBeInTheDocument();
    const dados = screen.getByRole("list", { name: "Dados principais" });
    expect(within(dados).getAllByRole("listitem").map((li) => li.textContent)).toEqual([
      "520m² privativos",
      "4quartos",
      "4suítes",
      "6vagas",
    ]);
    const resumo = screen.getByRole("complementary", { name: "Valor e contato" });
    expect(resumo).toHaveTextContent("R$ 9.800.000");
    expect(resumo).toHaveTextContent("Condomínio R$ 4.900/mês · IPTU R$ 18.000/ano");
    expect(within(resumo).getByRole("link", { name: /WHATSAPP/ })).toHaveAttribute("href", expect.stringContaining("CZ1009"));
    expect(within(resumo).getByRole("button", { name: "AGENDAR VISITA" })).toBeInTheDocument();
  });

  test("características separadas entre o imóvel e o condomínio", () => {
    montar(imovel);
    expect(screen.getByRole("list", { name: "No imóvel" })).toHaveTextContent("Varanda");
    expect(screen.getByRole("list", { name: "No condomínio" })).toHaveTextContent("Piscina");
    // Sem item de um grupo, o grupo não aparece.
    const { container } = montar({ ...imovel, caracteristicas: [{ chave: "varanda", rotulo: "Varanda", grupo: "imovel" }] });
    expect(within(container).queryByRole("list", { name: "No condomínio" })).toBeNull();
  });

  test("o andar não aparece na ficha, mesmo preenchido", () => {
    montar(imovel);
    expect(imovel.andar).toBe(18);
    expect(screen.queryByText("Andar")).not.toBeInTheDocument();
    expect(screen.queryByText("18º")).not.toBeInTheDocument();
  });

  test("semelhantes aparecem no fim e somem sem itens", () => {
    const { unmount } = montar(imovel);
    expect(screen.getByRole("region", { name: "Imóveis semelhantes" })).toBeInTheDocument();
    unmount();
    montar(imovel, []);
    expect(screen.queryByRole("region", { name: "Imóveis semelhantes" })).toBeNull();
  });

  test("formulário curto leva nome e telefone para o formulário de interesse", async () => {
    montar(imovel);
    const curto = screen.getByRole("form", { name: "Ou deixe seu contato" });
    await userEvent.type(within(curto).getByLabelText("Nome"), "Mariana Duarte");
    await userEvent.type(within(curto).getByLabelText("Telefone"), "31998765432");
    await userEvent.click(within(curto).getByRole("button", { name: "TENHO INTERESSE" }));
    const painel = screen.getByRole("dialog", { name: "Agendar visita" });
    expect(within(painel).getByLabelText(/NOME/)).toHaveValue("Mariana Duarte");
    expect(within(painel).getByLabelText(/TELEFONE/)).toHaveValue("(31) 99876-5432");
    expect(within(painel).getByLabelText(/E-MAIL/)).toHaveFocus();
  });
});

describe("ImovelAusente", () => {
  test("indisponível mantém o aviso e mostra semelhantes", () => {
    render(<ImovelAusente tipo="indisponivel" codigo="CZ1021" volta={volta} veioDoGrid={false} semelhantes={[1, 2, 3].map(card)} />);
    expect(screen.getByRole("heading", { level: 1, name: "Este imóvel não está mais disponível" })).toBeInTheDocument();
    expect(screen.getByText(/O imóvel CÓD. CZ1021 foi vendido, alugado ou retirado do portfólio\./)).toBeInTheDocument();
    const secao = screen.getByRole("region", { name: "Imóveis semelhantes" });
    expect(within(secao).getAllByRole("article")).toHaveLength(3);
  });
});
