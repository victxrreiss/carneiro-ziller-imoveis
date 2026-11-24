// `next/font/local` só funciona compilado pelo Next; nos testes devolve classes vazias.
export default function localFont() {
  return { className: "", variable: "", style: { fontFamily: "serif" } };
}
