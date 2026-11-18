/**
 * Marca d'água das fotos: a logo com o selo da Ziller (public/logo/), em branco translúcido, no centro
 * embaixo. A forma vem do arquivo da logo como máscara e a cor do CSS (`.cz-marca-dagua`).
 * É só uma sobreposição na exibição (decisão do cliente: nunca gravada no arquivo).
 * O elemento pai precisa de `position: relative`; o tamanho acompanha a largura dele
 * quando ele é um contêiner (`container-type: inline-size`).
 */
export function MarcaDagua({ className }: { className?: string }) {
  return (
    <span aria-hidden="true" className={className ? `cz-marca-dagua ${className}` : "cz-marca-dagua"}>
      <span className="cz-marca-dagua-logo" />
    </span>
  );
}
