// Ícones das telas Imóveis e Imóvel, com os traços exatos do handoff.
// Decorativos: o texto acessível fica no elemento que os contém.
import type { ReactNode, SVGProps } from "react";

type P = { size?: number; stroke?: string; width?: number } & Omit<SVGProps<SVGSVGElement>, "stroke" | "width">;

function Svg({ size = 16, stroke = "#0F1D24", width = 1.5, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IcPin = (p: P) => (
  <Svg stroke="#78323D" {...p}>
    <path d="M12 21s-6-5.5-6-11a6 6 0 0 1 12 0c0 5.5-6 11-6 11z" />
    <circle cx="12" cy="10" r="2" />
  </Svg>
);
export const IcArea = (p: P) => (
  <Svg stroke="#6D6E71" {...p}>
    <path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5" />
  </Svg>
);
export const IcCama = (p: P) => (
  <Svg stroke="#6D6E71" {...p}>
    <path d="M3 18v-6.5A1.5 1.5 0 0 1 4.5 10h15a1.5 1.5 0 0 1 1.5 1.5V18M3 15h18M6 10V7h5v3M13 10V7h5v3" />
  </Svg>
);
export const IcSeta = (p: P) => (
  <Svg {...p}>
    <path d="M5 12h14M13 6l6 6-6 6" />
  </Svg>
);
export const IcVoltar = (p: P) => (
  <Svg {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const IcBusca = (p: P) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Svg>
);
export const IcFiltros = (p: P) => (
  <Svg {...p}>
    <path d="M4 6h16M7 12h10M10 18h4" />
  </Svg>
);
export const IcX = (p: P) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IcChevron = (p: P) => (
  <Svg {...p}>
    <path d="M6 9l6 6 6-6" />
  </Svg>
);
export const IcAnterior = (p: P) => (
  <Svg {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);
export const IcProxima = (p: P) => (
  <Svg {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const IcCheck = (p: P) => (
  <Svg {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcAlerta = (p: P) => (
  <Svg {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17v.01" />
  </Svg>
);
export const IcCasa = (p: P) => (
  <Svg {...p}>
    <path d="M4 21V9l8-5 8 5v12" />
    <path d="M9 21v-6h6v6" />
  </Svg>
);
export const IcCamera = (p: P) => (
  <Svg {...p}>
    <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
    <circle cx="12" cy="13" r="3.5" />
  </Svg>
);
export const IcErro = (p: P) => (
  <Svg stroke="#78323D" {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </Svg>
);
