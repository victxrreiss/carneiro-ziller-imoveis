"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from "react";
import { salvarImovelAction, type RespostaSalvar } from "@/app/painel/_acoes/imoveis";
import type { Finalidade, SituacaoImovel } from "@/lib/dados/tipos";
import { TIPOS } from "@/lib/imoveis/filtros";
import { data, dataHora } from "@/lib/painel/datas";
import type { ImovelEdicao } from "@/lib/painel/imoveis";
import { LIMITES, ORDEM_CAMPOS, UFS, type CampoImovel, type ErrosImovel, type Intencao } from "@/lib/painel/regras";
import { painel, routes } from "@/lib/routes";
import { IcAlca, IcAlerta, IcAnterior, IcCadeado, IcErro, IcEstrela, IcExterno, IcImagem, IcLixeira, IcProxima, IcVoltar } from "../Icones";
import { Aviso, Confirmacao, ErroCampo, Selecao } from "../ui";
import { enviarFoto, erroArquivo, type FotoTela } from "./fotos";

type Usuario = { id: string; nome: string; admin: boolean };
type Responsavel = { id: string; nome: string; desativado: boolean };
type Oportunidade = { id: string; codigo: string; titulo: string } | null;

type Campos = {
  finalidade: Finalidade | "";
  lancamento: boolean;
  tipo: string;
  titulo: string;
  bairro: string;
  cidade: string;
  uf: string;
  valor: string;
  area: string;
  quartos: string;
  vagas: string;
  descricao: string;
  situacao: SituacaoImovel;
  responsavelId: string;
  oportunidade: boolean;
};

const NOMES: Record<keyof Campos | "fotos", string> = {
  finalidade: "a finalidade",
  lancamento: "o lançamento",
  tipo: "o tipo",
  titulo: "o título",
  bairro: "o bairro",
  cidade: "a cidade",
  uf: "a UF",
  valor: "o valor",
  area: "a área",
  quartos: "os quartos",
  vagas: "as vagas",
  descricao: "a descrição",
  fotos: "as fotos",
  situacao: "a situação",
  responsavelId: "o responsável",
  oportunidade: "a Oportunidade de hoje",
};

const ID_CAMPO: Record<CampoImovel, string> = {
  finalidade: "pn-f-fin",
  tipo: "pn-f-tipo",
  titulo: "pn-f-titulo",
  bairro: "pn-f-bairro",
  cidade: "pn-f-cidade",
  uf: "pn-f-uf",
  valor: "pn-f-valor",
  area: "pn-f-area",
  quartos: "pn-f-quartos",
  vagas: "pn-f-vagas",
  banheiros: "pn-f-banheiros",
  suites: "pn-f-suites",
  areaTotal: "pn-f-area-total",
  condominio: "pn-f-condominio",
  iptu: "pn-f-iptu",
  valorLocacao: "pn-f-valor-locacao",
  andar: "pn-f-andar",
  anoConstrucao: "pn-f-ano",
  cep: "pn-f-cep",
  descricao: "pn-f-desc",
  fotos: "pn-fotos",
};

const milhar = (d: string) => d.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
const digitos = (s: string) => s.replace(/\D/g, "");
const juntar = (itens: string[]) => (itens.length <= 1 ? (itens[0] ?? "") : `${itens.slice(0, -1).join(", ")} e ${itens[itens.length - 1]}`);
const rotuloFinalidade = { venda: "Venda", locacao: "Locação" } as const;

function camposDe(imovel: ImovelEdicao | null, usuarioId: string): Campos {
  const e = imovel?.entrada;
  return {
    finalidade: e?.finalidade ?? "",
    lancamento: e?.lancamento ?? false,
    tipo: e?.tipo ?? "",
    titulo: e?.titulo ?? "",
    bairro: e?.bairro ?? "",
    cidade: e?.cidade ?? "",
    uf: e?.uf || "MG",
    valor: e?.valor ?? "",
    area: e?.area ?? "",
    quartos: e?.quartos ?? "",
    vagas: e?.vagas ?? "",
    descricao: e?.descricao ?? "",
    situacao: imovel?.situacao ?? "rascunho",
    responsavelId: imovel?.responsavelId ?? usuarioId,
    oportunidade: imovel?.oportunidade ?? false,
  };
}

const fotosDe = (imovel: ImovelEdicao | null): FotoTela[] =>
  (imovel?.fotos ?? []).map((f) => ({ chave: f.id, id: f.id, src: f.src, alt: f.alt, estado: "ok", progresso: 100 }));

/**
 * Focar o controle de um campo (links do resumo de erros). Procura dentro do
 * formulário: o Next mantém páginas visitadas ocultas no DOM, com os mesmos ids.
 */
function focarCampo(raiz: HTMLElement | null, id: string) {
  const el = raiz?.querySelector<HTMLElement>(`#${id}`);
  if (!el) return;
  const alvo = el.matches("input, textarea, button") ? el : el.querySelector<HTMLElement>("input, textarea, button, [tabindex='0']");
  el.scrollIntoView({ block: "center" });
  (alvo ?? el).focus({ preventScroll: true });
}

type AvisoTela = { titulo: string; texto: string; link?: { href: string; rotulo: string } };

function textoAviso(intencao: Intencao, codigo: string, situacao: SituacaoImovel, oportunidadeSaiu: boolean, idImovel: string): AvisoTela {
  const extra = oportunidadeSaiu ? " A Oportunidade de hoje ficou vazia." : "";
  const link = situacao === "publicado" ? { href: routes.imovel(idImovel), rotulo: "Ver no site" } : undefined;
  if (intencao === "publicar") return { titulo: "Imóvel publicado.", texto: `${codigo} já aparece no site.${extra}`, link };
  if (intencao === "rascunho") return { titulo: "Rascunho salvo.", texto: `${codigo} continua fora do site até ser publicado.${extra}` };
  const texto =
    situacao === "publicado"
      ? `${codigo} já está atualizado no site.`
      : situacao === "indisponivel"
        ? `${codigo} saiu do grid e a página mostra o aviso de indisponível.`
        : `${codigo} voltou para rascunho e saiu do site.`;
  return { titulo: "Alterações salvas.", texto: texto + extra, link };
}

export function FormImovel({
  imovel: inicial,
  usuario,
  responsaveis,
  oportunidadeAtual,
  avisoInicial,
}: {
  imovel: ImovelEdicao | null;
  usuario: Usuario;
  responsaveis: Responsavel[];
  oportunidadeAtual: Oportunidade;
  avisoInicial: Intencao | null;
}) {
  const router = useRouter();
  const [salvo, setSalvo] = useState<ImovelEdicao | null>(inicial);
  const [c, setC] = useState<Campos>(() => camposDe(inicial, usuario.id));
  const [fotos, setFotos] = useState<FotoTela[]>(() => fotosDe(inicial));
  const [alterados, setAlterados] = useState<Set<keyof Campos | "fotos">>(() => new Set());
  const [erros, setErros] = useState<ErrosImovel>({});
  const [intencaoErros, setIntencaoErros] = useState<Intencao | null>(null);
  const [salvando, setSalvando] = useState<Intencao | null>(null);
  const [falha, setFalha] = useState<"rede" | "proibido" | "inexistente" | null>(null);
  const [ultimaIntencao, setUltimaIntencao] = useState<Intencao>("rascunho");
  const [aviso, setAviso] = useState<AvisoTela | null>(() =>
    avisoInicial && inicial ? textoAviso(avisoInicial, inicial.codigo, inicial.situacao, false, inicial.id) : null,
  );
  const [sairPara, setSairPara] = useState<string | null>(null);
  const [arrastando, setArrastando] = useState<string | null>(null);
  const [alvo, setAlvo] = useState<string | null>(null);
  const [sobreArea, setSobreArea] = useState(false);
  const [anuncio, setAnuncio] = useState("");
  const resumoRef = useRef<HTMLDivElement>(null);
  const raizRef = useRef<HTMLDivElement>(null);
  const [focarResumo, setFocarResumo] = useState(0);

  const novo = salvo === null;
  const edita = salvo ? salvo.podeEditar : true;
  const so = !edita;
  const codigo = salvo?.codigo ?? null;
  const situacaoSalva: SituacaoImovel = salvo?.situacao ?? "rascunho";
  const jaPublicado = situacaoSalva !== "rascunho";
  const sujo = alterados.size > 0;
  const enviando = fotos.some((f) => f.estado === "enviando");

  // Aviso que veio do cadastro (a página nova abre com ?salvo=…).
  useEffect(() => {
    if (avisoInicial && inicial) window.history.replaceState(null, "", painel.imovel(inicial.id));
  }, [avisoInicial, inicial]);

  useEffect(() => {
    if (focarResumo) resumoRef.current?.focus();
  }, [focarResumo]);

  // Sair com alterações não salvas: fechar a aba (navegador) e links do painel (modal).
  useEffect(() => {
    if (!sujo || so) return;
    const antesDeSair = (e: BeforeUnloadEvent) => e.preventDefault();
    const clique = (e: MouseEvent) => {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
      const a = (e.target as Element | null)?.closest?.("a[href]");
      if (!(a instanceof HTMLAnchorElement) || a.target === "_blank" || a.hasAttribute("data-sem-aviso")) return;
      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin || (url.pathname === window.location.pathname && url.hash)) return;
      e.preventDefault();
      setSairPara(url.pathname + url.search);
    };
    window.addEventListener("beforeunload", antesDeSair);
    document.addEventListener("click", clique, true);
    return () => {
      window.removeEventListener("beforeunload", antesDeSair);
      document.removeEventListener("click", clique, true);
    };
  }, [sujo, so]);

  function mudar<K extends keyof Campos>(k: K, v: Campos[K]) {
    setC((x) => ({ ...x, [k]: v }));
    setAlterados((s) => new Set(s).add(k));
    setFalha(null);
    // A mensagem de um campo some assim que ele fica preenchido.
    const campo = k as CampoImovel;
    if (erros[campo] && (typeof v !== "string" || v.trim())) {
      setErros((er) => {
        const n = { ...er };
        delete n[campo];
        return n;
      });
    }
  }

  function mudarFotos(f: (atual: FotoTela[]) => FotoTela[]) {
    setFotos(f);
    setAlterados((s) => new Set(s).add("fotos"));
    if (erros.fotos)
      setErros((er) => {
        const n = { ...er };
        delete n.fotos;
        return n;
      });
  }

  // ---------- Fotos ----------

  function enviar(chave: string, arquivo: File) {
    const erro = erroArquivo(arquivo);
    if (erro) {
      setFotos((fs) => fs.map((f) => (f.chave === chave ? { ...f, estado: "falha", erro } : f)));
      return;
    }
    setFotos((fs) => fs.map((f) => (f.chave === chave ? { ...f, estado: "enviando", progresso: 0, erro: undefined } : f)));
    void enviarFoto(arquivo, (pct) => setFotos((fs) => fs.map((f) => (f.chave === chave ? { ...f, progresso: pct } : f)))).then((r) => {
      setFotos((fs) =>
        fs.map((f) =>
          f.chave !== chave ? f : r.ok ? { ...f, id: r.id, estado: "ok", progresso: 100 } : { ...f, estado: "falha", erro: r.erro },
        ),
      );
      setAnuncio(r.ok ? `Foto ${arquivo.name} enviada.` : `Falha no envio de ${arquivo.name}.`);
    });
  }

  function adicionar(lista: FileList | null) {
    if (!lista?.length) return;
    const novos = [...lista].slice(0, Math.max(0, LIMITES.fotos - fotos.length));
    const itens: FotoTela[] = novos.map((arquivo) => ({
      chave: crypto.randomUUID(),
      id: null,
      src: URL.createObjectURL(arquivo),
      alt: "",
      estado: "enviando",
      progresso: 0,
      arquivo,
    }));
    mudarFotos((fs) => [...fs, ...itens]);
    setAnuncio(itens.length === 1 ? "1 foto sendo enviada." : `${itens.length} fotos sendo enviadas.`);
    itens.forEach((f) => enviar(f.chave, f.arquivo!));
  }

  function mover(chave: string, para: number) {
    mudarFotos((fs) => {
      const de = fs.findIndex((f) => f.chave === chave);
      if (de < 0 || para < 0 || para >= fs.length || para === de) return fs;
      const n = [...fs];
      const [item] = n.splice(de, 1);
      n.splice(para, 0, item);
      return n;
    });
    setAnuncio(`Foto movida para a posição ${para + 1}${para === 0 ? ", agora é a capa." : "."}`);
  }

  function remover(chave: string, n: number) {
    const f = fotos.find((x) => x.chave === chave);
    if (f?.src.startsWith("blob:")) URL.revokeObjectURL(f.src);
    mudarFotos((fs) => fs.filter((x) => x.chave !== chave));
    setAnuncio(`Foto ${n} removida.`);
  }

  // ---------- Salvar ----------

  const podeMarcarOportunidade = jaPublicado && c.situacao === "publicado";
  const ehOportunidade = !!salvo && oportunidadeAtual?.id === salvo.id;
  const oportunidadeSaindo = !so && ehOportunidade && (c.situacao !== "publicado" || (usuario.admin && !c.oportunidade));

  async function salvar(intencao: Intencao) {
    if (salvando) return;
    if (enviando) {
      setErros((er) => ({ ...er, fotos: "Espere as fotos terminarem de enviar." }));
      setIntencaoErros(intencao);
      setFocarResumo((n) => n + 1);
      return;
    }
    if (fotos.some((f) => f.estado === "falha")) {
      setErros((er) => ({ ...er, fotos: "Uma das fotos não foi enviada. Tente de novo ou remova a foto." }));
      setIntencaoErros(intencao);
      setFocarResumo((n) => n + 1);
      return;
    }
    setSalvando(intencao);
    setUltimaIntencao(intencao);
    setFalha(null);
    let r: RespostaSalvar;
    try {
      r = await salvarImovelAction(
        salvo?.id ?? null,
        {
          ...c,
          fotos: fotos.map((f) => ({ id: f.id!, alt: f.alt })),
          responsavelId: usuario.admin ? c.responsavelId : undefined,
          oportunidade: usuario.admin ? c.oportunidade && podeMarcarOportunidade : undefined,
        },
        intencao,
      );
    } catch {
      setSalvando(null);
      setFalha("rede");
      return;
    }
    setSalvando(null);
    if (!r.ok) {
      if ("erros" in r) {
        setErros(r.erros);
        setIntencaoErros(intencao);
        setFocarResumo((n) => n + 1);
      } else setFalha(r.falha);
      return;
    }
    setErros({});
    setIntencaoErros(null);
    setAlterados(new Set());
    if (r.novo) {
      router.replace(`${painel.imovel(r.imovel.id)}?salvo=${intencao}`);
      return;
    }
    setSalvo(r.imovel);
    setC(camposDe(r.imovel, usuario.id));
    setFotos(fotosDe(r.imovel));
    setAviso(textoAviso(intencao, r.codigo, r.situacao, r.oportunidadeSaiu, r.imovel.id));
    router.refresh();
  }

  // ---------- Textos derivados ----------

  const listaErros = ORDEM_CAMPOS.filter((o) => erros[o.campo]);
  const tituloResumo = `${intencaoErros === "rascunho" ? "Para salvar o rascunho" : situacaoSalva === "rascunho" ? "Para publicar" : "Para salvar"}, ${
    intencaoErros === "rascunho" ? "corrija" : "preencha"
  } ${listaErros.length === 1 ? "1 campo" : `${listaErros.length} campos`}.`;
  const valorRotulo = c.finalidade === "locacao" ? "VALOR MENSAL" : "VALOR";
  const tituloPagina = novo ? "Cadastrar imóvel" : salvo!.entrada.titulo || "Imóvel sem título";
  const subPagina = novo
    ? "Preencha os dados que aparecem no site. Você pode salvar como rascunho e terminar depois."
    : `${salvo!.codigo} · ${salvo!.entrada.finalidade ? rotuloFinalidade[salvo!.entrada.finalidade] : "Sem finalidade"}${
        salvo!.entrada.lancamento ? " · Lançamento" : ""
      } · ${salvo!.entrada.tipo || "Sem tipo"}`;
  const alteradosTexto = juntar([...alterados].map((k) => NOMES[k]));

  const responsavelOpcoes = useMemo(
    () =>
      responsaveis.map((r) => ({
        valor: r.id,
        rotulo: `${r.nome}${r.id === usuario.id ? " (você)" : ""}${r.desativado ? " · desativado" : ""}`,
      })),
    [responsaveis, usuario.id],
  );
  const responsavelNome = responsaveis.find((r) => r.id === c.responsavelId)?.nome ?? salvo?.responsavelNome ?? usuario.nome;

  const erroDe = (k: CampoImovel) => erros[k];
  const descr = (k: CampoImovel) => (erros[k] ? `${ID_CAMPO[k]}-err` : undefined);
  const classeCampo = (k: CampoImovel, extra = "") => `im-field${erros[k] ? " is-invalid" : ""}${extra ? ` ${extra}` : ""}`;

  function teclasFinalidade(e: KeyboardEvent<HTMLDivElement>) {
    const ordem: Finalidade[] = ["venda", "locacao"];
    if (!["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(e.key)) return;
    e.preventDefault();
    const i = Math.max(0, ordem.indexOf(c.finalidade as Finalidade));
    const prox = ordem[(i + (e.key === "ArrowLeft" || e.key === "ArrowUp" ? ordem.length - 1 : 1)) % ordem.length];
    mudar("finalidade", prox);
    raizRef.current?.querySelector<HTMLElement>(`#pn-fin-${prox}`)?.focus();
  }

  const campoTexto = (k: "titulo" | "bairro" | "cidade", rotulo: string, extra = "", placeholder?: string) => (
    <div className={classeCampo(k, extra)}>
      <label className="im-lbl" htmlFor={ID_CAMPO[k]}>
        {rotulo} <span className="req" aria-hidden="true">*</span>
      </label>
      {so ? (
        <div className="pn-ro">{c[k] || "—"}</div>
      ) : (
        <input
          id={ID_CAMPO[k]}
          className="im-input"
          type="text"
          maxLength={k === "titulo" ? LIMITES.titulo : 120}
          placeholder={placeholder}
          value={c[k]}
          onChange={(e) => mudar(k, e.target.value)}
          aria-required="true"
          aria-invalid={erros[k] ? true : undefined}
          aria-describedby={descr(k)}
        />
      )}
      {erroDe(k) && <ErroCampo id={`${ID_CAMPO[k]}-err`}>{erroDe(k)}</ErroCampo>}
    </div>
  );

  const botoesDesktop = (
    <div className="pn-btns">
      {!so && !jaPublicado && (
        <>
          <button type="button" className="btn" disabled={!!salvando} onClick={() => salvar("publicar")}>
            {salvando === "publicar" ? "PUBLICANDO…" : "PUBLICAR"}
            {salvando === "publicar" && <span className="im-progress" aria-hidden="true" />}
          </button>
          <button type="button" className="btn btn-ghost" disabled={!!salvando} onClick={() => salvar("rascunho")}>
            {salvando === "rascunho" ? "SALVANDO…" : "SALVAR RASCUNHO"}
          </button>
        </>
      )}
      {!so && jaPublicado && (
        <button type="button" className="btn" disabled={!!salvando} onClick={() => salvar("salvar")}>
          {salvando ? "SALVANDO…" : "SALVAR ALTERAÇÕES"}
          {salvando && <span className="im-progress" aria-hidden="true" />}
        </button>
      )}
      {situacaoSalva === "publicado" && salvo && (
        <a className="btn btn-ghost" href={routes.imovel(salvo.id)} target="_blank" rel="noopener">
          <IcExterno size={16} />
          VER NO SITE<span className="sr-only"> (abre em nova aba)</span>
        </a>
      )}
      {so && (
        <Link className="btn btn-ghost" href={painel.imoveis}>
          VOLTAR PARA IMÓVEIS
        </Link>
      )}
      <span className="sr-only" aria-live="polite">
        {salvando ? "Salvando…" : ""}
      </span>
    </div>
  );

  return (
    <div ref={raizRef}>
      <div className="pn-head">
        <div className="pn-head-txt">
          <Link className="im-back-link" href={painel.imoveis}>
            <IcVoltar />
            VOLTAR PARA IMÓVEIS
          </Link>
          <h1 className="pn-title">{tituloPagina}</h1>
          <p className="pn-sub">{subPagina}</p>
        </div>
      </div>

      <div className="pn-form-grid">
        <div className="pn-col">
          {so && salvo && (
            <div className="pn-alert" role="note">
              <IcCadeado stroke="#0F1D24" width={1.6} />
              <div>
                <strong>Somente leitura</strong>
                <p>Este imóvel é de {salvo.responsavelNome}. Você pode consultar os dados, mas só o responsável ou o ADMIN pode editar.</p>
              </div>
            </div>
          )}

          {listaErros.length > 0 && (
            <div ref={resumoRef} className="pn-alert is-error" role="alert" tabIndex={-1} id="pn-summary">
              <IcErro size={20} width={1.6} />
              <div>
                <strong>{tituloResumo}</strong>
                <p>O imóvel foi mantido como está. {intencaoErros === "rascunho" ? "Revise os campos abaixo:" : "Os campos abaixo são obrigatórios para aparecer no site:"}</p>
                <ul>
                  {listaErros.map((o) => (
                    <li key={o.campo}>
                      <a
                        href={`#${ID_CAMPO[o.campo]}`}
                        data-sem-aviso
                        onClick={(e) => {
                          e.preventDefault();
                          focarCampo(raizRef.current, ID_CAMPO[o.campo]);
                        }}
                      >
                        {o.campo === "valor" && c.finalidade === "locacao" ? "Valor mensal" : o.rotulo}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {falha && (
            <div className="pn-alert is-error" role="alert">
              <IcAlerta stroke="#78323D" width={1.6} />
              <div>
                {falha === "rede" ? (
                  <>
                    <strong>Não foi possível salvar</strong>
                    <p>A conexão com o servidor falhou. Suas alterações continuam nesta tela; nada foi publicado.</p>
                    <div className="pn-alert-actions">
                      <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => salvar(ultimaIntencao)}>
                        TENTAR NOVAMENTE
                      </button>
                    </div>
                  </>
                ) : falha === "proibido" ? (
                  <>
                    <strong>Você não pode editar este imóvel</strong>
                    <p>Só o responsável pelo imóvel ou o ADMIN pode salvar alterações.</p>
                  </>
                ) : (
                  <>
                    <strong>Este imóvel não existe mais</strong>
                    <p>Ele foi excluído enquanto você editava. Nada foi salvo.</p>
                  </>
                )}
              </div>
            </div>
          )}

          {/* 1. Dados */}
          <section className="pn-section" aria-labelledby="pn-s1">
            <div className="pn-section-h">
              <h2 id="pn-s1">Dados do imóvel</h2>
              {!so && (
                <p>
                  Os campos com <span style={{ color: "#0F1D24", fontWeight: 600 }}>*</span> são obrigatórios para publicar. O rascunho pode ser
                  salvo incompleto.
                </p>
              )}
            </div>
            <div className="pn-row">
              <div className="im-field">
                <span className="im-lbl" id="pn-l-cod">
                  CÓDIGO
                </span>
                <div className="pn-ro is-code" aria-labelledby="pn-l-cod">
                  {codigo ?? "Gerado ao salvar"}
                </div>
                {novo && <p className="pn-hint">O sistema gera o código no formato CZ#### ao salvar.</p>}
              </div>
              <div className={classeCampo("finalidade", "pn-span2")} id="pn-f-fin">
                <span className="im-lbl" id="pn-l-fin">
                  FINALIDADE <span className="req" aria-hidden="true">*</span>
                </span>
                <div
                  className={`pn-seg is-2${erros.finalidade ? " is-invalid" : ""}`}
                  role="radiogroup"
                  aria-labelledby="pn-l-fin"
                  aria-required="true"
                  aria-invalid={erros.finalidade ? true : undefined}
                  aria-describedby={descr("finalidade")}
                  onKeyDown={so ? undefined : teclasFinalidade}
                >
                  {(["venda", "locacao"] as const).map((f, i) => {
                    const marcado = c.finalidade === f;
                    return (
                      <button
                        key={f}
                        id={`pn-fin-${f}`}
                        type="button"
                        role="radio"
                        aria-checked={marcado}
                        tabIndex={marcado || (!c.finalidade && i === 0) ? 0 : -1}
                        disabled={so}
                        onClick={() => mudar("finalidade", f)}
                      >
                        {f === "venda" ? "VENDA" : "LOCAÇÃO"}
                      </button>
                    );
                  })}
                </div>
                {erros.finalidade && <ErroCampo id="pn-f-fin-err">{erros.finalidade}</ErroCampo>}
              </div>
            </div>
            <div className="pn-row">
              {so ? (
                <div className="im-field">
                  <span className="im-lbl">TIPO</span>
                  <div className="pn-ro">{c.tipo || "—"}</div>
                </div>
              ) : (
                <div className={classeCampo("tipo")} id="pn-f-tipo">
                  <Selecao
                    className="im-field"
                    rotulo={
                      <>
                        TIPO <span className="req" aria-hidden="true">*</span>
                      </>
                    }
                    vazio="Escolha o tipo"
                    valor={c.tipo}
                    onChange={(v) => mudar("tipo", v)}
                    opcoes={TIPOS.map((t) => ({ valor: t, rotulo: t }))}
                    invalido={!!erros.tipo}
                    descritoPor={descr("tipo")}
                  />
                  {erros.tipo && <ErroCampo id="pn-f-tipo-err">{erros.tipo}</ErroCampo>}
                </div>
              )}
              {campoTexto("titulo", "TÍTULO", "pn-span2", "Ex.: Apartamento no Belvedere")}
            </div>
            <div className="im-field">
              <span className="im-lbl" id="pn-l-lanc">
                LANÇAMENTO<span className="pn-opt">opcional</span>
              </span>
              {so ? (
                <div className="pn-ro" aria-labelledby="pn-l-lanc">
                  {c.lancamento ? "Sim" : "Não"}
                </div>
              ) : (
                <div className="pn-inline">
                  <label className={c.lancamento ? "pn-radio is-on" : "pn-radio"} style={{ alignItems: "center", flex: "none" }}>
                    <input
                      type="checkbox"
                      checked={c.lancamento}
                      onChange={(e) => mudar("lancamento", e.target.checked)}
                      aria-describedby="pn-lanc-help"
                    />
                    <span className="pn-radio-txt">
                      <strong>É lançamento</strong>
                    </span>
                  </label>
                  <p className="pn-hint" id="pn-lanc-help">
                    Entra no filtro Lançamentos do site e recebe a etiqueta LANÇAMENTO. Publicado, pode aparecer sozinho na seção Lançamentos da Home
                    (os 4 mais recentes).
                  </p>
                </div>
              )}
            </div>
          </section>

          {/* 2. Localização */}
          <section className="pn-section" aria-labelledby="pn-s2">
            <div className="pn-section-h">
              <h2 id="pn-s2">Localização</h2>
              <p>O site mostra só bairro, cidade e UF, nunca o endereço.</p>
            </div>
            <div className="pn-row is-loc">
              {campoTexto("bairro", "BAIRRO")}
              {campoTexto("cidade", "CIDADE")}
              {so ? (
                <div className="im-field">
                  <span className="im-lbl">UF</span>
                  <div className="pn-ro">{c.uf || "—"}</div>
                </div>
              ) : (
                <div className={classeCampo("uf")} id="pn-f-uf">
                  <Selecao
                    className="im-field"
                    rotulo={
                      <>
                        UF <span className="req" aria-hidden="true">*</span>
                      </>
                    }
                    vazio="UF"
                    valor={c.uf}
                    onChange={(v) => mudar("uf", v)}
                    opcoes={UFS.map((u) => ({ valor: u, rotulo: u }))}
                    invalido={!!erros.uf}
                    descritoPor={descr("uf")}
                    alinharDireita
                  />
                  {erros.uf && <ErroCampo id="pn-f-uf-err">{erros.uf}</ErroCampo>}
                </div>
              )}
            </div>
          </section>

          {/* 3. Valor e medidas */}
          <section className="pn-section" aria-labelledby="pn-s3">
            <div className="pn-section-h">
              <h2 id="pn-s3">Valor e medidas</h2>
              <p>Quartos e vagas são opcionais: deixe em branco para terreno, sala ou laje. O site só mostra o que estiver preenchido.</p>
            </div>
            <div className="pn-row is-val">
              <div className={classeCampo("valor")}>
                <label className="im-lbl" htmlFor="pn-f-valor">
                  {valorRotulo} <span className="req" aria-hidden="true">*</span>
                </label>
                {so ? (
                  <div className="pn-ro">
                    {c.valor ? `R$ ${milhar(c.valor)}${c.finalidade === "locacao" ? "/mês" : ""}` : "—"}
                  </div>
                ) : (
                  <div className="pn-affix">
                    <span className="pn-affix-txt" aria-hidden="true">
                      R$
                    </span>
                    <input
                      id="pn-f-valor"
                      className="im-input"
                      type="text"
                      inputMode="numeric"
                      placeholder="0"
                      value={milhar(c.valor)}
                      onChange={(e) => mudar("valor", digitos(e.target.value).slice(0, 12))}
                      aria-required="true"
                      aria-invalid={erros.valor ? true : undefined}
                      aria-describedby={["pn-f-valor-hint", descr("valor")].filter(Boolean).join(" ")}
                    />
                  </div>
                )}
                <p className="pn-hint" id="pn-f-valor-hint">
                  {c.finalidade === "locacao" ? "O site mostra “R$ 12.500/mês”." : "Valor de venda, sem centavos."}
                </p>
                {erros.valor && <ErroCampo id="pn-f-valor-err">{erros.valor}</ErroCampo>}
              </div>
              <div className={classeCampo("area")}>
                <label className="im-lbl" htmlFor="pn-f-area">
                  ÁREA <span className="req" aria-hidden="true">*</span>
                </label>
                {so ? (
                  <div className="pn-ro">{c.area ? `${milhar(c.area)} m²` : "—"}</div>
                ) : (
                  <div className="pn-affix is-suffix">
                    <input
                      id="pn-f-area"
                      className="im-input"
                      type="text"
                      inputMode="numeric"
                      value={milhar(c.area)}
                      onChange={(e) => mudar("area", digitos(e.target.value).slice(0, 7))}
                      aria-required="true"
                      aria-invalid={erros.area ? true : undefined}
                      aria-describedby={descr("area")}
                    />
                    <span className="pn-affix-txt" aria-hidden="true">
                      m²
                    </span>
                  </div>
                )}
                {erros.area && <ErroCampo id="pn-f-area-err">{erros.area}</ErroCampo>}
              </div>
              {(["quartos", "vagas"] as const).map((k) => (
                <div key={k} className={classeCampo(k)}>
                  <label className="im-lbl" htmlFor={ID_CAMPO[k]}>
                    {k === "quartos" ? "QUARTOS" : "VAGAS"}
                    <span className="pn-opt">opcional</span>
                  </label>
                  {so ? (
                    <div className="pn-ro">{c[k] || "—"}</div>
                  ) : (
                    <input
                      id={ID_CAMPO[k]}
                      className="im-input"
                      type="text"
                      inputMode="numeric"
                      maxLength={2}
                      value={c[k]}
                      onChange={(e) => mudar(k, digitos(e.target.value).slice(0, 2))}
                      aria-invalid={erros[k] ? true : undefined}
                      aria-describedby={descr(k)}
                    />
                  )}
                  {erros[k] && <ErroCampo id={`${ID_CAMPO[k]}-err`}>{erros[k]}</ErroCampo>}
                </div>
              ))}
            </div>
          </section>

          {/* 4. Descrição */}
          <section className="pn-section" aria-labelledby="pn-s4">
            <div className="pn-section-h">
              <h2 id="pn-s4">Descrição</h2>
              <p>Aparece em “Sobre o imóvel”. Separe os parágrafos com uma linha em branco.</p>
            </div>
            <div className={classeCampo("descricao")}>
              <label className="im-lbl" htmlFor="pn-f-desc">
                DESCRIÇÃO <span className="req" aria-hidden="true">*</span>
              </label>
              {so ? (
                <div className="pn-ro is-text">{c.descricao || "—"}</div>
              ) : (
                <textarea
                  id="pn-f-desc"
                  className="im-input"
                  rows={8}
                  value={c.descricao}
                  onChange={(e) => mudar("descricao", e.target.value)}
                  aria-required="true"
                  aria-invalid={erros.descricao ? true : undefined}
                  aria-describedby={descr("descricao")}
                  style={{ minHeight: 196 }}
                />
              )}
              {erros.descricao && <ErroCampo id="pn-f-desc-err">{erros.descricao}</ErroCampo>}
            </div>
          </section>

          {/* 5. Fotos */}
          <section className="pn-section" aria-labelledby="pn-s5" id="pn-fotos">
            <div className="pn-photos-h">
              <div className="pn-section-h">
                <h2 id="pn-s5">Fotos</h2>
                <p>
                  {so
                    ? "A primeira foto é a capa do card e da galeria."
                    : "A primeira foto é a capa do card e da galeria. Arraste ou use as setas para mudar a ordem."}
                </p>
              </div>
              <span aria-live="polite">
                {fotos.length === 0 ? "Nenhuma foto" : `${fotos.length} ${fotos.length === 1 ? "foto" : "fotos"}`}
                {fotos.some((f) => f.estado === "enviando") && ` · ${fotos.filter((f) => f.estado === "enviando").length} enviando`}
                {fotos.some((f) => f.estado === "falha") && ` · ${fotos.filter((f) => f.estado === "falha").length} com falha`}
              </span>
            </div>

            {!so && (
              <div
                className={sobreArea ? "pn-drop is-over" : "pn-drop"}
                onDragOver={(e) => {
                  if (arrastando || !e.dataTransfer.types.includes("Files")) return;
                  e.preventDefault();
                  setSobreArea(true);
                }}
                onDragLeave={() => setSobreArea(false)}
                onDrop={(e) => {
                  if (arrastando) return;
                  e.preventDefault();
                  setSobreArea(false);
                  adicionar(e.dataTransfer.files);
                }}
              >
                <IcImagem stroke="#0F1D24" />
                <span className="pn-drop-title">Arraste as fotos para cá</span>
                <p>JPG, PNG ou WEBP, horizontais, até {LIMITES.fotoMB} MB cada. Você pode enviar várias de uma vez.</p>
                <label className="btn btn-ghost" htmlFor="pn-file" style={{ cursor: "pointer" }}>
                  ESCOLHER FOTOS
                </label>
                <input
                  className="pn-file"
                  id="pn-file"
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(e) => {
                    adicionar(e.target.files);
                    e.target.value = "";
                  }}
                />
                <p>No celular, o botão também abre a câmera.</p>
              </div>
            )}

            {erros.fotos && <ErroCampo id="pn-fotos-err">{erros.fotos}</ErroCampo>}

            {fotos.length === 0 ? (
              <div className="pn-nophotos">
                <strong>FOTOS EM BREVE</strong>
                <span>Sem fotos, a página do imóvel e o card do grid mostram este aviso no lugar da galeria.</span>
              </div>
            ) : (
              <ol className="pn-photos" aria-label="Fotos na ordem em que aparecem no site">
                {fotos.map((f, i) => {
                  const n = i + 1;
                  const cls = [
                    "pn-photo",
                    i === 0 && "is-cover",
                    f.estado === "falha" && "is-failed",
                    arrastando === f.chave && "is-dragging",
                    alvo === f.chave && arrastando && arrastando !== f.chave && "is-target",
                  ]
                    .filter(Boolean)
                    .join(" ");
                  return (
                    <li
                      key={f.chave}
                      className={cls}
                      draggable={!so}
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setData("text/plain", f.chave);
                        setArrastando(f.chave);
                      }}
                      onDragOver={(e) => {
                        if (!arrastando) return;
                        e.preventDefault();
                        if (alvo !== f.chave) setAlvo(f.chave);
                      }}
                      onDrop={(e) => {
                        if (!arrastando) return;
                        e.preventDefault();
                        e.stopPropagation();
                        mover(arrastando, i);
                        setArrastando(null);
                        setAlvo(null);
                      }}
                      onDragEnd={() => {
                        setArrastando(null);
                        setAlvo(null);
                      }}
                    >
                      <div className="pn-photo-media">
                        {/* eslint-disable-next-line @next/next/no-img-element -- pré-visualização local (blob:) durante o envio */}
                        <img src={f.src} alt="" draggable={false} />
                        {i === 0 && <span className="pn-photo-cover">CAPA</span>}
                        <span className="pn-photo-n" aria-hidden="true">
                          {n}
                        </span>
                        {f.estado === "enviando" && (
                          <div className="pn-photo-over">
                            <div className="pn-prog-row">
                              <span>Enviando…</span>
                              <span>{f.progresso}%</span>
                            </div>
                            <div
                              className="pn-prog"
                              role="progressbar"
                              aria-label={`Envio da foto ${n}`}
                              aria-valuemin={0}
                              aria-valuemax={100}
                              aria-valuenow={f.progresso}
                            >
                              <span style={{ width: `${f.progresso}%` }} />
                            </div>
                          </div>
                        )}
                        {f.estado === "falha" && (
                          <div className="pn-photo-over is-fail">
                            <strong>
                              <IcErro />
                              Falha no envio
                            </strong>
                            <span style={{ fontSize: 12, lineHeight: 1.5 }}>
                              {f.arquivo?.name ?? "A foto"} {f.erro}
                            </span>
                            {f.arquivo && !erroArquivo(f.arquivo) && (
                              <button type="button" className="btn" style={{ minHeight: 44, padding: "0 16px" }} onClick={() => enviar(f.chave, f.arquivo!)}>
                                TENTAR DE NOVO
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="pn-photo-body">
                        {so ? (
                          <span className="pn-muted" style={{ lineHeight: 1.5, paddingBottom: 6 }}>
                            {f.alt || "Sem texto alternativo"}
                          </span>
                        ) : (
                          <>
                            <label className="im-lbl" htmlFor={`pn-alt-${f.chave}`}>
                              TEXTO ALTERNATIVO
                            </label>
                            <input
                              id={`pn-alt-${f.chave}`}
                              className="im-input"
                              type="text"
                              maxLength={LIMITES.alt}
                              placeholder="O que aparece na foto"
                              value={f.alt}
                              disabled={f.estado === "falha"}
                              onChange={(e) => {
                                const alt = e.target.value;
                                mudarFotos((fs) => fs.map((x) => (x.chave === f.chave ? { ...x, alt } : x)));
                              }}
                            />
                          </>
                        )}
                      </div>
                      {!so && (
                        <div className="pn-photo-tools">
                          <div className="pn-tools-l">
                            <span className="pn-ibtn pn-grab" aria-hidden="true" title="Arraste para reordenar">
                              <IcAlca />
                            </span>
                            <button
                              type="button"
                              className="pn-ibtn"
                              aria-label={`Mover a foto ${n} para antes`}
                              aria-disabled={i === 0}
                              onClick={() => i > 0 && mover(f.chave, i - 1)}
                            >
                              <IcAnterior />
                            </button>
                            <button
                              type="button"
                              className="pn-ibtn"
                              aria-label={`Mover a foto ${n} para depois`}
                              aria-disabled={i === fotos.length - 1}
                              onClick={() => i < fotos.length - 1 && mover(f.chave, i + 1)}
                            >
                              <IcProxima />
                            </button>
                          </div>
                          <button type="button" className="pn-ibtn is-danger" aria-label={`Remover a foto ${n}`} onClick={() => remover(f.chave, n)}>
                            <IcLixeira size={16} stroke="#78323D" />
                          </button>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ol>
            )}
            <p className="sr-only" aria-live="polite">
              {anuncio}
            </p>
          </section>
        </div>

        {/* Publicação */}
        <div className="pn-aside">
          <section className="pn-pub" aria-labelledby="pn-s-pub">
            <h2 id="pn-s-pub">Publicação</h2>

            {!so && jaPublicado ? (
              <fieldset className="pn-choices">
                <legend className="im-lbl">SITUAÇÃO</legend>
                {(
                  [
                    ["publicado", "Publicado", "Aparece no grid e tem página própria no site."],
                    ["indisponivel", "Indisponível", "Vendido ou alugado. Sai do grid; a página mostra o aviso de indisponível."],
                    ["rascunho", "Rascunho", "Sai do site e fica só no painel."],
                  ] as const
                ).map(([v, rotulo, ajuda]) => (
                  <label key={v} className={c.situacao === v ? "pn-radio is-on" : "pn-radio"}>
                    <input type="radio" name="pn-sit" value={v} checked={c.situacao === v} onChange={() => mudar("situacao", v)} />
                    <span className="pn-radio-txt">
                      <strong>{rotulo}</strong>
                      <span>{ajuda}</span>
                    </span>
                  </label>
                ))}
              </fieldset>
            ) : (
              <div className="im-field">
                <span className="im-lbl">SITUAÇÃO</span>
                <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
                  {situacaoSalva === "publicado" ? (
                    <>
                      <span className="pn-status is-pub">PUBLICADO</span>
                      <span className="pn-muted">Aparece no site.</span>
                    </>
                  ) : situacaoSalva === "indisponivel" ? (
                    <>
                      <span className="pn-status is-off">INDISPONÍVEL</span>
                      <span className="pn-muted">Fora do grid; a página mostra o aviso.</span>
                    </>
                  ) : (
                    <>
                      <span className="pn-status is-draft">RASCUNHO</span>
                      <span className="pn-muted" style={{ lineHeight: 1.5 }}>
                        {novo ? "Novo imóvel, ainda não salvo." : "Só aparece no site depois de publicado."}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {usuario.admin && !so ? (
              <div className="im-field">
                <Selecao
                  className="im-field"
                  rotulo="RESPONSÁVEL"
                  vazio="Escolha"
                  valor={c.responsavelId}
                  onChange={(v) => mudar("responsavelId", v)}
                  opcoes={responsavelOpcoes}
                />
                <p className="pn-hint">Quem responde pelo imóvel e pode editá-lo, além do ADMIN.</p>
              </div>
            ) : (
              <div className="im-field">
                <span className="im-lbl" id="pn-l-resp">
                  RESPONSÁVEL
                </span>
                <div className="pn-ro" aria-labelledby="pn-l-resp">
                  {responsavelNome}
                  {c.responsavelId === usuario.id ? " (você)" : ""}
                </div>
              </div>
            )}

            {usuario.admin && !so && (
              <div className="im-field">
                <span className="im-lbl">OPORTUNIDADE DE HOJE · HOME</span>
                <label className={`pn-radio${c.oportunidade && podeMarcarOportunidade ? " is-on" : ""}${podeMarcarOportunidade ? "" : " is-disabled"}`}>
                  <input
                    type="checkbox"
                    checked={c.oportunidade && podeMarcarOportunidade}
                    disabled={!podeMarcarOportunidade}
                    onChange={(e) => mudar("oportunidade", e.target.checked)}
                    aria-describedby="pn-oport-help"
                  />
                  <span className="pn-radio-txt">
                    <strong>Usar na Oportunidade de hoje</strong>
                    <span id="pn-oport-help">É o bloco grande da Home, com foto e ficha do imóvel. Só um imóvel por vez, escolhido pelo ADMIN.</span>
                  </span>
                </label>
                {!podeMarcarOportunidade && !ehOportunidade && <p className="pn-hint">Disponível só para imóvel publicado.</p>}
                {c.oportunidade && podeMarcarOportunidade && !ehOportunidade && oportunidadeAtual && (
                  <div className="pn-warn" role="status">
                    <IcEstrela size={16} />
                    <span>
                      Hoje a Oportunidade de hoje é{" "}
                      <strong>
                        {oportunidadeAtual.codigo} · {oportunidadeAtual.titulo}
                      </strong>
                      . Ao salvar, ele sai da Home e este imóvel entra no lugar.
                    </span>
                  </div>
                )}
                {c.oportunidade && podeMarcarOportunidade && ehOportunidade && <p className="pn-hint">Este imóvel está na Oportunidade de hoje.</p>}
              </div>
            )}

            {oportunidadeSaindo && (
              <div className="pn-warn" role="status">
                <IcAlerta size={16} stroke="#78323D" width={1.6} />
                <span>
                  {c.situacao !== "publicado"
                    ? `Este imóvel está na Oportunidade de hoje da Home. Ao salvar como ${c.situacao === "indisponivel" ? "Indisponível" : "Rascunho"}, ele sai da Home e a seção fica oculta até ${
                        usuario.admin ? "você escolher" : "o ADMIN escolher"
                      } outro imóvel publicado.${usuario.admin ? "" : " O ADMIN recebe um aviso no painel."}`
                    : "Ao salvar, a Oportunidade de hoje fica vazia e a seção some da Home até você escolher outro imóvel publicado."}
                </span>
              </div>
            )}

            <dl className="pn-meta">
              <div>
                <dt>CÓDIGO</dt>
                <dd>{codigo ?? "Gerado ao salvar"}</dd>
              </div>
              <div>
                <dt>CRIADO EM</dt>
                <dd>{salvo ? data(salvo.criadoEm) : "—"}</dd>
              </div>
              <div>
                <dt>ÚLTIMA ALTERAÇÃO</dt>
                <dd>{salvo ? `${dataHora(salvo.alteradoEm)} · ${salvo.alteradoPorNome}` : "Ainda não salvo"}</dd>
              </div>
            </dl>

            {botoesDesktop}
          </section>
        </div>
      </div>

      {/* Botões fixos no rodapé (até 1280px) */}
      <div className="pn-fixed-bar">
        {!so && !jaPublicado && (
          <>
            <button type="button" className="btn btn-ghost" disabled={!!salvando} onClick={() => salvar("rascunho")}>
              {salvando === "rascunho" ? "SALVANDO…" : "RASCUNHO"}
            </button>
            <button type="button" className="btn" disabled={!!salvando} onClick={() => salvar("publicar")}>
              {salvando === "publicar" ? "PUBLICANDO…" : "PUBLICAR"}
              {salvando === "publicar" && <span className="im-progress" aria-hidden="true" />}
            </button>
          </>
        )}
        {!so && jaPublicado && (
          <>
            {situacaoSalva === "publicado" && salvo && (
              <a className="pn-ibtn" href={routes.imovel(salvo.id)} target="_blank" rel="noopener" aria-label="Ver no site (abre em nova aba)" style={{ width: 48, height: 48 }}>
                <IcExterno />
              </a>
            )}
            <button type="button" className="btn" disabled={!!salvando} onClick={() => salvar("salvar")}>
              {salvando ? "SALVANDO…" : "SALVAR ALTERAÇÕES"}
              {salvando && <span className="im-progress" aria-hidden="true" />}
            </button>
          </>
        )}
        {so && (
          <>
            <Link className="btn btn-ghost" href={painel.imoveis}>
              VOLTAR
            </Link>
            {situacaoSalva === "publicado" && salvo && (
              <a className="btn" href={routes.imovel(salvo.id)} target="_blank" rel="noopener">
                VER NO SITE<span className="sr-only"> (abre em nova aba)</span>
              </a>
            )}
          </>
        )}
      </div>

      {sairPara && (
        <Confirmacao
          titulo="Sair sem salvar?"
          rotuloConfirmar="SAIR SEM SALVAR"
          rotuloCancelar="CONTINUAR EDITANDO"
          onCancelar={() => setSairPara(null)}
          onConfirmar={() => {
            setAlterados(new Set());
            const destino = sairPara;
            setSairPara(null);
            router.push(destino);
          }}
        >
          <p>Você alterou {alteradosTexto || "este imóvel"} e ainda não salvou. Se sair agora, essas alterações se perdem.</p>
        </Confirmacao>
      )}

      {aviso && <Aviso titulo={aviso.titulo} texto={aviso.texto} link={aviso.link} onFechar={() => setAviso(null)} acimaDaBarra />}
    </div>
  );
}
