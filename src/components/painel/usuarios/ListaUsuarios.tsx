"use client";

import { Menu, MenuButton, MenuItem, MenuItems } from "@headlessui/react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import {
  convidarAction,
  desativarAction,
  editarUsuarioAction,
  reativarAction,
  reenviarConviteAction,
} from "@/app/painel/_acoes/usuarios";
import { Portal } from "@/components/ui/Portal";
import { useDialog } from "@/components/ui/useDialog";
import type { LinhaUsuario } from "@/lib/painel/contas";
import { IcBloqueio, IcConvite, IcEditar, IcEmail, IcFechar, IcImoveis, IcMais, IcReativar, IcReticencias, IcUsuarios } from "../Icones";
import { Aviso, Confirmacao, ErroCampo } from "../ui";

type Linha = LinhaUsuario & { ultimoTexto: string };

const SITUACAO = {
  ativo: { rotulo: "ATIVO", cls: "pn-status is-ok" },
  pendente: { rotulo: "CONVITE PENDENTE", cls: "pn-status is-draft" },
  desativado: { rotulo: "DESATIVADO", cls: "pn-status is-off" },
} as const;

const iniciais = (nome: string) => {
  const p = nome.trim().split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? "") + (p.length > 1 ? p[p.length - 1][0] : "")).toUpperCase();
};
const primeiro = (nome: string) => nome.trim().split(/\s+/)[0] ?? nome;
const qtd = (n: number) => (n === 1 ? "1 imóvel" : `${n} imóveis`);

type Gaveta = { modo: "convidar" } | { modo: "editar"; usuario: Linha };

function GavetaUsuario({ gaveta, onFechar, onConcluido }: { gaveta: Gaveta; onFechar: () => void; onConcluido: (texto: string) => void }) {
  const router = useRouter();
  const editar = gaveta.modo === "editar" ? gaveta.usuario : null;
  const [nome, setNome] = useState(editar?.nome ?? "");
  const [email, setEmail] = useState("");
  const [erros, setErros] = useState<{ nome?: string; email?: string }>({});
  const [enviando, iniciar] = useTransition();
  const [enviado, setEnviado] = useState<{ nome: string; email: string } | null>(null);
  const [falhou, setFalhou] = useState(false);
  const painelRef = useRef<HTMLDivElement>(null);
  const nomeRef = useRef<HTMLInputElement>(null);
  const emailRef = useRef<HTMLInputElement>(null);
  const sucessoRef = useRef<HTMLHeadingElement>(null);
  useDialog({ aberto: true, onFechar: () => !enviando && onFechar(), painelRef, focoInicialRef: nomeRef });

  useEffect(() => {
    if (enviado) sucessoRef.current?.focus();
  }, [enviado]);

  function enviar(e: React.FormEvent) {
    e.preventDefault();
    if (enviando) return;
    setFalhou(false);
    iniciar(async () => {
      try {
        if (editar) {
          const r = await editarUsuarioAction(editar.id, nome);
          if (!r.ok) {
            setErros({ nome: r.erro });
            nomeRef.current?.focus();
            return;
          }
          router.refresh();
          onConcluido(`Dados de ${nome.trim()} salvos.`);
          return;
        }
        const r = await convidarAction(nome, email);
        if (!r.ok) {
          setErros(r.erros);
          if (r.erros.nome) nomeRef.current?.focus();
          else emailRef.current?.focus();
          return;
        }
        setErros({});
        setEnviado({ nome: nome.trim(), email: email.trim().toLowerCase() });
        router.refresh();
      } catch {
        setFalhou(true);
      }
    });
  }

  const titulo = editar ? "Editar usuário" : "Convidar usuário";

  return (
    <Portal>
      <div className="im-scrim" onClick={() => !enviando && onFechar()} />
      <div ref={painelRef} className="im-panel" role="dialog" aria-modal="true" aria-labelledby="pn-inv-t">
        <div className="im-panel-head">
          <h2 className="im-form-title" id="pn-inv-t">
            {titulo}
          </h2>
          <button type="button" className="icon-btn" aria-label="Fechar" onClick={onFechar} disabled={enviando}>
            <IcFechar />
          </button>
        </div>

        {enviado ? (
          <>
            <div className="im-panel-body">
              <div className="im-success">
                <div className="pn-icon-ring">
                  <IcEmail stroke="#0F1D24" />
                </div>
                <h3 ref={sucessoRef} tabIndex={-1}>
                  Convite enviado
                </h3>
                <p>
                  Enviamos o convite para <strong style={{ color: "#0F1D24", fontWeight: 600, overflowWrap: "anywhere" }}>{enviado.email}</strong>. O link
                  para criar a senha vale por 72 horas. Se expirar, use “Reenviar convite” na lista.
                </p>
                <dl className="im-recap">
                  <div>
                    <dt>NOME</dt>
                    <dd>{enviado.nome}</dd>
                  </div>
                  <div>
                    <dt>E-MAIL</dt>
                    <dd>{enviado.email}</dd>
                  </div>
                  <div>
                    <dt>PAPEL</dt>
                    <dd>Corretor</dd>
                  </div>
                  <div>
                    <dt>SITUAÇÃO</dt>
                    <dd>Convite pendente</dd>
                  </div>
                </dl>
              </div>
            </div>
            <div className="im-panel-foot is-row">
              <button
                type="button"
                className="btn btn-ghost"
                onClick={() => {
                  setEnviado(null);
                  setNome("");
                  setEmail("");
                  setTimeout(() => nomeRef.current?.focus(), 0);
                }}
              >
                CONVIDAR OUTRA PESSOA
              </button>
              <button type="button" className="btn" onClick={onFechar}>
                CONCLUIR
              </button>
            </div>
          </>
        ) : (
          <form className="im-form" noValidate onSubmit={enviar} aria-busy={enviando}>
            <div className="im-panel-body">
              <p className="im-form-intro">
                {editar
                  ? "Altere o nome. A senha é só da pessoa: ela mesma troca em “Minha conta” ou pelo “Esqueci minha senha”."
                  : "A pessoa entra como Corretor e recebe um e-mail com o link para criar a própria senha. Você não define nem vê a senha de ninguém."}
              </p>
              {falhou && (
                <div className="pn-alert is-error" role="alert">
                  <div>
                    <strong>Não foi possível {editar ? "salvar" : "enviar o convite"}</strong>
                    <p>A conexão com o servidor falhou. Tente de novo.</p>
                  </div>
                </div>
              )}
              <div className="im-fields">
                <div className={erros.nome ? "im-field is-invalid" : "im-field"}>
                  <label className="im-lbl" htmlFor="pn-u-nome">
                    NOME <span className="req" aria-hidden="true">*</span>
                  </label>
                  <input
                    ref={nomeRef}
                    id="pn-u-nome"
                    className="im-input"
                    type="text"
                    autoComplete="off"
                    maxLength={120}
                    value={nome}
                    onChange={(e) => {
                      setNome(e.target.value);
                      if (erros.nome && e.target.value.trim().length >= 2) setErros((x) => ({ ...x, nome: undefined }));
                    }}
                    readOnly={enviando}
                    aria-required="true"
                    aria-invalid={erros.nome ? true : undefined}
                    aria-describedby={erros.nome ? "pn-u-nome-err" : undefined}
                  />
                  {erros.nome && <ErroCampo id="pn-u-nome-err">{erros.nome}</ErroCampo>}
                </div>
                <div className={erros.email ? "im-field is-invalid" : "im-field"}>
                  <label className="im-lbl" htmlFor="pn-u-email">
                    E-MAIL {!editar && <span className="req" aria-hidden="true">*</span>}
                  </label>
                  {editar ? (
                    <>
                      <div className="pn-ro" style={{ overflowWrap: "anywhere" }} aria-describedby="pn-u-email-hint">
                        {editar.email}
                      </div>
                      <p className="pn-hint" id="pn-u-email-hint">
                        O e-mail é o login. Para usar outro endereço, convide a pessoa de novo com o novo e-mail.
                      </p>
                    </>
                  ) : (
                    <input
                      ref={emailRef}
                      id="pn-u-email"
                      className="im-input"
                      type="email"
                      autoComplete="off"
                      inputMode="email"
                      value={email}
                      onChange={(e) => {
                        setEmail(e.target.value);
                        if (erros.email) setErros((x) => ({ ...x, email: undefined }));
                      }}
                      readOnly={enviando}
                      aria-required="true"
                      aria-invalid={erros.email ? true : undefined}
                      aria-describedby={erros.email ? "pn-u-email-err" : undefined}
                    />
                  )}
                  {erros.email && <ErroCampo id="pn-u-email-err">{erros.email}</ErroCampo>}
                </div>
                {!editar && (
                  <div className="im-field">
                    <span className="im-lbl">PAPEL</span>
                    <div className="pn-ro">Corretor</div>
                  </div>
                )}
              </div>
              <span className="sr-only" aria-live="polite">
                {enviando ? (editar ? "Salvando…" : "Enviando o convite…") : ""}
              </span>
            </div>
            <div className="im-panel-foot is-row">
              <button type="button" className="btn btn-ghost" onClick={onFechar} disabled={enviando}>
                CANCELAR
              </button>
              <button type="submit" className="btn" disabled={enviando}>
                {enviando ? (editar ? "SALVANDO…" : "ENVIANDO…") : editar ? "SALVAR" : "ENVIAR CONVITE"}
                {enviando && <span className="im-progress" aria-hidden="true" />}
              </button>
            </div>
          </form>
        )}
      </div>
    </Portal>
  );
}

export function ListaUsuarios({ usuarios, eu }: { usuarios: Linha[]; eu: string }) {
  const router = useRouter();
  const [gaveta, setGaveta] = useState<Gaveta | null>(null);
  const [desativar, setDesativar] = useState<Linha | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);
  const [ocupado, iniciar] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  function executar(acao: () => Promise<boolean>, sucesso: string, depois?: () => void) {
    setErro(null);
    iniciar(async () => {
      let ok = false;
      try {
        ok = await acao();
      } catch {
        ok = false;
      }
      if (!ok) {
        setErro("Não foi possível concluir. A lista foi atualizada; tente de novo.");
        router.refresh();
        return;
      }
      depois?.();
      setAviso(sucesso);
      router.refresh();
    });
  }

  const reenviar = (u: Linha) => executar(() => reenviarConviteAction(u.id), `Convite reenviado para ${u.email}. O link anterior deixou de valer.`);
  const reativar = (u: Linha) => executar(() => reativarAction(u.id), `${u.nome} voltou a ter acesso ao painel.`);

  const ativos = usuarios.filter((u) => u.situacao === "ativo").length;
  const pendentes = usuarios.filter((u) => u.situacao === "pendente").length;
  const desativados = usuarios.filter((u) => u.situacao === "desativado").length;
  const soEu = usuarios.length === 1;

  const avatar = (u: Linha, grande?: boolean) => (
    <span
      className={`pn-avatar${u.situacao === "desativado" ? " is-off" : ""}${u.situacao === "pendente" ? " is-pend" : ""}`}
      aria-hidden="true"
      style={grande ? { width: 40, height: 40 } : undefined}
    >
      {iniciais(u.nome)}
    </span>
  );

  return (
    <>
      <div className="pn-head">
        <div className="pn-head-txt">
          <h1 className="pn-title">Usuários</h1>
          <p className="pn-sub">Quem acessa o painel e o que cada pessoa pode fazer.</p>
        </div>
        <div className="pn-head-actions">
          <button type="button" className="btn" aria-haspopup="dialog" aria-expanded={gaveta?.modo === "convidar"} onClick={() => setGaveta({ modo: "convidar" })}>
            <IcMais stroke="#FFFFFF" />
            CONVIDAR USUÁRIO
          </button>
        </div>
      </div>

      {erro && (
        <div className="pn-alert is-error" role="alert" style={{ marginBottom: 16 }}>
          <div>
            <strong>{erro}</strong>
          </div>
        </div>
      )}

      {soEu && (
        <div className="pn-alert is-soft" style={{ marginBottom: 16 }}>
          <IcUsuarios stroke="#0F1D24" />
          <div>
            <strong>Por enquanto, só você tem acesso</strong>
            <p>Convide os corretores da equipe. Cada um recebe um e-mail para criar a própria senha e passa a cadastrar os imóveis em que é responsável.</p>
            <div className="pn-alert-actions">
              <button type="button" className="btn" style={{ minHeight: 44 }} onClick={() => setGaveta({ modo: "convidar" })}>
                CONVIDAR USUÁRIO
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="pn-table-box is-list">
        <table className="pn-table" style={{ minWidth: 960 }}>
          <caption className="sr-only">Usuários do painel</caption>
          <thead>
            <tr>
              <th scope="col">NOME</th>
              <th scope="col">E-MAIL</th>
              <th scope="col">PAPEL</th>
              <th scope="col">SITUAÇÃO</th>
              <th scope="col">ÚLTIMO ACESSO</th>
              <th scope="col" className="is-num">
                IMÓVEIS
              </th>
              <th scope="col">
                <span className="sr-only">Ações</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {usuarios.map((u) => {
              const souEu = u.id === eu;
              const temMenu = !souEu;
              return (
                <tr key={u.id}>
                  <td>
                    <div className="pn-name">
                      {avatar(u)}
                      <span className="pn-strong">{u.nome}</span>
                      {souEu && <span className="pn-you">VOCÊ</span>}
                    </div>
                  </td>
                  <td style={{ overflowWrap: "anywhere" }}>{u.email}</td>
                  <td>{u.papel === "admin" ? "ADMIN" : "Corretor"}</td>
                  <td>
                    <span className={SITUACAO[u.situacao].cls}>{SITUACAO[u.situacao].rotulo}</span>
                  </td>
                  <td>
                    <span className="pn-date">{u.ultimoTexto}</span>
                  </td>
                  <td className="is-num" style={{ fontVariantNumeric: "tabular-nums" }}>
                    {u.imoveis}
                  </td>
                  <td>
                    <div className="pn-actions">
                      <button type="button" className="pn-ibtn" aria-label={`Editar ${u.nome}`} aria-haspopup="dialog" onClick={() => setGaveta({ modo: "editar", usuario: u })}>
                        <IcEditar />
                      </button>
                      {temMenu ? (
                        <Menu as="div" className="pn-menu-wrap">
                          <MenuButton className="pn-ibtn" aria-label={`Mais ações para ${u.nome}`} disabled={ocupado}>
                            <IcReticencias />
                          </MenuButton>
                          <MenuItems as="ul" className="pn-menu-flutuante" anchor="bottom end" modal={false}>
                            {u.situacao === "pendente" && (
                              <MenuItem as="li">
                                <button type="button" onClick={() => reenviar(u)}>
                                  <IcConvite />
                                  Reenviar convite
                                </button>
                              </MenuItem>
                            )}
                            {u.situacao !== "desativado" ? (
                              <MenuItem as="li">
                                <button type="button" className="is-danger" onClick={() => setDesativar(u)}>
                                  <IcBloqueio />
                                  {u.situacao === "pendente" ? "Cancelar convite e desativar" : "Desativar acesso"}
                                </button>
                              </MenuItem>
                            ) : (
                              <MenuItem as="li">
                                <button type="button" onClick={() => reativar(u)}>
                                  <IcReativar />
                                  Reativar acesso
                                </button>
                              </MenuItem>
                            )}
                          </MenuItems>
                        </Menu>
                      ) : (
                        <span className="pn-ibtn" aria-hidden="true" style={{ cursor: "default" }} />
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <ul className="pn-cards" aria-label="Usuários do painel">
        {usuarios.map((u) => {
          const souEu = u.id === eu;
          return (
            <li key={u.id} className="pn-card">
              <div className="pn-card-main">
                <div className="pn-name" style={{ alignItems: "flex-start", minWidth: 0 }}>
                  {avatar(u, true)}
                  <div className="pn-card-body">
                    <span className="pn-strong" style={{ fontSize: 15 }}>
                      {u.nome}
                      {souEu && <span className="pn-you">VOCÊ</span>}
                    </span>
                    <span className="pn-muted" style={{ overflowWrap: "anywhere" }}>
                      {u.email}
                    </span>
                    <span className="pn-muted">
                      {u.papel === "admin" ? "ADMIN" : "Corretor"} · {qtd(u.imoveis)}
                    </span>
                  </div>
                </div>
              </div>
              <div className="pn-card-meta">
                <span className={SITUACAO[u.situacao].cls}>{SITUACAO[u.situacao].rotulo}</span>
                <span className="pn-muted">{u.situacao === "pendente" ? u.ultimoTexto : `Último acesso ${u.ultimoTexto}`}</span>
              </div>
              <div className="pn-card-foot" style={{ justifyContent: "flex-end", padding: "0 4px" }}>
                {!souEu && u.situacao === "pendente" && (
                  <button type="button" className="btn-plain" disabled={ocupado} onClick={() => reenviar(u)}>
                    REENVIAR CONVITE
                  </button>
                )}
                {!souEu && u.situacao !== "desativado" && (
                  <button type="button" className="btn-plain" style={{ color: "#78323D" }} disabled={ocupado} onClick={() => setDesativar(u)}>
                    DESATIVAR
                  </button>
                )}
                {!souEu && u.situacao === "desativado" && (
                  <button type="button" className="btn-plain" disabled={ocupado} onClick={() => reativar(u)}>
                    REATIVAR
                  </button>
                )}
                <button type="button" className="pn-ibtn" aria-label={`Editar ${u.nome}`} aria-haspopup="dialog" onClick={() => setGaveta({ modo: "editar", usuario: u })}>
                  <IcEditar />
                </button>
              </div>
            </li>
          );
        })}
      </ul>

      <div className="pn-table-foot">
        <span>
          <strong>{ativos}</strong> com acesso ativo · {pendentes} {pendentes === 1 ? "convite pendente" : "convites pendentes"} · {desativados}{" "}
          {desativados === 1 ? "desativado" : "desativados"}
        </span>
      </div>

      {desativar && (
        <Confirmacao
          titulo={desativar.situacao === "pendente" ? `Cancelar o convite de ${desativar.nome}?` : `Desativar ${desativar.nome}?`}
          rotuloConfirmar={desativar.situacao === "pendente" ? "CANCELAR CONVITE" : "DESATIVAR"}
          rotuloCancelar={desativar.situacao === "pendente" ? "VOLTAR" : "CANCELAR"}
          ocupado={ocupado}
          onCancelar={() => !ocupado && setDesativar(null)}
          onConfirmar={() => {
            const u = desativar;
            executar(
              () => desativarAction(u.id),
              u.situacao === "pendente" ? `Convite de ${u.nome} cancelado.` : `${u.nome} foi desativado. Os imóveis continuam no site.`,
              () => setDesativar(null),
            );
          }}
        >
          <p>
            {desativar.situacao === "pendente"
              ? `O link do convite deixa de valer e ${primeiro(desativar.nome)} não vai conseguir criar a senha. Você pode reativar depois.`
              : `${primeiro(desativar.nome)} não vai mais conseguir entrar no painel. O histórico é mantido e você pode reativar o acesso depois.`}
          </p>
          {desativar.imoveis > 0 && (
            <div className="pn-warn">
              <IcImoveis size={16} stroke="#0F1D24" width={1.6} />
              <span>
                <strong>{desativar.imoveis === 1 ? "O imóvel" : `Os ${desativar.imoveis} imóveis`}</strong> em que {primeiro(desativar.nome)} é responsável
                continuam no site. Para passar a outro responsável, edite cada imóvel.
              </span>
            </div>
          )}
        </Confirmacao>
      )}

      {gaveta && (
        <GavetaUsuario
          key={gaveta.modo === "editar" ? gaveta.usuario.id : "convidar"}
          gaveta={gaveta}
          onFechar={() => setGaveta(null)}
          onConcluido={(texto) => {
            setGaveta(null);
            setAviso(texto);
          }}
        />
      )}

      {aviso && <Aviso titulo={aviso} onFechar={() => setAviso(null)} />}
    </>
  );
}
