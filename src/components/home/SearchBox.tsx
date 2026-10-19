"use client";

import Form from "next/form";
import Link from "next/link";
import { useState } from "react";
import { SearchIcon } from "@/components/ui/Icons";
import { TabList, type Tab } from "@/components/ui/TabList";
import { routes } from "@/lib/routes";

const finalidades: Tab[] = [
  { id: "comprar", label: "COMPRAR" },
  { id: "alugar", label: "ALUGAR" },
  { id: "lancamentos", label: "LANÇAMENTOS" },
];

/** Busca do hero: GET para /imoveis?finalidade=…&q=… (Lacuna 4 do README). */
export function SearchBox() {
  const [finalidade, setFinalidade] = useState("comprar");

  return (
    <Form action={routes.imoveis} role="search" className="flex max-w-130 flex-col gap-3">
      <TabList label="Finalidade" tabs={finalidades} selected={finalidade} onSelect={setFinalidade} variant="finalidade" />
      <input type="hidden" name="finalidade" value={finalidade} />
      <div className="flex items-stretch border border-[#ECE8E0] bg-white shadow-[0_12px_32px_rgba(65,64,66,0.10)]">
        <label htmlFor="busca-campo" className="sr-only">
          Buscar imóvel
        </label>
        <input
          id="busca-campo"
          type="search"
          name="q"
          maxLength={120}
          placeholder="Bairro, cidade, condomínio ou código"
          className="h-15.5 min-w-0 flex-1 border-0 bg-transparent px-5.5 text-[15px] text-grafite placeholder:text-[#757575]"
        />
        <button
          type="submit"
          aria-label="Buscar"
          className="flex w-15.5 cursor-pointer items-center justify-center border-0 bg-azul-noite transition-colors duration-200 hover:bg-azul-noite-hover"
        >
          <SearchIcon size={20} color="#FFFFFF" strokeWidth={1.7} />
        </button>
      </div>
      <Link href={routes.imoveis} className="text-[13px] text-cinza">
        Busca avançada <span className="text-azul-noite">→</span>
      </Link>
    </Form>
  );
}
