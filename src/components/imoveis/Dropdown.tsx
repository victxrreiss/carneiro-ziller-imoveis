"use client";

import { Label, Listbox, ListboxButton, ListboxOption, ListboxOptions } from "@headlessui/react";
import { useId } from "react";
import { IcCheck, IcChevron } from "@/components/ui/IconesSite";

export type Opcao = { valor: string; rotulo: string };

type Props = {
  rotulo: string;
  /** Texto da primeira opção, que limpa o filtro ("Todos os tipos", "Qualquer"…). */
  vazio: string;
  opcoes: readonly Opcao[];
  valor: string | undefined;
  onChange: (valor: string | undefined) => void;
  largo?: boolean;
  desabilitado?: boolean;
  dica?: string;
};

/**
 * Dropdown customizado dos filtros (prefixo dd- do handoff). Comportamento de
 * listbox ARIA pelo Headless UI: Enter/Espaço abrem, setas e Home/End navegam,
 * busca por digitação, Esc fecha e devolve o foco, clique fora fecha. A lista
 * é renderizada no lugar (sem `anchor`), como no design.
 */
export function Dropdown({ rotulo, vazio, opcoes, valor, onChange, largo, desabilitado, dica }: Props) {
  const dicaId = useId();
  const atual = opcoes.find((o) => o.valor === valor);
  const todas: Opcao[] = [{ valor: "", rotulo: vazio }, ...opcoes];

  return (
    <Listbox
      as="div"
      className={largo ? "field field-wide" : "field"}
      value={valor ?? ""}
      onChange={(v: string) => onChange(v || undefined)}
      disabled={desabilitado}
    >
      {({ open }) => (
        <>
          <Label as="span" className="lbl">
            {rotulo}
          </Label>
          <div className={open ? "dd is-open" : "dd"}>
            <ListboxButton
              className={atual ? "dd-trigger is-set" : "dd-trigger"}
              aria-describedby={dica ? dicaId : undefined}
              onKeyDown={(e) => {
                // O Headless UI imita o <select> nativo e, dentro de um form, Enter envia o form.
                // O padrão pedido para o filtro é Enter abrir a lista, como Espaço.
                if (e.key === "Enter" && !open) {
                  e.preventDefault();
                  e.currentTarget.click();
                }
              }}
            >
              <span className="dd-value">{atual?.rotulo ?? vazio}</span>
              <IcChevron size={14} width={1.6} className="dd-chev" />
            </ListboxButton>
            <ListboxOptions as="ul" className="dd-list">
              {todas.map((o) => (
                <ListboxOption key={o.valor} as="li" value={o.valor} className={o.valor ? "dd-opt" : "dd-opt is-placeholder"}>
                  <span>{o.rotulo}</span>
                  <IcCheck width={1.8} className="dd-check" />
                </ListboxOption>
              ))}
            </ListboxOptions>
            {dica && (
              <span className="hint" id={dicaId}>
                {dica}
              </span>
            )}
          </div>
        </>
      )}
    </Listbox>
  );
}
