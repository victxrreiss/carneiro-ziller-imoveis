import localFont from "next/font/local";

// Identidade da Prioridade 2: Cormorant Garamond (display) e Jost (interface).
// Arquivos latin do @fontsource copiados para ./fonts (sem dependência no package.json).
export const cormorant = localFont({
  src: [
    { path: "./fonts/cormorant-garamond-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/cormorant-garamond-latin-300-italic.woff2", weight: "300", style: "italic" },
    { path: "./fonts/cormorant-garamond-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-cormorant",
  display: "swap",
  // Os substitutos ficam em --font-display (globals.css); glifos fora do subset latin caem neles.
  fallback: ["serif"],
  adjustFontFallback: false,
});

export const jost = localFont({
  src: [
    { path: "./fonts/jost-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/jost-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/jost-latin-500-normal.woff2", weight: "500", style: "normal" },
  ],
  variable: "--font-jost",
  display: "swap",
  // Glifos fora do subset latin (ex.: "→") caem no sans-serif do sistema.
  fallback: ["sans-serif"],
  adjustFontFallback: false,
});
