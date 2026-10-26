// Ícones do painel (traços do design no canvas). Decorativos: o texto
// acessível fica no botão ou link que os contém.
import type { ReactNode, SVGProps } from "react";

type P = { size?: number; stroke?: string; width?: number } & Omit<SVGProps<SVGSVGElement>, "stroke" | "width">;

function Svg({ size = 18, stroke = "currentColor", width = 1.5, children, ...rest }: P & { children: ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={stroke} strokeWidth={width} aria-hidden="true" {...rest}>
      {children}
    </svg>
  );
}

export const IcImoveis = (p: P) => (
  <Svg size={20} {...p}>
    <path d="M3.5 10.5L12 4l8.5 6.5V20h-5.5v-6h-6v6H3.5z" />
  </Svg>
);
export const IcUsuarios = (p: P) => (
  <Svg size={20} {...p}>
    <circle cx="9" cy="8" r="3.5" />
    <path d="M2.5 20a6.5 6.5 0 0 1 13 0" />
    <path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18.5 14.4A6.5 6.5 0 0 1 21.5 20" />
  </Svg>
);
export const IcConta = (p: P) => (
  <Svg size={20} {...p}>
    <circle cx="12" cy="8.5" r="3.5" />
    <path d="M5 20a7 7 0 0 1 14 0" />
  </Svg>
);
export const IcSair = (p: P) => (
  <Svg size={20} {...p}>
    <path d="M14 4h5v16h-5M10 8l-4 4 4 4M6 12h10" />
  </Svg>
);
export const IcMenu = (p: P) => (
  <Svg size={20} stroke="#0F1D24" width={1.6} {...p}>
    <path d="M3 7h18M3 12h18M3 17h18" />
  </Svg>
);
export const IcFechar = (p: P) => (
  <Svg stroke="#0F1D24" width={1.6} {...p}>
    <path d="M6 6l12 12M18 6L6 18" />
  </Svg>
);
export const IcMais = (p: P) => (
  <Svg size={16} width={1.8} {...p}>
    <path d="M12 5v14M5 12h14" />
  </Svg>
);
export const IcEditar = (p: P) => (
  <Svg {...p}>
    <path d="M4 20h4L19 9l-4-4L4 16z" />
    <path d="M13.5 6.5l4 4" />
  </Svg>
);
export const IcOlho = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12C3.5 10.5 7 6 12 6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6z" />
    <circle cx="12" cy="12" r="3" />
  </Svg>
);
export const IcOlhoFechado = (p: P) => (
  <Svg {...p}>
    <path d="M2.5 12C3.5 10.5 7 6 12 6s8.5 4.5 9.5 6c-1 1.5-4.5 6-9.5 6s-8.5-4.5-9.5-6z" />
    <circle cx="12" cy="12" r="3" />
    <path d="M4 4l16 16" />
  </Svg>
);
export const IcExterno = (p: P) => (
  <Svg {...p}>
    <path d="M14 4h6v6M20 4l-9 9M18 14v6H4V6h6" />
  </Svg>
);
export const IcLixeira = (p: P) => (
  <Svg {...p}>
    <path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 11v6M14 11v6" />
  </Svg>
);
export const IcReticencias = (p: P) => (
  <svg width={p.size ?? 18} height={p.size ?? 18} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <circle cx="5.5" cy="12" r="1.6" />
    <circle cx="12" cy="12" r="1.6" />
    <circle cx="18.5" cy="12" r="1.6" />
  </svg>
);
export const IcEstrela = ({ size = 11 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#78323D" aria-hidden="true">
    <path d="M12 3.5l2.6 5.3 5.9.9-4.25 4.1 1 5.8L12 16.9l-5.25 2.7 1-5.8L3.5 9.7l5.9-.9z" />
  </svg>
);
export const IcCheck = (p: P) => (
  <Svg size={16} width={1.8} {...p}>
    <path d="M5 12.5l4.5 4.5L19 7.5" />
  </Svg>
);
export const IcErro = (p: P) => (
  <Svg size={14} stroke="#78323D" width={2} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5.5M12 16.5v.01" />
  </Svg>
);
export const IcAlerta = (p: P) => (
  <Svg size={20} {...p}>
    <path d="M12 4l9 16H3z" />
    <path d="M12 10v4M12 17v.01" />
  </Svg>
);
export const IcCadeado = (p: P) => (
  <Svg size={20} {...p}>
    <rect x="5" y="10.5" width="14" height="10" />
    <path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" />
  </Svg>
);
export const IcRelogio = (p: P) => (
  <Svg size={20} {...p}>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" />
  </Svg>
);
export const IcEmail = (p: P) => (
  <Svg size={26} width={1.4} {...p}>
    <rect x="3" y="5.5" width="18" height="13" />
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
  </Svg>
);
export const IcBusca = (p: P) => (
  <Svg width={1.7} {...p}>
    <circle cx="11" cy="11" r="6" />
    <path d="M20 20l-4.5-4.5" />
  </Svg>
);
export const IcImagem = (p: P) => (
  <Svg size={32} width={1.3} {...p}>
    <rect x="3" y="5" width="18" height="14" />
    <circle cx="9" cy="10" r="1.8" />
    <path d="M21 16l-5-5-8 8" />
  </Svg>
);
export const IcAnterior = (p: P) => (
  <Svg size={16} width={1.6} {...p}>
    <path d="M15 6l-6 6 6 6" />
  </Svg>
);
export const IcProxima = (p: P) => (
  <Svg size={16} width={1.6} {...p}>
    <path d="M9 6l6 6-6 6" />
  </Svg>
);
export const IcVoltar = (p: P) => (
  <Svg size={16} width={1.6} {...p}>
    <path d="M19 12H5M11 6l-6 6 6 6" />
  </Svg>
);
export const IcAlca = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="#6D6E71" aria-hidden="true">
    <circle cx="9" cy="6" r="1.5" />
    <circle cx="15" cy="6" r="1.5" />
    <circle cx="9" cy="12" r="1.5" />
    <circle cx="15" cy="12" r="1.5" />
    <circle cx="9" cy="18" r="1.5" />
    <circle cx="15" cy="18" r="1.5" />
  </svg>
);
export const IcBloqueio = (p: P) => (
  <Svg size={16} {...p}>
    <circle cx="12" cy="12" r="8.5" />
    <path d="M6 6l12 12" />
  </Svg>
);
export const IcReativar = (p: P) => (
  <Svg size={16} {...p}>
    <path d="M4 12a8 8 0 1 0 2.4-5.7M4 4v4h4" />
  </Svg>
);
export const IcConvite = (p: P) => (
  <Svg size={16} {...p}>
    <rect x="3" y="5.5" width="18" height="13" />
    <path d="M3.5 6.5l8.5 6.5 8.5-6.5" />
  </Svg>
);
