import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ShieldCheck } from "lucide-react";
import { useBlocker } from "react-router";

import { usePerfilAtual } from "@/core/auth/usePerfilAtual";
import { ApiError } from "@/shared/api/problem-details";
import { Button } from "@/shared/ui/button";
import { Badge } from "@/shared/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyState, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { PageSkeleton } from "@/shared/ui/skeleton";
import { criarPerfil, listarPerfis, listarPermissoes, salvarPermissoes } from "./api/perfis.api";
import type { Perfil, Permissao } from "./api/perfis.api";
import { PerfilAcoesMenu } from "./PerfilAcoesMenu";
import { useTranslation } from "react-i18next";

type ModoEditor = "visualizar" | "editar";
type AcaoPendente = { tipo: "perfil"; perfil: Perfil; modo: ModoEditor } | { tipo: "novo" } | { tipo: "cancelar" } | { tipo: "lista" };
type CriacaoPerfil = { nome: string; descricao: string; permissoes: string[] };

export function PerfisPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const perfilAtual = usePerfilAtual();
  const perfis = useQuery({ queryKey: ["perfis"], queryFn: listarPerfis });
  const permissoes = useQuery({ queryKey: ["permissoes"], queryFn: listarPermissoes });
  const [criando, setCriando] = useState(false);
  const [modoEditor, setModoEditor] = useState<ModoEditor | null>(null);
  const [pagina, setPagina] = useState(1);
  const [itensPorPagina, setItensPorPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [nome, setNome] = useState("");
  const [erroNome, setErroNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [selecionado, setSelecionado] = useState("");
  const [marcadas, setMarcadas] = useState<string[]>([]);
  const [gruposAbertos, setGruposAbertos] = useState<Set<string>>(() => new Set());
  const [confirmarMudanca, setConfirmarMudanca] = useState(false);
  const [acaoPendente, setAcaoPendente] = useState<AcaoPendente | null>(null);
  const acaoPendenteRef = useRef<AcaoPendente | null>(null);
  const perfilAnteriorRef = useRef<string | null>(null);
  const atual = perfis.data?.find((item) => item.id === selecionado);
  const baseline = atual?.permissoes ?? [];
  const dirty = criando
    ? Boolean(nome.trim() || descricao.trim() || marcadas.length)
    : Boolean(modoEditor === "editar" && atual && !mesmosCodigos(baseline, marcadas));
  const blocker = useBlocker(dirty);

  const grupos = (() => {
    const porCodigo = new Map<string, { nome: string; ordem: number; itens: Permissao[] }>();
    for (const permissao of permissoes.data ?? []) {
      const grupo = porCodigo.get(permissao.modulo.codigo) ?? {
        nome: t(`catalog.module.${permissao.modulo.codigo}`, { defaultValue: permissao.modulo.nome }),
        ordem: permissao.modulo.ordem,
        itens: [],
      };
      grupo.itens.push(permissao);
      porCodigo.set(permissao.modulo.codigo, grupo);
    }
    return [...porCodigo.entries()].sort((a, b) => a[1].ordem - b[1].ordem);
  })();

  const salvar = useMutation({
    mutationFn: ({ perfilId, codigos }: { perfilId: string; codigos: string[] }) =>
      salvarPermissoes(perfilId, codigos),
    onSuccess: (perfilSalvo) => {
      queryClient.setQueryData<Perfil[]>(["perfis"], (lista) =>
        lista?.map((item) => item.id === perfilSalvo.id ? perfilSalvo : item),
      );
      setMarcadas(perfilSalvo.permissoes);
    },
  });
  const criar = useMutation({
    mutationFn: (rascunho: CriacaoPerfil) =>
      criarPerfil(rascunho.nome, rascunho.descricao, rascunho.permissoes),
    onSuccess: async (novo) => {
      queryClient.setQueryData<Perfil[]>(["perfis"], (lista) => [...(lista ?? []), novo]);
      setCriando(false);
      setModoEditor("editar");
      setSelecionado(novo.id);
      setMarcadas(novo.permissoes);
      setNome("");
      setErroNome("");
      setDescricao("");
      await queryClient.invalidateQueries({ queryKey: ["perfis"] });
    },
  });

  useEffect(() => {
    if (!criando && !selecionado && perfis.data?.length) {
      setSelecionado(perfis.data[0].id);
      setMarcadas(perfis.data[0].permissoes);
    }
  }, [criando, perfis.data, selecionado]);

  useEffect(() => {
    if (blocker.state === "blocked") setConfirmarMudanca(true);
  }, [blocker.state]);

  const iniciarNovo = () => {
    perfilAnteriorRef.current = selecionado || null;
    setCriando(true);
    setModoEditor("editar");
    setSelecionado("");
    setNome("");
    setErroNome("");
    setDescricao("");
    setMarcadas([]);
    setGruposAbertos(new Set());
  };

  const voltarParaPerfilAnterior = () => {
    const id = perfilAnteriorRef.current;
    const anterior = perfis.data?.find((item) => item.id === id);
    setCriando(false);
    setModoEditor(null);
    setNome("");
    setDescricao("");
    setSelecionado(anterior?.id ?? "");
    setMarcadas(anterior?.permissoes ?? []);
  };

  const executarAcao = (acao: AcaoPendente) => {
    criar.reset();
    salvar.reset();
    if (acao.tipo === "novo") {
      iniciarNovo();
    } else if (acao.tipo === "cancelar") {
      voltarParaPerfilAnterior();
    } else if (acao.tipo === "lista") {
      setCriando(false);
      setModoEditor(null);
      setNome("");
      setDescricao("");
    } else {
      setCriando(false);
      setModoEditor(acao.modo);
      setSelecionado(acao.perfil.id);
      setMarcadas(acao.perfil.permissoes);
      setNome("");
      setDescricao("");
      setGruposAbertos(new Set());
    }
  };

  const pedirAcao = (acao: AcaoPendente) => {
    if (dirty) {
      acaoPendenteRef.current = acao;
      setAcaoPendente(acao);
      setConfirmarMudanca(true);
      return;
    }
    executarAcao(acao);
  };

  const salvarRascunho = async () => {
    if (criando) {
      await criar.mutateAsync({ nome: nome.trim(), descricao: descricao.trim(), permissoes: marcadas });
      return;
    }
    if (selecionado) await salvar.mutateAsync({ perfilId: selecionado, codigos: marcadas });
  };

  const concluirMudanca = async (salvarAntes: boolean) => {
    const pendente = acaoPendenteRef.current;
    if (salvarAntes) {
      try {
        await salvarRascunho();
      } catch {
        return;
      }
    }
    if (pendente) executarAcao(pendente);
    acaoPendenteRef.current = null;
    setAcaoPendente(null);
    setConfirmarMudanca(false);
    if (blocker.state === "blocked") blocker.proceed();
  };

  const cancelarMudanca = () => {
    acaoPendenteRef.current = null;
    setAcaoPendente(null);
    setConfirmarMudanca(false);
    if (blocker.state === "blocked") blocker.reset();
  };

  const alternarGrupo = (codigo: string) => {
    setGruposAbertos((abertos) => {
      const proximo = new Set(abertos);
      if (proximo.has(codigo)) proximo.delete(codigo);
      else proximo.add(codigo);
      return proximo;
    });
  };

  if (perfilAtual.data && perfilAtual.data.perfil_codigo !== "ADMIN_UNIDADE" &&
    !perfilAtual.data.permissoes.includes("perfis.gerenciar")) {
    return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  }
  if (perfis.isLoading || permissoes.isLoading) {
    return <PageSkeleton />;
  }
  if (perfis.error instanceof ApiError && perfis.error.problem.status === 403) {
    return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;
  }
  if (perfis.error || permissoes.error) {
    return <p role="alert" className="p-6 text-sm text-destructive">{t("profilesLoadError")}</p>;
  }

  const mutacaoAtiva = criar.isPending || salvar.isPending;
  const listaPerfis = perfis.data ?? [];
  const perfisPaginados = listaPerfis.slice((pagina - 1) * itensPorPagina, pagina * itensPorPagina);
  const erroGravacao = criando ? criar.error : salvar.error;
  const titleDialog = criando ? t("profileDraftTitle") : t("unsavedChanges");
  const textoDialog = criando
    ? t("profileDraftHint")
    : t("unsavedPermissionsHint");
  const labelSalvarEContinuar = criando ? t("createAndContinue") : t("saveAndContinue");
  const labelDescartar = acaoPendente?.tipo === "cancelar" ? t("discardDraft") : t("discardAndContinue");

  return (
    <section className="flex h-full min-h-0 w-full flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
      <header className="mb-7 flex shrink-0 flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-medium leading-8 text-primary">{t("profileTitle")}</h1>
        </div>
        {!criando && <Button onClick={() => pedirAcao({ tipo: "novo" })} className="h-10 rounded-lg px-5 text-sm">{t("newProfile")}</Button>}
      </header>

      {!criando && modoEditor === null ? (
        <TableLayout>
          <Table containerClassName={perfisPaginados.length > 0 ? "min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
            <TableHeader>
              <TableRow>
                <TableHead>{t("profileColumn")}</TableHead>
                <TableHead>{t("description")}</TableHead>
                <TableHead>{t("type")}</TableHead>
                <TableHead>{t("permissions")}</TableHead>
                <TableHead className="w-20 text-center">{t("actions")}</TableHead>
              </TableRow>
            </TableHeader>
            {perfisPaginados.length > 0 && <TableBody>
              {perfisPaginados.map((perfil) => (
                <TableRow key={perfil.id}>
                  <TableCell className="font-medium">{perfil.codigo ? t(`catalog.profile.${perfil.codigo}`, { defaultValue: perfil.nome }) : perfil.nome}</TableCell>
                  <TableCell className="text-muted-foreground">{perfil.descricao || "—"}</TableCell>
                  <TableCell>{perfil.codigo ? t("protectedBySystem") : t("unitProfile")}</TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="gap-1.5 rounded-md border border-[#DCE7FF] bg-[#F5F8FF] px-2.5 py-1 text-primary">
                      <ShieldCheck aria-hidden="true" className="size-3.5" />
                      <span aria-hidden="true">{perfil.permissoes.length}</span>
                      <span className="sr-only">{t("permissionCount", { count: perfil.permissoes.length })}</span>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-center">
                    <PerfilAcoesMenu
                      perfil={perfil}
                      onVisualizar={() => pedirAcao({ tipo: "perfil", perfil, modo: "visualizar" })}
                      onEditar={() => pedirAcao({ tipo: "perfil", perfil, modo: "editar" })}
                      podeEditar
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>}
          </Table>
          {(perfis.data ?? []).length === 0 && (
            <TableEmptyState className="p-8 text-center">
              <div role="status"><h2 className="font-semibold">{t("noProfiles")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("noProfilesHint")}</p></div>
            </TableEmptyState>
          )}
          <TablePagination page={pagina} pageSize={itensPorPagina} totalCount={listaPerfis.length} onPageChange={setPagina} onPageSizeChange={(quantidade) => { setItensPorPagina(quantidade); setPagina(1); }} />
        </TableLayout>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-3">
          <Button type="button" variant="ghost" className="w-fit px-2" onClick={() => pedirAcao({ tipo: "lista" })}>← {t("profiles")}</Button>
          <main className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden rounded-xl border border-border bg-card">
          {criando || atual ? (
            <>
              <div className="min-h-0 flex-1 space-y-5 overflow-y-auto p-4 sm:p-6">
                <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border pb-4">
                  <div className="min-w-0 flex-1">
                    {criando ? (
                      <div className="grid gap-5 sm:grid-cols-2">
                        <div className="flex flex-col">
                          <Label htmlFor="profile-name">{t("profileName")} <span className="text-destructive" aria-hidden="true">*</span></Label>
                          <Input id="profile-name" className="mt-2.5" autoFocus required aria-invalid={Boolean(erroNome)} aria-describedby={erroNome ? "profile-name-error" : undefined} maxLength={100} value={nome} onChange={(event) => { setNome(event.target.value); setErroNome(""); }} placeholder={t("profileExample")} />
                          {erroNome && <p id="profile-name-error" role="alert" className="mt-1.5 text-sm text-destructive">{erroNome}</p>}
                        </div>
                        <div className="flex flex-col">
                          <Label htmlFor="profile-description">{t("description")} <span className="text-muted-foreground">({t("optional")})</span></Label>
                          <Input id="profile-description" className="mt-2.5" maxLength={300} value={descricao} onChange={(event) => setDescricao(event.target.value)} />
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-lg font-semibold">{atual?.codigo ? t(`catalog.profile.${atual.codigo}`, { defaultValue: atual.nome }) : atual?.nome}</h2>
                        {atual?.codigo && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{t("protectedBySystem")}</span>}
                        {modoEditor === "visualizar" && <span className="rounded-full bg-secondary px-2.5 py-1 text-xs font-medium">{t("readOnly")}</span>}
                        </div>
                        <p className="mt-1 text-sm text-muted-foreground">{atual?.codigo
                          ? t(`catalog.profile.description.${atual.codigo}`, { defaultValue: atual.descricao || t("noDescription") })
                          : atual?.descricao || t("noDescription")}</p>
                      </>
                    )}
                    {criando && <p className="mt-3 text-sm text-muted-foreground">{t("profileActionsHint")}</p>}
                    {!criando && atual?.codigo && <p className="mt-2 text-sm text-muted-foreground">{t("systemPermissionsHint")}</p>}
                  </div>
                  {!criando && dirty && <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-medium text-amber-900">{t("unsavedChanges")}</span>}
                </div>

                <div className="space-y-2.5">
                  {grupos.map(([codigo, grupo]) => {
                    const ids = grupo.itens.map((item) => item.id);
                    const selecionadas = grupo.itens.filter((item) => marcadas.includes(item.id));
                    const estado = selecionadas.length === 0 ? "unchecked" : selecionadas.length === ids.length ? "checked" : "indeterminate";
                    const aberto = gruposAbertos.has(codigo);
                    return (
                      <PermissionGroup
                        key={codigo}
                        codigo={codigo}
                        nome={grupo.nome}
                        itens={grupo.itens}
                        marcadas={marcadas}
                        estado={estado}
                        aberto={aberto}
                        disabled={modoEditor === "visualizar" || mutacaoAtiva}
                        onToggleOpen={() => alternarGrupo(codigo)}
                        onToggleAll={() => setMarcadas((atuais) => estado === "checked"
                          ? atuais.filter((id) => !ids.includes(id))
                          : [...new Set([...atuais, ...ids])])}
                        onToggle={(id, checked) => setMarcadas((atuais) => checked
                          ? [...new Set([...atuais, id])]
                          : atuais.filter((item) => item !== id))}
                      />
                    );
                  })}
                </div>
              </div>

              <footer className="sticky bottom-0 z-10 flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-border bg-card/95 px-4 py-3 backdrop-blur sm:px-6">
                <div className="min-w-0 flex-1" aria-live="polite">
                  {erroGravacao ? (
                    <p role="alert" className="text-sm text-destructive">
                      {criando && erroGravacao instanceof ApiError && erroGravacao.problem.status === 409
                        ? t("profileConflict")
                        : t("saveDraftError")}
                    </p>
                  ) : dirty ? (
                    <p className="text-sm text-muted-foreground">{criando ? t("newProfileNotCreated") : t("pendingChanges")}</p>
                  ) : modoEditor === "visualizar" ? (
                    <p className="text-sm text-muted-foreground">{t("profileReadOnlyHint")}</p>
                  ) : null}
                </div>
                <div className="flex shrink-0 gap-2">
                  {criando ? (
                    <>
                      <Button type="button" variant="outline" disabled={mutacaoAtiva} onClick={() => pedirAcao({ tipo: "cancelar" })}>{t("cancel")}</Button>
                      <Button type="button" disabled={mutacaoAtiva} onClick={() => { if (!nome.trim()) { setErroNome(t("requiredField")); return; } criar.mutate({ nome: nome.trim(), descricao: descricao.trim(), permissoes: marcadas }); }}>
                        {criar.isPending ? t("creatingProfile") : t("createProfile")}
                      </Button>
                    </>
                  ) : (
                    <Button type="button" disabled={modoEditor !== "editar" || !dirty || mutacaoAtiva} onClick={() => salvar.mutate({ perfilId: selecionado, codigos: marcadas })}>
                      {salvar.isPending ? t("savingChanges") : t("saveChanges")}
                    </Button>
                  )}
                </div>
              </footer>
            </>
          ) : (
            <div className="flex min-h-64 flex-1 items-center justify-center p-8 text-center">
              <div className="max-w-sm">
                <h2 className="font-semibold">{t("selectProfile")}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{t("selectProfileHint")}</p>
                <Button className="mt-4" onClick={() => pedirAcao({ tipo: "novo" })}>{t("newProfile")}</Button>
              </div>
            </div>
          )}
        </main>
        </div>
      )}

      <Dialog open={confirmarMudanca} onOpenChange={(open) => { if (!open) cancelarMudanca(); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{titleDialog}</DialogTitle>
            <p className="text-sm text-muted-foreground">{textoDialog}</p>
          </DialogHeader>
          {erroGravacao && <p role="alert" className="mb-3 text-sm text-destructive">{t("draftNotSaved")}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <Button type="button" variant="outline" disabled={mutacaoAtiva} onClick={cancelarMudanca}>{t("stay")}</Button>
            <Button type="button" variant="outline" disabled={mutacaoAtiva} onClick={() => concluirMudanca(false)}>{labelDescartar}</Button>
            <Button type="button" disabled={mutacaoAtiva || criando && !nome.trim()} onClick={() => concluirMudanca(true)}>{labelSalvarEContinuar}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </section>
  );
}

type PermissionGroupProps = {
  codigo: string;
  nome: string;
  itens: Permissao[];
  marcadas: string[];
  estado: "checked" | "unchecked" | "indeterminate";
  aberto: boolean;
  disabled: boolean;
  onToggleOpen: () => void;
  onToggleAll: () => void;
  onToggle: (id: string, checked: boolean) => void;
};

function PermissionGroup({ codigo, nome, itens, marcadas, estado, aberto, disabled, onToggleOpen, onToggleAll, onToggle }: PermissionGroupProps) {
  const { t } = useTranslation();
  const ref = useRef<HTMLInputElement>(null);
  const panelId = `permissions-${codigo}`;
  const selecionadas = itens.filter((item) => marcadas.includes(item.id));
  useEffect(() => {
    if (ref.current) ref.current.indeterminate = estado === "indeterminate";
  }, [estado]);

  return (
    <section aria-label={t("profilePermissionLabel", { name: nome })} className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex min-w-0 items-center gap-3 px-3 py-3 sm:px-4">
        <button type="button" aria-expanded={aberto} aria-controls={panelId} onClick={onToggleOpen} className="flex min-w-0 flex-1 items-center gap-3 rounded-md text-left outline-none focus-visible:ring-2 focus-visible:ring-primary">
          {aberto ? <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" /> : <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />}
          <span className="min-w-0 flex-1">
            <span className="block font-medium">{nome}</span>
            <span className="block truncate text-xs text-muted-foreground">
              {t("allSelected", { selected: selecionadas.length, total: itens.length })}
              {selecionadas.length > 0 && ` · ${selecionadas.slice(0, 2).map((item) => t(`catalog.permission.${item.id}`, { defaultValue: item.descricao })).join(", ")}${selecionadas.length > 2 ? ` ${t("morePermissions", { count: selecionadas.length - 2 })}` : ""}`}
            </span>
          </span>
        </button>
        <label className="flex shrink-0 cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-xs text-muted-foreground outline-none hover:bg-secondary focus-within:ring-2 focus-within:ring-primary sm:text-sm">
          <input
            ref={ref}
            type="checkbox"
            checked={estado === "checked"}
            disabled={disabled}
            aria-checked={estado === "indeterminate" ? "mixed" : estado === "checked"}
            aria-label={t("selectAllPermissions", { name: nome })}
            onChange={onToggleAll}
            className="size-4 accent-primary"
          />
          <span className="hidden sm:inline">{t("all")}</span>
        </label>
      </div>
      <div id={panelId} hidden={!aberto} className="grid gap-2 border-t border-border bg-muted/20 p-3 sm:grid-cols-2 sm:p-4">
          {itens.map((item) => (
            <label key={item.id} className={`flex min-w-0 items-start gap-3 rounded-lg border border-border bg-card p-3 text-sm ${disabled ? "opacity-70" : "hover:border-primary/40"}`}>
              <input type="checkbox" aria-label={t(`catalog.permission.${item.id}`, { defaultValue: item.descricao })} checked={marcadas.includes(item.id)} disabled={disabled} onChange={(event) => onToggle(item.id, event.target.checked)} className="mt-0.5 size-4 shrink-0 accent-primary focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary" />
              <span className="min-w-0 font-medium leading-5">{t(`catalog.permission.${item.id}`, { defaultValue: item.descricao })}</span>
            </label>
          ))}
      </div>
    </section>
  );
}

function mesmosCodigos(a: string[], b: string[]) {
  const ordenadosA = [...a].sort();
  const ordenadosB = [...b].sort();
  return ordenadosA.length === ordenadosB.length && ordenadosA.every((codigo, index) => codigo === ordenadosB[index]);
}
