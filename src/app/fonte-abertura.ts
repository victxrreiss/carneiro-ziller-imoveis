import localFont from "next/font/local";

// Fonte da frase da abertura da Home (decisão do usuário, 24/11/2026: mais legível sobre a foto
// que a Cormorant). Newsreader variável (eixos de peso e tamanho óptico), arquivos latin do
// @fontsource-variable/newsreader copiados para ./fonts. Licença SIL OFL 1.1.
// Fica fora de fonts.ts para só a Home carregar (e pré-carregar) estes arquivos.
export const newsreader = localFont({
  src: [
    { path: "./fonts/newsreader-latin-opsz-normal.woff2", weight: "200 800", style: "normal" },
    { path: "./fonts/newsreader-latin-opsz-italic.woff2", weight: "200 800", style: "italic" },
  ],
  variable: "--font-abertura",
  display: "swap",
  fallback: ["serif"],
  adjustFontFallback: false,
});
