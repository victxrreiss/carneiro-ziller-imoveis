import type { ReactNode } from "react";
import { SectionLabel } from "./SectionLabel";

type Props = {
  id: string;
  label: string;
  title: string;
  aside?: ReactNode;
  /** Espaço entre título e aside quando quebram linha (16px na maioria; 20px em "Selecionados"). */
  gapClass?: string;
};

export function SectionHeader({ id, label, title, aside, gapClass = "gap-4" }: Props) {
  return (
    <div className={`mb-9 flex flex-wrap items-end justify-between ${gapClass}`}>
      <div className="flex flex-col gap-3.5">
        <SectionLabel>{label}</SectionLabel>
        <h2 id={id} className="m-0 font-serif text-[clamp(34px,3.4vw,46px)] leading-[1.1] font-normal text-azul-noite">
          {title}
        </h2>
      </div>
      {aside}
    </div>
  );
}
