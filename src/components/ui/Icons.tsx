// Ícones do handoff (traço 1.5–1.7, viewBox 24). Todos decorativos: aria-hidden.
import type { SVGProps } from "react";

type IconProps = { size?: number; color?: string } & Omit<SVGProps<SVGSVGElement>, "width" | "height">;

function Svg({ size = 16, color = "#0F1D24", strokeWidth = 1.5, children, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth={strokeWidth}
      aria-hidden="true"
      {...rest}
    >
      {children}
    </svg>
  );
}

export const InstagramIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="4" />
    <circle cx="12" cy="12" r="3.5" />
    <circle cx="17" cy="7" r="0.6" fill={p.color ?? "#0F1D24"} />
  </Svg>
);

export const LinkedInIcon = (p: IconProps) => (
  <Svg {...p}>
    <rect x="4" y="4" width="16" height="16" rx="2" />
    <path d="M8 11v5M8 8v.01M12 16v-5M12 13a2 2 0 0 1 4 0v3" />
  </Svg>
);
