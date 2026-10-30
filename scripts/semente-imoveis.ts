// Dados de desenvolvimento: os 35 imóveis do handoff (22 dos 35 anúncios são
// fictícios e todas as fotos são provisórias). Usado por `npm run db:semente` e
// pelos testes. Nunca roda em produção, que começa vazia. Sem usuários nem senhas.
import type { Finalidade, SituacaoImovel } from "../src/lib/dados/tipos";

/** Dimensões reais dos arquivos em public/images/imoveis, para o next/image. */
const DIMENSOES: Record<string, [number, number]> = {
  "0c604633e0251f5a9c1674ef8164da17": [700, 900],
  "278a826b85c7e2fc8ded2598a7675c48": [900, 675],
  "4104b94efdccd9e22d4979a359c86e64": [900, 675],
  "4ab90a3e3c3b364e60d90312bf8bb936": [900, 675],
  "4bf0e91d2f0092aa4d718b2ccfc1dc5f": [1600, 1200],
  "5e5a1046b6796c80c7e2af56ae2db8e0": [1400, 900],
  "72e5aa30c7e98684612ccba594c6a6de": [900, 675],
  "76ac5eb6455098c63737068cb9688e04": [900, 675],
  "83078fec9317d4739d499615a6faacfb": [700, 900],
  "89e3aac96b6c31d0d1247a75994809d4": [700, 900],
  "94fd2fa7e53c66b19c0b256b3614b7b2": [900, 675],
  "9511260c5dbfff8011e2f18b84a6012b": [1600, 1200],
  "9e9687278cf5c0bc894a25af3ad26b27": [700, 900],
  "a1843e848f2e8288905697ba4fc1dc0a": [1920, 1000],
  "af18d23480478b9fb319b1e2e6e2ff8d": [900, 675],
  "afb16e7a4026e6bce76ba16ec7261499": [1600, 1200],
  "bc1e01a8a4e7affe6950b8496b01d5fb": [900, 675],
  "d4db06613b4c066d84abe7cfea7b132b": [1600, 1200],
  "d982ea2d8960f28a2bfe4c865578ef52": [900, 675],
  "da5200edc58efc98d28c5c99d88489e2": [900, 675],
  "dbb2799f8e97699a8042ae5f3d3ac3f6": [1600, 1200],
  "e8c747a1309c2d88aaef6c3c2e82929e": [900, 675],
  "f04f8669c3ecb4d576c765d5f198cb0c": [900, 675],
  "f40a059ac95c00760f5ea57662eb9888": [1600, 1200],
  "fb93739e7184d00c58fed8564f56afa2": [1600, 900],
};

export type SementeFoto = { arquivo: string; alt: string; largura: number; altura: number };

function foto(arquivo: string, alt: string): SementeFoto {
  const [largura, altura] = DIMENSOES[arquivo];
  return { arquivo, alt, largura, altura };
}

// Finalidade: c venda, a locação; l = venda marcada como lançamento.
const FIN: Record<string, [Finalidade, boolean]> = { l: ["venda", true], c: ["venda", false], a: ["locacao", false] };

// [código, finalidade, tipo, título, bairro, cidade, valor, área, quartos, vagas, foto do card]
// Quartos/vagas 0 = não informado.
type Linha = [string, string, string, string, string, string, number, number, number, number, string];

const LINHAS: Linha[] = [
  ["CZ1001", "l", "Apartamento", "Edifício One View", "Luxemburgo", "Belo Horizonte", 1050000, 62, 2, 0, "af18d23480478b9fb319b1e2e6e2ff8d"],
  ["CZ1002", "l", "Apartamento", "Edifício HUB Savassi", "Savassi", "Belo Horizonte", 2179700, 99, 0, 0, "76ac5eb6455098c63737068cb9688e04"],
  ["CZ1003", "l", "Apartamento", "Edifício Momento", "Santo Agostinho", "Belo Horizonte", 2117100, 104, 0, 0, "72e5aa30c7e98684612ccba594c6a6de"],
  ["CZ1004", "l", "Apartamento", "Primavera Home", "Vale do Sereno", "Nova Lima", 1700000, 100, 3, 0, "e8c747a1309c2d88aaef6c3c2e82929e"],
  ["CZ1005", "c", "Casa em condomínio", "Residencial das Minas", "Alphaville Lagoa dos Ingleses", "Nova Lima", 4890000, 400, 5, 0, "4ab90a3e3c3b364e60d90312bf8bb936"],
  ["CZ1006", "c", "Casa em condomínio", "Casa no Vale dos Cristais", "Vale dos Cristais", "Nova Lima", 15900000, 880, 5, 0, "bc1e01a8a4e7affe6950b8496b01d5fb"],
  ["CZ1007", "c", "Casa", "Casa moderna na Cidade Jardim", "Cidade Jardim", "Belo Horizonte", 11500000, 888, 0, 0, "da5200edc58efc98d28c5c99d88489e2"],
  ["CZ1008", "c", "Apartamento", "Apartamento Vila da Serra", "Vila da Serra", "Nova Lima", 3980000, 202, 0, 0, "5e5a1046b6796c80c7e2af56ae2db8e0"],
  ["CZ1009", "c", "Apartamento", "Apartamento no Belvedere", "Belvedere", "Belo Horizonte", 7890000, 398, 4, 5, "0c604633e0251f5a9c1674ef8164da17"],
  ["CZ1010", "a", "Sala / Laje corporativa", "Laje corporativa", "Funcionários", "Belo Horizonte", 22500, 337, 0, 0, "94fd2fa7e53c66b19c0b256b3614b7b2"],
  ["CZ1011", "a", "Sala / Laje corporativa", "Andar corporativo reformado", "Centro", "Belo Horizonte", 90000, 1043, 0, 0, "4104b94efdccd9e22d4979a359c86e64"],
  ["CZ1012", "a", "Prédio comercial", "Prédio hospitalar", "Barro Preto", "Belo Horizonte", 84000, 2600, 0, 0, "278a826b85c7e2fc8ded2598a7675c48"],
  ["CZ1013", "a", "Casa comercial", "Casa comercial", "Serra", "Belo Horizonte", 7900, 181, 0, 0, "f04f8669c3ecb4d576c765d5f198cb0c"],
  ["CZ1014", "l", "Apartamento", "Residencial Alameda Lourdes", "Lourdes", "Belo Horizonte", 3450000, 186, 4, 3, "83078fec9317d4739d499615a6faacfb"],
  ["CZ1015", "l", "Cobertura", "Mirante Vila da Serra", "Vila da Serra", "Nova Lima", 6200000, 320, 4, 4, "fb93739e7184d00c58fed8564f56afa2"],
  ["CZ1016", "l", "Apartamento", "Jardins do Sion", "Sion", "Belo Horizonte", 1890000, 128, 3, 2, "af18d23480478b9fb319b1e2e6e2ff8d"],
  ["CZ1017", "l", "Apartamento", "Vértice Funcionários", "Funcionários", "Belo Horizonte", 1290000, 78, 2, 2, "76ac5eb6455098c63737068cb9688e04"],
  ["CZ1018", "l", "Casa em condomínio", "Villa Lagoa Residence", "Alphaville Lagoa dos Ingleses", "Nova Lima", 3750000, 340, 4, 4, "d982ea2d8960f28a2bfe4c865578ef52"],
  ["CZ1019", "c", "Cobertura", "Cobertura duplex em Lourdes", "Lourdes", "Belo Horizonte", 5650000, 412, 4, 4, "72e5aa30c7e98684612ccba594c6a6de"],
  ["CZ1020", "c", "Apartamento", "Apartamento em Santo Agostinho", "Santo Agostinho", "Belo Horizonte", 2390000, 165, 3, 3, "e8c747a1309c2d88aaef6c3c2e82929e"],
  ["CZ1021", "c", "Casa", "Casa no Mangabeiras", "Mangabeiras", "Belo Horizonte", 8900000, 720, 5, 6, "89e3aac96b6c31d0d1247a75994809d4"],
  ["CZ1022", "c", "Apartamento", "Apartamento no Sion", "Sion", "Belo Horizonte", 1480000, 118, 3, 2, "5e5a1046b6796c80c7e2af56ae2db8e0"],
  ["CZ1023", "c", "Casa em condomínio", "Casa no Vale do Sereno", "Vale do Sereno", "Nova Lima", 6750000, 560, 5, 5, "9e9687278cf5c0bc894a25af3ad26b27"],
  ["CZ1024", "c", "Cobertura", "Cobertura no Belvedere", "Belvedere", "Belo Horizonte", 9800000, 520, 4, 6, "0c604633e0251f5a9c1674ef8164da17"],
  ["CZ1025", "c", "Apartamento", "Apartamento no Anchieta", "Anchieta", "Belo Horizonte", 1150000, 96, 3, 2, "83078fec9317d4739d499615a6faacfb"],
  ["CZ1026", "c", "Terreno", "Terreno no Mirante da Mata", "Quintas do Sol", "Nova Lima", 1000000, 800, 0, 0, "4ab90a3e3c3b364e60d90312bf8bb936"],
  ["CZ1027", "c", "Casa em condomínio", "Casa no Alphaville", "Alphaville Lagoa dos Ingleses", "Nova Lima", 3900000, 350, 4, 4, "bc1e01a8a4e7affe6950b8496b01d5fb"],
  ["CZ1028", "c", "Apartamento", "Apartamento no Gutierrez", "Gutierrez", "Belo Horizonte", 1320000, 112, 3, 2, "fb93739e7184d00c58fed8564f56afa2"],
  ["CZ1029", "c", "Casa", "Casa no São Bento", "São Bento", "Belo Horizonte", 4250000, 480, 4, 4, "da5200edc58efc98d28c5c99d88489e2"],
  ["CZ1030", "a", "Apartamento", "Apartamento mobiliado em Lourdes", "Lourdes", "Belo Horizonte", 12500, 140, 3, 2, "af18d23480478b9fb319b1e2e6e2ff8d"],
  ["CZ1031", "a", "Cobertura", "Cobertura no Vila da Serra", "Vila da Serra", "Nova Lima", 24000, 290, 4, 4, "76ac5eb6455098c63737068cb9688e04"],
  ["CZ1032", "a", "Casa em condomínio", "Casa no Vale dos Cristais", "Vale dos Cristais", "Nova Lima", 38000, 610, 5, 6, "d982ea2d8960f28a2bfe4c865578ef52"],
  ["CZ1033", "a", "Apartamento", "Apartamento no Belvedere", "Belvedere", "Belo Horizonte", 15800, 210, 4, 3, "72e5aa30c7e98684612ccba594c6a6de"],
  ["CZ1034", "a", "Sala / Laje corporativa", "Sala no Vila da Serra", "Vila da Serra", "Nova Lima", 9800, 120, 0, 2, "94fd2fa7e53c66b19c0b256b3614b7b2"],
  ["CZ1035", "a", "Apartamento", "Apartamento na Savassi", "Savassi", "Belo Horizonte", 8900, 105, 2, 2, "e8c747a1309c2d88aaef6c3c2e82929e"],
];

/** Ficha completa: só os imóveis que o handoff da tela do imóvel detalha. */
const FICHAS: Record<string, { descricao: string[]; fotos: string[] }> = {
  cz1009: {
    descricao: [
      "O máximo de luxo, requinte e exclusividade no coração do Belvedere. São aproximadamente 400 m² que combinam conforto, elegância e uma estrutura completa.",
      "São 4 quartos e 5 vagas de garagem em um dos endereços mais desejados da zona sul de Belo Horizonte, perto de comércio, serviços e dos acessos para Nova Lima.",
    ],
    fotos: [
      "5e5a1046b6796c80c7e2af56ae2db8e0",
      "fb93739e7184d00c58fed8564f56afa2",
      "4bf0e91d2f0092aa4d718b2ccfc1dc5f",
      "9511260c5dbfff8011e2f18b84a6012b",
      "f40a059ac95c00760f5ea57662eb9888",
      "d4db06613b4c066d84abe7cfea7b132b",
    ],
  },
  cz1030: {
    descricao: [
      "Apartamento mobiliado de 140 m² em Lourdes, pronto para morar, com 3 quartos e 2 vagas de garagem.",
      "A poucos passos de restaurantes, comércio e serviços de um dos bairros mais tradicionais de Belo Horizonte.",
    ],
    fotos: [
      "d4db06613b4c066d84abe7cfea7b132b",
      "9511260c5dbfff8011e2f18b84a6012b",
      "fb93739e7184d00c58fed8564f56afa2",
      "4bf0e91d2f0092aa4d718b2ccfc1dc5f",
      "5e5a1046b6796c80c7e2af56ae2db8e0",
      "f40a059ac95c00760f5ea57662eb9888",
    ],
  },
  cz1015: {
    descricao: [
      "Cobertura de 320 m² no Vila da Serra, com 4 quartos e 4 vagas de garagem.",
      "Lançamento em Nova Lima, a poucos minutos da zona sul de Belo Horizonte. Fale com um consultor sobre plantas, condições de pagamento e cronograma de obra.",
    ],
    fotos: [
      "fb93739e7184d00c58fed8564f56afa2",
      "a1843e848f2e8288905697ba4fc1dc0a",
      "5e5a1046b6796c80c7e2af56ae2db8e0",
      "afb16e7a4026e6bce76ba16ec7261499",
      "4bf0e91d2f0092aa4d718b2ccfc1dc5f",
      "9511260c5dbfff8011e2f18b84a6012b",
      "d4db06613b4c066d84abe7cfea7b132b",
      "f40a059ac95c00760f5ea57662eb9888",
    ],
  },
  cz1026: {
    descricao: [
      "Terreno de 800 m² no Quintas do Sol, em Nova Lima, pronto para receber um projeto residencial sob medida.",
    ],
    fotos: ["dbb2799f8e97699a8042ae5f3d3ac3f6"],
  },
};

/** Vendido, alugado ou retirado: fora do grid, página com o aviso de indisponível. */
const INDISPONIVEIS = new Set(["cz1021"]);

const DIA = 24 * 60 * 60 * 1000;
/** Publicação mais recente primeiro na ordem do código (define as seções automáticas da Home). */
const BASE = Date.parse("2026-10-20T10:00:00-03:00");

export type SementeImovel = {
  id: string;
  codigo: string;
  finalidade: Finalidade;
  lancamento: boolean;
  tipo: string;
  titulo: string;
  bairro: string;
  cidade: string;
  uf: string;
  valor: number;
  area: number;
  quartos: number | null;
  vagas: number | null;
  descricao: string;
  fotos: SementeFoto[];
  situacao: SituacaoImovel;
  criadoEm: Date;
  publicadoEm: Date;
};

/** Anúncios sem ficha do handoff recebem uma descrição montada só com os dados que já temos. */
function descricaoPadrao(tipo: string, area: number, bairro: string, cidade: string, quartos: number, vagas: number): string {
  const extras = [quartos ? `${quartos} quartos` : "", vagas ? `${vagas} vagas de garagem` : ""].filter(Boolean).join(" e ");
  return `${tipo} de ${area} m² em ${bairro}, ${cidade}${extras ? `, com ${extras}` : ""}.`;
}

export function sementeImoveis(): SementeImovel[] {
  return LINHAS.map(([codigo, fin, tipo, titulo, bairro, cidade, valor, area, quartos, vagas, capa], i) => {
    const id = codigo.toLowerCase();
    const ficha = FICHAS[id];
    const [finalidade, lancamento] = FIN[fin];
    const arquivos = ficha?.fotos ?? [capa];
    return {
      id,
      codigo,
      finalidade,
      lancamento,
      tipo,
      titulo,
      bairro,
      cidade,
      uf: "MG",
      valor,
      area,
      quartos: quartos || null,
      vagas: vagas || null,
      descricao: ficha ? ficha.descricao.join("\n\n") : descricaoPadrao(tipo, area, bairro, cidade, quartos, vagas),
      fotos: arquivos.map((a, n) => foto(a, `${titulo} — foto ${n + 1} de ${arquivos.length}`)),
      situacao: INDISPONIVEIS.has(id) ? "indisponivel" : "publicado",
      criadoEm: new Date(BASE - i * DIA - 2 * DIA),
      publicadoEm: new Date(BASE - i * DIA),
    };
  });
}

/** Imóvel da Oportunidade de hoje na semente. */
export const OPORTUNIDADE_INICIAL = "cz1009";

/** Os 3 imóveis de exemplo com que a produção estreou (`deploy.sh exemplos`); a primeira importação da Loft os remove. */
export const EXEMPLOS = ["cz1001", "cz1009", "cz1010"];
