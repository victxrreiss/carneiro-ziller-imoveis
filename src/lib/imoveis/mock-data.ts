// Conteúdo de docs/handoff/home/dados-exemplo.json, como renderizado no Home.html.
// Fotos provisórias (sem licença verificada), exceto o render do hero.
import type { Destaque, ImovelCard, Regiao } from "./types";

export const destaque: Destaque = {
  id: "cz1009",
  codigo: "PI0316",
  tipo: "Apartamento",
  titulo: "Apartamento no Belvedere",
  local: "Belvedere, Belo Horizonte - MG",
  descricao:
    "O máximo de luxo, requinte e exclusividade no coração do Belvedere. Aproximadamente 400 m² que combinam conforto, elegância e uma estrutura completa.",
  area: "398 m²",
  quartos: "4",
  vagas: "5",
  valor: "R$ 7.890.000",
  img: "/images/destaque-belvedere.jpg",
  alt: "Sala de estar com vista panorâmica da cidade",
};

export const regioes: Regiao[] = [
  { nome: "Belvedere", cidade: "BELO HORIZONTE", img: "/images/regiao-belvedere.jpg" },
  { nome: "Vila da Serra", cidade: "NOVA LIMA", img: "/images/regiao-vila-da-serra.jpg" },
  { nome: "Lagoa dos Ingleses", cidade: "NOVA LIMA", img: "/images/regiao-lagoa-dos-ingleses.jpg" },
  { nome: "Savassi e Lourdes", cidade: "BELO HORIZONTE", img: "/images/regiao-savassi-lourdes.jpg" },
];

export const lancamentos: ImovelCard[] = [
  {
    id: "cz1001",
    badge: "LANÇAMENTO",
    title: "Edifício One View",
    location: "Luxemburgo, Belo Horizonte",
    price: "R$ 1.050.000",
    area: "62 m²",
    beds: "2 quartos",
    img: "/images/lancamento-one-view.jpg",
    alt: "Edifício One View",
  },
  {
    id: "cz1002",
    badge: "LANÇAMENTO",
    title: "Edifício HUB Savassi",
    location: "Savassi, Belo Horizonte",
    price: "R$ 2.179.700",
    area: "99 m²",
    img: "/images/lancamento-hub-savassi.jpg",
    alt: "Edifício HUB Savassi",
  },
  {
    id: "cz1003",
    badge: "LANÇAMENTO",
    title: "Edifício Momento",
    location: "Santo Agostinho, Belo Horizonte",
    price: "R$ 2.117.100",
    area: "104 m²",
    img: "/images/lancamento-momento.jpg",
    alt: "Edifício Momento",
  },
  {
    id: "cz1004",
    badge: "LANÇAMENTO",
    title: "Primavera Home",
    location: "Vale do Sereno, Nova Lima",
    price: "R$ 1.700.000",
    area: "100 m²",
    beds: "3 quartos",
    img: "/images/lancamento-primavera-home.jpg",
    alt: "Primavera Home",
  },
];

export const venda: ImovelCard[] = [
  {
    id: "cz1005",
    badge: "VENDA",
    title: "Residencial das Minas",
    location: "Alphaville Lagoa dos Ingleses, Nova Lima",
    price: "R$ 4.890.000",
    area: "400 m²",
    beds: "5 quartos",
    img: "/images/venda-residencial-das-minas.jpg",
    alt: "Residencial das Minas",
  },
  {
    id: "cz1006",
    badge: "VENDA",
    title: "Casa no Vale dos Cristais",
    location: "Vale dos Cristais, Nova Lima",
    price: "R$ 15.900.000",
    area: "880 m²",
    beds: "5 quartos",
    img: "/images/venda-vale-dos-cristais.jpg",
    alt: "Casa no Vale dos Cristais",
  },
  {
    id: "cz1007",
    badge: "VENDA",
    title: "Casa moderna na Cidade Jardim",
    location: "Cidade Jardim, Belo Horizonte",
    price: "R$ 11.500.000",
    area: "888 m²",
    img: "/images/venda-cidade-jardim.jpg",
    alt: "Casa moderna na Cidade Jardim",
  },
  {
    id: "cz1008",
    badge: "VENDA",
    title: "Apartamento Vila da Serra",
    location: "Vila da Serra, Nova Lima",
    price: "R$ 3.980.000",
    area: "202 m²",
    img: "/images/venda-vila-da-serra.jpg",
    alt: "Apartamento Vila da Serra",
  },
];

export const locacao: ImovelCard[] = [
  {
    id: "cz1010",
    badge: "LOCAÇÃO",
    title: "Laje corporativa",
    location: "Funcionários, Belo Horizonte",
    price: "R$ 22.500/mês",
    area: "337 m²",
    img: "/images/locacao-laje-corporativa.jpg",
    alt: "Laje corporativa",
  },
  {
    id: "cz1011",
    badge: "LOCAÇÃO",
    title: "Andar corporativo reformado",
    location: "Centro, Belo Horizonte",
    price: "R$ 90.000/mês",
    area: "1.043 m²",
    img: "/images/locacao-andar-corporativo.jpg",
    alt: "Andar corporativo reformado",
  },
  {
    id: "cz1012",
    badge: "LOCAÇÃO",
    title: "Prédio hospitalar",
    location: "Barro Preto, Belo Horizonte",
    price: "R$ 84.000/mês",
    area: "2.600 m²",
    img: "/images/locacao-predio-hospitalar.jpg",
    alt: "Prédio hospitalar",
  },
  {
    id: "cz1013",
    badge: "LOCAÇÃO",
    title: "Casa comercial",
    location: "Serra, Belo Horizonte",
    price: "R$ 7.900/mês",
    area: "181 m²",
    img: "/images/locacao-casa-comercial.jpg",
    alt: "Casa comercial",
  },
];
