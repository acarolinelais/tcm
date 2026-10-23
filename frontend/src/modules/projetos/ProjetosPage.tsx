import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, FileSpreadsheet, Plus, UploadCloud, X } from "lucide-react";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SELECT_EMPTY_VALUE, SelectTrigger } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyStatePanel, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { toast } from "@/shared/lib/toast";
import { timesApi } from "@/modules/times/api/times.api";
import { projetosApi, type Projeto, type StatusProjeto } from "./api/projetos.api";

type ModoCriacao = "manual" | "planilha";
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const extensoesAceitas = ".xls,.xlsx";
const timesVazios: Awaited<ReturnType<typeof timesApi.listar>>["items"] = [];
const isMock = import.meta.env.VITE_USE_MOCK === "true";

export function ProjetosPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar");
  const podeGerenciar = admin || perfil.permissoes.includes("projetos.gerenciar");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const projetos = useQuery({ queryKey: ["projetos", pagina, tamanhoPagina], queryFn: () => projetosApi.listar(pagina, tamanhoPagina) });
  const times = useQuery({ queryKey: ["projetos-times"], queryFn: () => timesApi.listar(1, 100, { ativo: true }), enabled: podeGerenciar });
  const modelos = useQuery({ queryKey: ["projetos-modelos"], queryFn: () => projetosApi.listarModelos(), enabled: podeGerenciar });
  const client = useQueryClient();
  const [criacaoAberta, setCriacaoAberta] = useState(false);
  const [modo, setModo] = useState<ModoCriacao>("planilha");
  const [timeId, setTimeId] = useState("");
  const [app, setApp] = useState("");
  const [oneUi, setOneUi] = useState("");
  const [modelosIds, setModelosIds] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);

  const timesDisponiveis = times.data?.items ?? timesVazios;
  const nomeTime = useMemo(() => Object.fromEntries(timesDisponiveis.map((time) => [time.id, time.nome])), [timesDisponiveis]);
  const queryMutation = useMutation({
    mutationFn: async () => {
      if (modo === "manual") return projetosApi.criar({ time_id: timeId, app: app.trim(), one_ui: oneUi.trim(), modelos_ids: modelosIds });
      if (!arquivo) throw new Error(t("projectFileRequired"));
      const result = await projetosApi.importar(arquivo, timeId, modelosIds, app, oneUi);
      return "projeto" in result ? result.projeto : result;
    },
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ["projetos"] });
      setCriacaoAberta(false);
      limparFormulario();
      toast.success(t("projectCreateSuccess"));
    },
    onError: (error) => toast.error(error instanceof Error ? error.message : t("projectCreateError")),
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProjeto }) => projetosApi.atualizarStatus(id, status),
    onMutate: ({ id, status }) => client.setQueriesData<Awaited<ReturnType<typeof projetosApi.listar>>>({ queryKey: ["projetos"] }, (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, status } : item) }),
    onError: () => toast.error(t("projectStatusError")),
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos"] }),
  });

  function limparFormulario() {
    setTimeId(""); setApp(""); setOneUi(""); setModelosIds([]); setArquivo(null); setModo("planilha");
  }
  function selecionarArquivo(file?: File) {
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) { toast.error(t("projectFileTypeError")); return; }
    setArquivo(file);
  }
  function alternarModelo(id: string) {
    setModelosIds((selected) => selected.includes(id) ? selected.filter((item) => item !== id) : [...selected, id]);
  }
  function statusLabel(status: StatusProjeto) {
    const keys: Record<StatusProjeto, string> = { Created: "projectCreated", "To Do": "toDo", InProgress: "inProgress", Completed: "completed", Canceled: "projectCanceled" };
    return t(keys[status]);
  }

  if (!podeConsultar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  return <section className="flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
    {!criacaoAberta ? <>
      <header className="mb-7 flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-primary">{t("myProjects")}</h1>
        {podeGerenciar && <Button onClick={() => { limparFormulario(); setCriacaoAberta(true); }}><Plus aria-hidden="true" className="size-4" />{t("newProject")}</Button>}
      </header>
      <TableLayout className="overflow-auto">
        {projetos.isLoading ? <div role="status" className="p-8 text-center text-sm text-muted-foreground">{t("loadingProjects")}</div> : projetos.isError ? <div role="alert" className="p-8 text-center text-sm text-destructive">{t("projectsLoadError")}</div> : <Table>
          <colgroup><col style={{ width: "19%" }} /><col style={{ width: "12%" }} /><col style={{ width: "11%" }} /><col style={{ width: "24%" }} /><col style={{ width: "15%" }} /><col style={{ width: "19%" }} /></colgroup>
          <TableHeader><TableRow><TableHead>{t("project")}</TableHead><TableHead>{t("team")}</TableHead><TableHead>{t("app")}</TableHead><TableHead>{t("oneUi")}</TableHead><TableHead>{t("status")}</TableHead><TableHead>{t("createdAt")}</TableHead></TableRow></TableHeader>
          <TableBody>{projetos.data?.items.length ? projetos.data.items.map((project) => <ProjectRow key={project.id} project={project} teamName={nomeTime[project.time_id]} canEdit={podeGerenciar} onStatusChange={(status) => statusMutation.mutate({ id: project.id, status })} statusLabel={statusLabel} />) : <>
            <TableRow aria-hidden="true" className="border-0 hover:bg-transparent"><TableCell colSpan={6} className="h-3 p-0" /></TableRow>
            <TableRow><TableCell colSpan={6} className="p-0"><TableEmptyStatePanel role="status" className="px-5 py-7 sm:px-8">
              <div className="text-center"><h2 className="text-base font-semibold text-foreground">{t("noProjects")}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-5 text-muted-foreground">{t("noProjectsHint")}</p></div>
            </TableEmptyStatePanel></TableCell></TableRow>
          </>}</TableBody>
        </Table>}
        <TablePagination page={pagina} pageSize={tamanhoPagina} totalCount={projetos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />
      </TableLayout>
    </> : <>
      <header className="mb-8 flex shrink-0 items-center gap-4">
        <Button variant="outline" size="icon" aria-label={t("backToProjects")} onClick={() => { setCriacaoAberta(false); limparFormulario(); }}><ArrowLeft aria-hidden="true" className="size-4" /></Button>
        <h1 className="text-2xl font-medium text-primary">{t("newProject")}</h1>
      </header>
      <div className="min-h-0 flex-1 overflow-auto">
        <div className="mx-auto max-w-5xl">
          <div className="mb-7 inline-flex rounded-xl border border-border bg-[#F7F8FA] p-1" role="tablist" aria-label={t("projectCreationMethod")}>
            <button role="tab" aria-selected={modo === "planilha"} type="button" onClick={() => setModo("planilha")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${modo === "planilha" ? "bg-white font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><FileSpreadsheet aria-hidden="true" className="size-4" />{t("importSpreadsheet")}</button>
            <button role="tab" aria-selected={modo === "manual"} type="button" onClick={() => setModo("manual")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${modo === "manual" ? "bg-white font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Plus aria-hidden="true" className="size-4" />{t("createManually")}</button>
          </div>
          {modo === "planilha" ? <section aria-label={t("uploadSpreadsheet")}>
            {!arquivo ? <button type="button" onClick={() => inputArquivo.current?.click()} onDragOver={(event) => { event.preventDefault(); setArrastando(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setArrastando(false); }} onDrop={(event) => { event.preventDefault(); setArrastando(false); selecionarArquivo(event.dataTransfer.files[0]); }} className={`flex min-h-64 w-full flex-col items-center justify-center rounded-2xl border border-dashed px-6 py-10 text-center transition-colors sm:min-h-72 ${arrastando ? "border-primary bg-primary/5" : "border-[#CBD5E1] bg-white hover:border-primary/60 hover:bg-[#FBFCFF]"}`}>
              <UploadCloud aria-hidden="true" className="mb-3 size-6 text-muted-foreground" /><span className="text-base font-medium text-foreground">{t("dragSpreadsheet")}</span><span className="mt-1 text-sm text-muted-foreground">{t("spreadsheetFormats")}</span>
            </button> : <div className="flex items-center gap-4 rounded-2xl border border-border p-5"><FileSpreadsheet aria-hidden="true" className="size-5 shrink-0 text-muted-foreground" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{arquivo.name}</p><p className="mt-1 text-xs text-muted-foreground">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p></div><Button type="button" variant="outline" size="icon" aria-label={t("removeFile")} onClick={() => setArquivo(null)}><X aria-hidden="true" className="size-4" /></Button></div>}
            <input ref={inputArquivo} className="sr-only" type="file" accept={extensoesAceitas} onChange={(event) => { selecionarArquivo(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="mt-3 space-y-1 text-xs leading-5 text-muted-foreground"><p>{t("spreadsheetSizeNotice")}</p><p>{t("projectSpreadsheetTemplateHint")}</p></div>
            {isMock && arquivo && <div className="mt-5 grid gap-5 rounded-2xl border border-border p-5 sm:grid-cols-2"><div><Label htmlFor="project-import-app">{t("app")}</Label><Input id="project-import-app" value={app} onChange={(event) => setApp(event.target.value)} className="mt-2" placeholder={t("appPlaceholder")} /><p className="mt-1.5 text-xs text-muted-foreground">{t("mockSpreadsheetHint")}</p></div><div><Label htmlFor="project-import-oneui">{t("oneUi")}</Label><Input id="project-import-oneui" value={oneUi} onChange={(event) => setOneUi(event.target.value)} className="mt-2" placeholder="9.5" /></div></div>}
          </section> : <section className="rounded-2xl border border-border bg-white p-5 sm:p-7"><div className="mb-6"><h2 className="text-base font-semibold">{t("projectDetails")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("projectNameFormulaHint")}</p></div><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="project-app">{t("app")}</Label><Input id="project-app" value={app} onChange={(event) => setApp(event.target.value)} className="mt-2" placeholder={t("appPlaceholder")} maxLength={80} /></div><div><Label htmlFor="project-oneui">{t("oneUi")}</Label><Input id="project-oneui" value={oneUi} onChange={(event) => setOneUi(event.target.value)} className="mt-2" placeholder="9.5" maxLength={40} /></div></div><p className="mt-3 text-sm text-muted-foreground">{app.trim() && oneUi.trim() ? `${t("projectNamePreview")}: ${app.trim()} ${oneUi.trim()}` : t("projectNamePreviewHint")}</p></section>}

          {(modo === "manual" || arquivo) && <section className="mt-7 border-t border-border pt-6">
            <h2 className="mb-5 text-base font-semibold">{t("projectSetup")}</h2>
            <div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="project-team">{t("team")}</Label><Select value={timeId} onValueChange={(value) => setTimeId(value === SELECT_EMPTY_VALUE ? "" : value)}><SelectTrigger id="project-team" className="mt-2"><SelectValue placeholder={t("selectTeam")} /></SelectTrigger><SelectContent><SelectItem value={SELECT_EMPTY_VALUE}>{t("selectTeam")}</SelectItem>{timesDisponiveis.map((team) => <SelectItem key={team.id} value={team.id}>{team.nome}</SelectItem>)}</SelectContent></Select></div>
              <fieldset><legend className="text-sm font-medium">{t("deviceModels")}</legend><div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-xl border border-input p-2">{(modelos.data?.items ?? []).map((model) => <label key={model.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm hover:bg-secondary"><input type="checkbox" className="size-4 accent-primary" checked={modelosIds.includes(model.id)} onChange={() => alternarModelo(model.id)} /><span>{model.nome}</span></label>)}{modelos.isLoading && <p className="px-2 py-3 text-sm text-muted-foreground">{t("loadingDeviceModels")}</p>}{!modelos.isLoading && !modelos.data?.items.length && <p className="px-2 py-3 text-sm text-muted-foreground">{t("noDeviceModels")}</p>}</div></fieldset>
            </div>
          </section>}
        </div>
      </div>
      <footer className="mt-6 flex shrink-0 items-center justify-end gap-4 border-t border-border pt-5"><div className="flex gap-2"><Button variant="outline" onClick={() => { setCriacaoAberta(false); limparFormulario(); }}>{t("cancel")}</Button><Button disabled={queryMutation.isPending || !timeId || (modo === "manual" ? !app.trim() || !oneUi.trim() : !arquivo || (isMock && (!app.trim() || !oneUi.trim())))} onClick={() => queryMutation.mutate()}>{queryMutation.isPending ? t("saving") : t("createProject")}</Button></div></footer>
    </>}
  </section>;
}

function ProjectRow({ project, teamName, canEdit, onStatusChange, statusLabel }: { project: Projeto; teamName?: string; canEdit: boolean; onStatusChange: (status: StatusProjeto) => void; statusLabel: (status: StatusProjeto) => string }) {
  const { t } = useTranslation();
  return <TableRow><TableCell className="font-medium">{project.nome}</TableCell><TableCell className="text-muted-foreground">{teamName ?? "—"}</TableCell><TableCell className="text-muted-foreground">{project.app}</TableCell><TableCell className="text-muted-foreground">{project.one_ui}</TableCell><TableCell>{canEdit ? <Select value={project.status} onValueChange={(value) => onStatusChange(value as StatusProjeto)}><SelectTrigger aria-label={t("projectStatusFor", { name: project.nome })} className="h-8 w-36 border-0 bg-transparent px-2 hover:bg-secondary"><SelectValue /></SelectTrigger><SelectContent>{statusProjeto.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary">{statusLabel(project.status)}</Badge>}</TableCell><TableCell className="text-muted-foreground">{project.created_at ? new Date(project.created_at).toLocaleDateString() : "—"}</TableCell></TableRow>;
}

