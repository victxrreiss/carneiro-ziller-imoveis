/**
 * As fotos importadas da Loft (chave `fotos/loft-…`, ver `scripts/loft/importar.ts`) já vêm com a
 * marca da Carneiro gravada no meio da imagem. Nelas a marca d'água do site não entra, para não
 * aparecerem duas marcas (decisão do cliente, 2026-11-19). Se um dia vierem da Loft sem a marca,
 * basta reimportar: a chave continua `loft-` e este critério muda junto.
 */
export function temMarcaGravada(src: string): boolean {
  return /\/fotos\/loft-[^/]*$/.test(src.split(/[?#]/)[0]);
}

/**
 * Marca d'água das fotos: a logo com o selo da Ziller (public/logo/), em branco translúcido, no
 * centro embaixo. A forma vem do arquivo da logo como máscara e a cor do CSS (`.cz-marca-dagua`).
 * É só uma sobreposição na exibição (decisão do cliente: nunca gravada no arquivo).
 * O elemento pai precisa de `position: relative`; o tamanho acompanha a largura dele
 * quando ele é um contêiner (`container-type: inline-size`). Com `src` de uma foto que já tem a
 * marca gravada (`temMarcaGravada`), não desenha nada.
 */
export function MarcaDagua({ src, className }: { src?: string; className?: string }) {
  if (src && temMarcaGravada(src)) return null;
  return (
    <span aria-hidden="true" className={className ? `cz-marca-dagua ${className}` : "cz-marca-dagua"}>
      <span className="cz-marca-dagua-logo" />
    </span>
  );
}
