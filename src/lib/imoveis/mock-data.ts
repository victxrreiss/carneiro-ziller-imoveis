// Regiões da Home (docs/handoff/home/dados-exemplo.json). Os imóveis da Home
// vêm da base (lib/dados): Oportunidade de hoje escolhida pelo ADMIN e as
// seções Lançamentos e Imóveis em destaque montadas automaticamente.
import type { Regiao } from "./types";

export const regioes: Regiao[] = [
  { nome: "Belvedere", cidade: "BELO HORIZONTE", img: "/images/regiao-belvedere.jpg" },
  { nome: "Vila da Serra", cidade: "NOVA LIMA", img: "/images/regiao-vila-da-serra.jpg" },
  { nome: "Lagoa dos Ingleses", cidade: "NOVA LIMA", img: "/images/regiao-lagoa-dos-ingleses.jpg" },
  { nome: "Savassi e Lourdes", cidade: "BELO HORIZONTE", img: "/images/regiao-savassi-lourdes.jpg" },
];
