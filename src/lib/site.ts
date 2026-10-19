// Dados institucionais exibidos no site.
// Redes sociais: links a confirmar com o cliente (README do handoff).
export const unidades = {
  carneiro: {
    nome: "Unidade Carneiro",
    creci: "CRECI 7904",
    telefone: "(31) 99539-5988",
    email: "contato@carneiroinvestimoveis.com.br",
    endereco: ["Alameda Oscar Niemeyer, 288", "Vila da Serra, Nova Lima - MG"],
  },
  ziller: {
    nome: "Unidade Ziller",
    creci: "CRECI MG 36.697",
    telefone: "(31) 99981-0164",
    email: "andre@zillerimoveis.com.br",
  },
} as const;

export const crecis = `${unidades.carneiro.creci} · ${unidades.ziller.creci}`;

export const social = {
  instagram: "#",
  linkedin: "#",
} as const;
