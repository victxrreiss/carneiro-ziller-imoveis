// Contorno do símbolo (o mesmo de public/logo/simbolo.svg), em currentColor.
const SIMBOLO =
  "M 44.371094 88.261719 L 44.371094 45.699219 L 126.75 45.699219 L 128.039062 169.835938 L 163.585938 169.835938 C 168.21875 169.835938 171.980469 166.078125 171.980469 161.441406 L 171.980469 85.585938 L 87.730469 0 L 0.804688 0 L 0.804688 46.804688 L 44.265625 88.261719 L 44.265625 169.835938 L 86.390625 169.835938 L 86.390625 137.363281 C 86.390625 131.628906 84.042969 126.140625 79.894531 122.179688 Z M 44.371094 88.261719";

/**
 * Marca d'água das fotos: símbolo e nome, em branco translúcido, no centro embaixo.
 * É só uma sobreposição na exibição (decisão do cliente: nunca gravada no arquivo).
 * O elemento pai precisa de `position: relative`; o tamanho acompanha a largura dele
 * quando ele é um contêiner (`container-type: inline-size`).
 */
export function MarcaDagua({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ? `cz-marca-dagua ${className}` : "cz-marca-dagua"}>
      <svg viewBox="0 0 172 170" focusable="false">
        <path fill="currentColor" d={SIMBOLO} />
      </svg>
      <span>CARNEIRO &amp; ZILLER</span>
    </span>
  );
}
