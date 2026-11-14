"use client";

import Form from "next/form";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useId, useState, type FormEvent, type ReactNode } from "react";
import { TabList, type Tab } from "@/components/ui/TabList";
import { MINIMOS_QUARTOS } from "@/lib/imoveis/filtros";
import { routes } from "@/lib/routes";

const comprar: Tab = { id: "comprar", label: "Comprar" };
const alugar: Tab = { id: "alugar", label: "Alugar" };
const lancamentos: Tab = { id: "lancamentos", label: "Lançamentos" };

type Props = {
  temLancamentos: boolean;
  /** Tipos com imóvel publicado. */
  tipos: readonly string[];
  /** Cidades e bairros com imóvel publicado. */
  locais: readonly { cidade: string; bairros: readonly string[] }[];
};

// A seta do select: chevron champanhe, como no mockup.
const seta = {
  backgroundImage:
    "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath d='M2 5l5 5 5-5' fill='none' stroke='%23C4A77A' stroke-width='1.2'/%3E%3C/svg%3E\")",
  backgroundRepeat: "no-repeat",
  backgroundPosition: "right 4px center",
};

function Campo({ rotulo, name, valor, onChange, children }: { rotulo: string; name: string; valor: string; onChange: (v: string) => void; children: ReactNode }) {
  const id = useId();
  // Rótulo ao lado, e não em volta: o nome acessível do campo é só o rótulo, sem o texto das opções.
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <label htmlFor={id} className="text-[10.5px] font-medium tracking-[0.26em] text-white/75 uppercase">
        {rotulo}
      </label>
      <select
        id={id}
        name={name}
        value={valor}
        onChange={(e) => onChange(e.target.value)}
        className="h-11.5 w-full min-w-0 cursor-pointer appearance-none truncate rounded-none border-0 border-b border-white/40 bg-transparent pr-6.5 text-[15px] font-normal text-white outline-none focus-visible:border-champanhe focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-champanhe min-[561px]:pr-9 min-[561px]:text-base [&_optgroup]:text-[#111] [&_option]:text-[#111]"
        style={seta}
      >
        {children}
      </select>
    </div>
  );
}

/**
 * URL da busca a partir do que está no formulário (o DOM, não o estado: uma escolha feita antes da
 * hidratação só existe no DOM). Sai campo vazio; dos dois `local` (cidade e bairro) fica o último
 * preenchido, como em `lerFiltros`: o bairro, que já leva a cidade.
 */
function urlBusca(acao: string, dados: FormData): string {
  const preenchidos = dados.getAll("local").filter((v) => typeof v === "string" && v !== "");
  const local = preenchidos[preenchidos.length - 1];
  const params = new URLSearchParams();
  for (const [chave, valor] of dados) {
    if (chave === "local") {
      if (typeof local === "string" && !params.has("local")) params.append("local", local);
    } else if (typeof valor === "string" && valor !== "") params.append(chave, valor);
  }
  const query = params.toString();
  return query ? `${acao}?${query}` : acao;
}

/**
 * Busca da abertura: GET para /imoveis com `finalidade`, `tipo`, `local` e `quartos`, os mesmos
 * parâmetros que o grid lê (`lerFiltros`). Cidade e bairro viram `local`
 * ("<Cidade>" ou "<Bairro>, <Cidade>").
 *
 * Todo select tem `name` sempre (cidade e bairro enviam `local` os dois, e `lerFiltros` fica com o
 * último preenchido): sem JavaScript, ou antes da hidratação, o GET nativo já leva tudo. Com o
 * JavaScript, `urlBusca` lê o próprio formulário e tira da URL os campos vazios.
 */
export function BuscaAbertura({ temLancamentos, tipos, locais }: Props) {
  const finalidades = temLancamentos ? [comprar, alugar, lancamentos] : [comprar, alugar];
  const [finalidade, setFinalidade] = useState("comprar");
  const [tipo, setTipo] = useState("");
  const [cidade, setCidade] = useState("");
  /** "<Bairro>, <Cidade>": o mesmo nome de bairro existe em mais de uma cidade. */
  const [bairro, setBairro] = useState("");
  const [quartos, setQuartos] = useState("");

  const router = useRouter();

  const daCidade = locais.find((l) => l.cidade === cidade);

  function buscar(e: FormEvent<HTMLFormElement>) {
    // O next/form não navega quando o onSubmit cancela o envio.
    e.preventDefault();
    router.push(urlBusca(routes.imoveis, new FormData(e.currentTarget)));
  }

  function trocarCidade(nova: string) {
    setCidade(nova);
    if (nova && !bairro.endsWith(`, ${nova}`)) setBairro("");
  }

  return (
    <Form action={routes.imoveis} role="search" onSubmit={buscar} className="flex flex-col gap-3.5 text-white">
      <TabList label="Finalidade" tabs={finalidades} selected={finalidade} onSelect={setFinalidade} variant="finalidade" />
      <input type="hidden" name="finalidade" value={finalidade} />

      <div className="grid grid-cols-2 items-end gap-x-5 gap-y-4.5 border border-white/22 bg-noite/55 px-4.5 pt-4.5 pb-5 backdrop-blur-[14px] min-[900px]:grid-cols-[1.2fr_1fr_1fr_.8fr_auto] min-[900px]:gap-7 min-[900px]:px-7 min-[900px]:py-5.5">
        <Campo rotulo="Tipo de imóvel" name="tipo" valor={tipo} onChange={setTipo}>
          <option value="">Todos os tipos</option>
          {tipos.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Campo>
        <Campo rotulo="Cidade" name="local" valor={cidade} onChange={trocarCidade}>
          <option value="">Todas as cidades</option>
          {locais.map((l) => (
            <option key={l.cidade} value={l.cidade}>
              {l.cidade}
            </option>
          ))}
        </Campo>
        <Campo rotulo="Bairro" name="local" valor={bairro} onChange={setBairro}>
          <option value="">Todos os bairros</option>
          {daCidade
            ? daCidade.bairros.map((b) => (
                <option key={b} value={`${b}, ${daCidade.cidade}`}>
                  {b}
                </option>
              ))
            : locais.map((l) => (
                <optgroup key={l.cidade} label={l.cidade}>
                  {l.bairros.map((b) => (
                    <option key={b} value={`${b}, ${l.cidade}`}>
                      {b}
                    </option>
                  ))}
                </optgroup>
              ))}
        </Campo>
        <Campo rotulo="Quartos" name="quartos" valor={quartos} onChange={setQuartos}>
          <option value="">Qualquer</option>
          {MINIMOS_QUARTOS.map((n) => (
            <option key={n} value={n}>
              {n}+
            </option>
          ))}
        </Campo>
        <button
          type="submit"
          className="col-span-full mt-1 inline-flex h-13 cursor-pointer items-center justify-center border border-champanhe bg-champanhe px-7 text-xs font-medium tracking-[0.22em] whitespace-nowrap text-noite uppercase transition-colors duration-250 hover:bg-[#D5BE97] focus-visible:outline-champanhe min-[900px]:col-span-1 min-[900px]:mt-0 min-[900px]:h-11.5"
        >
          Buscar
        </button>
      </div>

      <Link
        href={routes.filtrosAvancados}
        className="self-start border-b border-champanhe pb-1 text-xs tracking-[0.18em] text-white/85 uppercase after:content-['_→'] hover:text-white focus-visible:outline-champanhe"
      >
        Filtros avançados
      </Link>
    </Form>
  );
}
