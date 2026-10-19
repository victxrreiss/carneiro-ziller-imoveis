"use client";

import { useRef, type KeyboardEvent } from "react";

export type Tab = { id: string; label: string; controls?: string };

type Variant = "finalidade" | "listagem";

const listClass: Record<Variant, string> = {
  finalidade: "flex gap-6",
  listagem: "flex gap-7 border-b border-[#D6D0C4]",
};

const tabBase = "min-h-11 cursor-pointer border-0 bg-transparent text-xs font-semibold";

const tabClass: Record<Variant, { base: string; on: string; off: string }> = {
  finalidade: {
    base: `${tabBase} p-0 tracking-[0.22em]`,
    on: "text-azul-noite shadow-[inset_0_-2px_0_#78323D]",
    off: "text-cinza",
  },
  listagem: {
    base: `${tabBase} -mb-px border-b-2 border-solid px-0.5 py-0 tracking-[0.24em]`,
    on: "border-vinho text-azul-noite",
    off: "border-transparent text-cinza",
  },
};

type Props = {
  label: string;
  tabs: Tab[];
  selected: string;
  onSelect: (id: string) => void;
  variant: Variant;
  /** Prefixo do id de cada aba, para o painel apontar com aria-labelledby. */
  idPrefix?: string;
};

/** Abas WAI-ARIA com seleção automática: setas, Home e End movem foco e seleção. */
export function TabList({ label, tabs, selected, onSelect, variant, idPrefix }: Props) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);
  const styles = tabClass[variant];

  function onKeyDown(event: KeyboardEvent, index: number) {
    const last = tabs.length - 1;
    const target =
      event.key === "ArrowRight" ? (index === last ? 0 : index + 1)
      : event.key === "ArrowLeft" ? (index === 0 ? last : index - 1)
      : event.key === "Home" ? 0
      : event.key === "End" ? last
      : null;
    if (target === null) return;
    event.preventDefault();
    refs.current[target]?.focus();
    onSelect(tabs[target].id);
  }

  return (
    <div role="tablist" aria-label={label} className={listClass[variant]}>
      {tabs.map((tab, index) => {
        const isSelected = tab.id === selected;
        return (
          <button
            key={tab.id}
            ref={(el) => {
              refs.current[index] = el;
            }}
            type="button"
            role="tab"
            id={idPrefix ? `${idPrefix}-tab-${tab.id}` : undefined}
            aria-selected={isSelected}
            aria-controls={tab.controls}
            tabIndex={isSelected ? 0 : -1}
            onClick={() => onSelect(tab.id)}
            onKeyDown={(event) => onKeyDown(event, index)}
            className={`${styles.base} ${isSelected ? styles.on : styles.off}`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
