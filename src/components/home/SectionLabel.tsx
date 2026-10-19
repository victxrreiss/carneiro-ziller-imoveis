import type { ReactNode } from "react";

const tones = {
  vinho: { text: "text-vinho", line: "bg-vinho" },
  areia: { text: "text-areia", line: "bg-areia" },
} as const;

/** Linha pequena acima dos títulos: fio de 40px + rótulo em caixa-alta. */
export function SectionLabel({ tone = "vinho", children }: { tone?: keyof typeof tones; children: ReactNode }) {
  const t = tones[tone];
  return (
    <div className={`flex items-center gap-3.5 text-xs font-medium tracking-[0.32em] ${t.text}`}>
      <span aria-hidden="true" className={`h-px w-10 ${t.line}`} />
      {children}
    </div>
  );
}
