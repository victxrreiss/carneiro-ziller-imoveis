import localFont from "next/font/local";

export const dmSerif = localFont({
  src: [
    { path: "./fonts/dm-serif-display-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/dm-serif-display-latin-400-italic.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-dm-serif",
  display: "swap",
  // Glifos fora do subset latin caem no serif do sistema, como na referência.
  fallback: ["serif"],
  adjustFontFallback: false,
});

export const montserrat = localFont({
  src: [
    { path: "./fonts/montserrat-latin-300-normal.woff2", weight: "300", style: "normal" },
    { path: "./fonts/montserrat-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/montserrat-latin-500-normal.woff2", weight: "500", style: "normal" },
    { path: "./fonts/montserrat-latin-600-normal.woff2", weight: "600", style: "normal" },
  ],
  variable: "--font-montserrat",
  display: "swap",
  // Glifos fora do subset latin (ex.: "→") caem no sans-serif do sistema, como na referência.
  fallback: ["sans-serif"],
  adjustFontFallback: false,
});
