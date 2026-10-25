import { useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Eye, FileSpreadsheet, Pencil, Plus, Trash2, X } from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate, formatNumber } from "@/core/i18n/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SELECT_EMPTY_VALUE, SelectTrigger } from "@/shared/ui/select";
import { Badge } from "@/shared/ui/badge";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableEmptyStatePanel, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { TableRowActions } from "@/shared/ui/table-row-actions";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";
import { ApiError } from "@/shared/api/problem-details";
import { lerPlanilhaProjeto, PlanilhaProjetoError, type PlanilhaProjeto } from "./utils/planilha-projeto";
import { errosDaApi, type ErroPlanilhaExibivel } from "./utils/formatar-erro-planilha";
import { ErrosPlanilha } from "./components/ErrosPlanilha";
import { PreviaPlanilha } from "./components/PreviaPlanilha";
import { ExcelIcon, UploadFileIcon } from "./components/icones-importacao";
import { timesApi } from "@/modules/times/api/times.api";
import { modelosDispositivoApi, projetosApi, type Projeto, type StatusProjeto } from "./api/projetos.api";

type ModoCriacao = "manual" | "planilha";
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const extensoesAceitas = ".xls,.xlsx";
const tamanhoMaximoArquivo = 25 * 1024 * 1024;
const timesVazios: Awaited<ReturnType<typeof timesApi.listar>>["items"] = [];

export function ProjetosPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciar = admin || perfil.permissoes.includes("projetos.gerenciar");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosProjeto, setFiltrosProjeto] = useState({ nome: "", time: "", app: "", oneUi: "", status: "", createdAt: "" });
  const projetos = useQuery({ queryKey: ["projetos", pagina, tamanhoPagina], queryFn: () => projetosApi.listar(pagina, tamanhoPagina) });
  const times = useQuery({ queryKey: ["projetos-times"], queryFn: () => timesApi.listar(1, 100, { ativo: true }), enabled: podeGerenciar });
  const modelos = useQuery({ queryKey: ["modelos-dispositivo", "opcoes"], queryFn: () => modelosDispositivoApi.listarOpcoes(), enabled: podeGerenciar });
  const client = useQueryClient();
  const [criacaoAberta, setCriacaoAberta] = useState(false);
  const [modo, setModo] = useState<ModoCriacao>("planilha");
  const [timeId, setTimeId] = useState("");
  const [app, setApp] = useState("");
  const [oneUi, setOneUi] = useState("");
  const [modelosIds, setModelosIds] = useState<string[]>([]);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<PlanilhaProjeto | null>(null);
  const [lendoArquivo, setLendoArquivo] = useState(false);
  const [errosImportacao, setErrosImportacao] = useState<ErroPlanilhaExibivel[]>([]);
  const [totalLinhasComErro, setTotalLinhasComErro] = useState<number | undefined>();
  const [arrastando, setArrastando] = useState(false);
  const [projetoEditando, setProjetoEditando] = useState<Projeto | null>(null);
  const [projetoExcluindo, setProjetoExcluindo] = useState<Projeto | null>(null);
  const [edicaoApp, setEdicaoApp] = useState("");
  const [edicaoOneUi, setEdicaoOneUi] = useState("");
  const inputArquivo = useRef<HTMLInputElement>(null);

  // Com problemas na planilha, o envio só confere: o servidor devolve também os problemas de
  // responsável e backup, que a prévia não consegue verificar, e não cria nada (CA-26, CA-27).
  const conferirPlanilha = modo === "planilha" && errosImportacao.length > 0;
  const timesDisponiveis = times.data?.items ?? timesVazios;
  const opcoesModelos = useMemo(() => (modelos.data?.items ?? []).map((model) => ({ value: model.id, label: model.nome })), [modelos.data?.items]);
  const nomeTime = useMemo(() => Object.fromEntries([...perfil.times, ...timesDisponiveis].map((time) => [time.id, time.nome])), [perfil.times, timesDisponiveis]);
  const projetosFiltrados = (projetos.data?.items ?? []).filter((project) => {
    const createdAt = project.created_at ? formatDate(project.created_at) : "";
    return project.nome.toLocaleLowerCase().includes(filtrosProjeto.nome.toLocaleLowerCase())
      && (nomeTime[project.time_id] ?? project.time_id).toLocaleLowerCase().includes(filtrosProjeto.time.toLocaleLowerCase())
      && project.app.toLocaleLowerCase().includes(filtrosProjeto.app.toLocaleLowerCase())
      && project.one_ui.toLocaleLowerCase().includes(filtrosProjeto.oneUi.toLocaleLowerCase())
      && (!filtrosProjeto.status || project.status === filtrosProjeto.status)
      && createdAt.toLocaleLowerCase().includes(filtrosProjeto.createdAt.toLocaleLowerCase());
  });
  const alterarFiltroProjeto = (campo: keyof typeof filtrosProjeto, valor: string) => {
    setPagina(1);
    setFiltrosProjeto((atual) => ({ ...atual, [campo]: valor }));
  };
  const queryMutation = useMutation({
    mutationFn: async () => {
      if (modo === "manual") return { projeto: await projetosApi.criar({ time_id: timeId, app: app.trim(), one_ui: oneUi.trim(), modelos_ids: modelosIds }), quantidade_casos: 0 };
      if (!arquivo) throw new Error(t("projectFileRequired"));
      const result = await projetosApi.importar(arquivo, timeId, modelosIds, app, oneUi);
      return "projeto" in result ? result : { projeto: result, quantidade_casos: 0 };
    },
    onSuccess: async (result) => {
      await client.invalidateQueries({ queryKey: ["projetos"] });
      setCriacaoAberta(false);
      limparFormulario();
      toast.success(modo === "planilha"
        ? t("projectImportSuccess", { name: result.projeto.nome, count: result.quantidade_casos, countLabel: formatNumber(result.quantidade_casos) })
        : t("projectCreateSuccess"));
    },
    onError: (error) => {
      if (modo === "planilha" && error instanceof ApiError && error.problem.errors?.length) {
        setErrosImportacao(errosDaApi(error.problem));
        setTotalLinhasComErro(error.problem.total_linhas);
        toast.error(t("projectImportValidationError"));
        return;
      }
      toast.error(error instanceof Error ? error.message : t("projectCreateError"));
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProjeto }) => projetosApi.atualizarStatus(id, status),
    onMutate: ({ id, status }) => client.setQueriesData<Awaited<ReturnType<typeof projetosApi.listar>>>({ queryKey: ["projetos"] }, (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, status } : item) }),
    onError: () => toast.error(t("projectStatusError")),
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos"] }),
  });
  const editarProjeto = useMutation({
    mutationFn: () => projetosApi.atualizar(projetoEditando!.id, { app: edicaoApp.trim(), one_ui: edicaoOneUi.trim() }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setProjetoEditando(null); toast.success(t("projectUpdateSuccess")); },
    onError: () => toast.error(t("projectUpdateError")),
  });
  const excluirProjeto = useMutation({
    mutationFn: () => projetosApi.excluir(projetoExcluindo!.id),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setProjetoExcluindo(null); toast.success(t("projectDeleteSuccess")); },
    onError: () => toast.error(t("projectDeleteError")),
  });

  function limparFormulario() {
    setTimeId(""); setApp(""); setOneUi(""); setModelosIds([]); setArquivo(null); setPrevia(null); setLendoArquivo(false); setErrosImportacao([]); setTotalLinhasComErro(undefined); setModo("planilha");
  }
  async function selecionarArquivo(file?: File) {
    if (!file) return;
    if (!/\.xlsx?$/i.test(file.name)) { toast.error(t("projectFileTypeError")); return; }
    if (file.size > tamanhoMaximoArquivo) { toast.error(t("projectFileSizeError")); return; }
    setArquivo(file);
    setApp("");
    setOneUi("");
    setPrevia(null);
    setErrosImportacao([]);
    setTotalLinhasComErro(undefined);
    setLendoArquivo(true);
    try {
      const parsed = await lerPlanilhaProjeto(file);
      setPrevia(parsed);
      setApp(parsed.app);
      setOneUi(parsed.one_ui);
    } catch (error) {
      if (error instanceof PlanilhaProjetoError) {
        setErrosImportacao(error.errors);
        setTotalLinhasComErro(error.totalLinhas);
      } else setErrosImportacao([{ codigo: null, mensagem: t("projectFileReadError"), linha: null, coluna: null, valor: null }]);
    } finally {
      setLendoArquivo(false);
    }
  }
  async function downloadTemplate() {
    const XLSX = await import("@e965/xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_0001", "Low", "A", "New", "9.5", "nome ou e-mail do membro do time", "nome ou e-mail do backup"],
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");
    const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "array" });
    const url = URL.createObjectURL(new Blob([bytes], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "template-projeto-test-cases.xlsx";
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
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
          <colgroup><col style={{ width: "18%" }} /><col style={{ width: "12%" }} /><col style={{ width: "10%" }} /><col style={{ width: "18%" }} /><col style={{ width: "14%" }} /><col style={{ width: "18%" }} /><col style={{ width: "10%" }} /></colgroup>
          <TableHeader><TableRow>
            <TableHead><TableColumnFilter label={t("project")} value={filtrosProjeto.nome} onChange={(value) => alterarFiltroProjeto("nome", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("team")} value={filtrosProjeto.time} onChange={(value) => alterarFiltroProjeto("time", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("app")} value={filtrosProjeto.app} onChange={(value) => alterarFiltroProjeto("app", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("oneUi")} value={filtrosProjeto.oneUi} onChange={(value) => alterarFiltroProjeto("oneUi", value)} /></TableHead>
            <TableHead><TableColumnFilter label={t("status")} value={filtrosProjeto.status} onChange={(value) => alterarFiltroProjeto("status", value)} options={[{ value: "", label: t("all") }, ...statusProjeto.map((status) => ({ value: status, label: statusLabel(status) }))]} /></TableHead>
            <TableHead><TableColumnFilter label={t("createdAt")} value={filtrosProjeto.createdAt} onChange={(value) => alterarFiltroProjeto("createdAt", value)} /></TableHead>
            <TableHead className="text-right">{t("actions")}</TableHead>
          </TableRow></TableHeader>
          <TableBody>{projetosFiltrados.length ? projetosFiltrados.map((project) => <ProjectRow key={project.id} project={project} teamName={nomeTime[project.time_id]} canEdit={podeGerenciar} onView={() => navigate(`/projetos/${project.id}`)} onEdit={() => { setProjetoEditando(project); setEdicaoApp(project.app); setEdicaoOneUi(project.one_ui); }} onDelete={() => setProjetoExcluindo(project)} onStatusChange={(status) => statusMutation.mutate({ id: project.id, status })} statusLabel={statusLabel} />) : <>
            <TableRow aria-hidden="true" className="border-0 hover:bg-transparent"><TableCell colSpan={7} className="h-3 p-0" /></TableRow>
            <TableRow><TableCell colSpan={7} className="p-0"><TableEmptyStatePanel role="status" className="px-5 py-7 sm:px-8">
              <div className="text-center"><h2 className="text-base font-semibold text-foreground">{projetos.data?.items.length ? t("noProjectResults", { defaultValue: "Nenhum projeto corresponde aos filtros." }) : t("noProjects")}</h2><p className="mx-auto mt-1 max-w-md text-sm leading-5 text-muted-foreground">{projetos.data?.items.length ? t("adjustFilters", { defaultValue: "Ajuste ou limpe os filtros para ver os resultados." }) : t("noProjectsHint")}</p></div>
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
      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        {/* min-h-full + flex: sem arquivo, a área de soltar ocupa o espaço livre em vez de criar rolagem. */}
        <div className="mx-auto flex min-h-full max-w-[52.5rem] flex-col">
          <div className="mb-4 inline-flex self-start rounded-xl border border-border bg-[#F7F8FA] p-1" role="tablist" aria-label={t("projectCreationMethod")}>
            <button role="tab" aria-selected={modo === "planilha"} type="button" onClick={() => setModo("planilha")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${modo === "planilha" ? "bg-white font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><FileSpreadsheet aria-hidden="true" className="size-4" />{t("importSpreadsheet")}</button>
            <button role="tab" aria-selected={modo === "manual"} type="button" onClick={() => setModo("manual")} className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition-colors ${modo === "manual" ? "bg-white font-medium text-primary shadow-sm" : "text-muted-foreground hover:text-foreground"}`}><Plus aria-hidden="true" className="size-4" />{t("createManually")}</button>
          </div>
          {modo === "planilha" ? <section aria-label={t("uploadSpreadsheet")} className="flex flex-1 flex-col">
            <h2 className="mb-3 text-lg font-medium leading-6 text-[#454442]">{t("uploadSpreadsheet")}</h2>
            {!arquivo ? <div onDragOver={(event) => { event.preventDefault(); setArrastando(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setArrastando(false); }} onDrop={(event) => { event.preventDefault(); setArrastando(false); void selecionarArquivo(event.dataTransfer.files[0]); }} data-arrastando={arrastando} className={`dropzone-tracejada flex max-h-[28rem] min-h-36 w-full flex-1 flex-col items-center justify-center px-6 py-8 text-center transition-colors ${arrastando ? "bg-primary/5" : "bg-white"}`}>
              <UploadFileIcon aria-hidden="true" className="mb-4 h-11 w-9 text-[#454442]" />
              <p className="text-base font-medium text-[#454442]">{t("dragSpreadsheet")} <button type="button" onClick={() => inputArquivo.current?.click()} className="font-medium text-primary underline underline-offset-4 hover:text-primary/80">{t("chooseSpreadsheet")}</button></p>
            </div> : <div className="flex items-center gap-4 rounded-[20px] border border-[#DDDDDD] p-5"><ExcelIcon aria-hidden="true" className="size-7 shrink-0" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{arquivo.name}</p><p className="mt-1 text-xs text-muted-foreground">{(arquivo.size / 1024 / 1024).toFixed(2)} MB</p></div><Button type="button" variant="outline" size="icon" aria-label={t("removeFile")} onClick={() => { setArquivo(null); setPrevia(null); setErrosImportacao([]); setTotalLinhasComErro(undefined); setApp(""); setOneUi(""); }}><X aria-hidden="true" className="size-4" /></Button></div>}
            <input ref={inputArquivo} className="sr-only" type="file" accept={extensoesAceitas} onChange={(event) => { void selecionarArquivo(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="mt-2.5 flex justify-between gap-4 px-2 text-sm leading-5 text-[#777777]"><p>{t("spreadsheetFormats")}</p><p className="shrink-0">{t("spreadsheetMaxSize")}</p></div>
            <div className="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[20px] bg-[#F3F5F7] px-5 py-5 sm:px-8">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-base font-medium leading-6 text-[#454442]"><ExcelIcon aria-hidden="true" className="size-6 shrink-0" />{t("spreadsheetTemplateTitle")}</p>
                <p className="mt-1.5 max-w-[28rem] text-sm leading-5 text-[#777777]">{t("spreadsheetTemplateDescription")}</p>
              </div>
              <Button type="button" variant="outline" onClick={downloadTemplate} className="h-9 rounded-[10px] border-[#DDDDDD] bg-white px-4 text-sm font-medium text-[#454442]">{t("downloadTemplate")}</Button>
            </div>
            {lendoArquivo && <p role="status" className="mt-4 text-sm text-muted-foreground">{t("readingSpreadsheet")}</p>}
            {errosImportacao.length > 0 && <ErrosPlanilha erros={errosImportacao} totalLinhas={totalLinhasComErro} />}
            {previa && <PreviaPlanilha previa={previa} />}
          </section> : <section className="rounded-2xl border border-border bg-white p-5 sm:p-7"><div className="mb-6"><h2 className="text-base font-semibold">{t("projectDetails")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("projectNameFormulaHint")}</p></div><div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="project-app">{t("app")}</Label><Input id="project-app" value={app} onChange={(event) => setApp(event.target.value)} className="mt-2" placeholder={t("appPlaceholder")} maxLength={80} /></div><div><Label htmlFor="project-oneui">{t("oneUi")}</Label><Input id="project-oneui" value={oneUi} onChange={(event) => setOneUi(event.target.value)} className="mt-2" placeholder="9.5" maxLength={40} /></div></div><p className="mt-3 text-sm text-muted-foreground">{app.trim() && oneUi.trim() ? `${t("projectNamePreview")}: ${app.trim()} ${oneUi.trim()}` : t("projectNamePreviewHint")}</p></section>}

          {(modo === "manual" || arquivo) && <section className="mt-7 border-t border-border pt-6">
            <h2 className="mb-5 text-base font-semibold">{t("projectSetup")}</h2>
            <div className="grid gap-5 sm:grid-cols-2"><div><Label htmlFor="project-team">{t("team")}</Label><Select value={timeId} onValueChange={(value) => setTimeId(value === SELECT_EMPTY_VALUE ? "" : value)}><SelectTrigger id="project-team" className="mt-2"><SelectValue placeholder={t("selectTeam")} /></SelectTrigger><SelectContent><SelectItem value={SELECT_EMPTY_VALUE}>{t("selectTeam")}</SelectItem>{timesDisponiveis.map((team) => <SelectItem key={team.id} value={team.id}>{team.nome}</SelectItem>)}</SelectContent></Select></div>
              <MultiSelectCombobox
                label={t("deviceModels")}
                placeholder={t("selectDeviceModels", { defaultValue: "Selecionar modelos" })}
                options={opcoesModelos}
                value={modelosIds}
                onValueChange={setModelosIds}
                emptyLabel={modelos.isLoading ? t("loadingDeviceModels") : t("noDeviceModels")}
                removeLabel={(name) => t("removeSelectedModel", { defaultValue: "Remover {{name}}", name })}
              />
            </div>
          </section>}
        </div>
      </div>
      <footer className="mt-6 flex shrink-0 items-center justify-end gap-4 border-t border-border pt-5"><div className="flex gap-2"><Button variant="outline" onClick={() => { setCriacaoAberta(false); limparFormulario(); }}>{t("cancel")}</Button><Button disabled={queryMutation.isPending || lendoArquivo || !timeId || (modo === "manual" ? !app.trim() || !oneUi.trim() : !arquivo)} onClick={() => queryMutation.mutate()}>{queryMutation.isPending ? t("saving") : conferirPlanilha ? t("checkSpreadsheet") : t("createProject")}</Button></div></footer>
    </>}
    <Dialog open={Boolean(projetoEditando)} onOpenChange={(open) => { if (!open && !editarProjeto.isPending) setProjetoEditando(null); }}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{t("editProjectTitle", { name: projetoEditando?.nome ?? "" })}</DrawerTitle></DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); editarProjeto.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div><Label htmlFor="edit-project-app">{t("app")}</Label><Input id="edit-project-app" className="mt-2" value={edicaoApp} onChange={(event) => setEdicaoApp(event.target.value)} maxLength={100} required /></div>
            <div><Label htmlFor="edit-project-oneui">{t("oneUi")}</Label><Input id="edit-project-oneui" className="mt-2" value={edicaoOneUi} onChange={(event) => setEdicaoOneUi(event.target.value)} maxLength={40} required /></div>
            <p className="text-sm text-muted-foreground">{t("projectNamePreview")}: {edicaoApp.trim() && edicaoOneUi.trim() ? `${edicaoApp.trim()} ${edicaoOneUi.trim()}` : "—"}</p>
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-7 py-5"><DrawerClose asChild><Button type="button" variant="outline" disabled={editarProjeto.isPending}>{t("cancel")}</Button></DrawerClose><Button type="submit" disabled={!edicaoApp.trim() || !edicaoOneUi.trim() || editarProjeto.isPending}>{editarProjeto.isPending ? t("saving") : t("save")}</Button></div>
        </form>
      </DrawerContent>
    </Dialog>
    <ConfirmDialog open={Boolean(projetoExcluindo)} onOpenChange={(open) => { if (!open && !excluirProjeto.isPending) setProjetoExcluindo(null); }} title={t("deleteProjectTitle")} description={t("deleteProjectDescription", { name: projetoExcluindo?.nome ?? "" })} confirmLabel={t("deleteProject")} variant="destructive" isPending={excluirProjeto.isPending} onConfirm={() => excluirProjeto.mutate()} />
  </section>;
}

function ProjectRow({ project, teamName, canEdit, onView, onEdit, onDelete, onStatusChange, statusLabel }: { project: Projeto; teamName?: string; canEdit: boolean; onView: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: StatusProjeto) => void; statusLabel: (status: StatusProjeto) => string }) {
  const { t } = useTranslation();
  return <TableRow><TableCell className="font-medium"><Link to={`/projetos/${project.id}`} className="text-left hover:text-primary">{project.nome}</Link></TableCell><TableCell className="text-muted-foreground">{teamName ?? "—"}</TableCell><TableCell className="text-muted-foreground">{project.app}</TableCell><TableCell className="text-muted-foreground">{project.one_ui}</TableCell><TableCell>{canEdit ? <Select value={project.status} onValueChange={(value) => onStatusChange(value as StatusProjeto)}><SelectTrigger aria-label={t("projectStatusFor", { name: project.nome })} className="h-8 w-36 border-0 bg-transparent px-2 hover:bg-secondary"><SelectValue /></SelectTrigger><SelectContent>{statusProjeto.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select> : <Badge variant="secondary">{statusLabel(project.status)}</Badge>}</TableCell><TableCell className="text-muted-foreground">{project.created_at ? formatDate(project.created_at) : "—"}</TableCell><TableCell className="text-right"><TableRowActions label={project.nome} actions={[{ label: t("viewProject"), icon: Eye, onSelect: onView }, ...(canEdit ? [{ label: t("editProject"), icon: Pencil, onSelect: onEdit }, { label: t("deleteProject"), icon: Trash2, onSelect: onDelete, destructive: true }] : [])]} /></TableCell></TableRow>;
}

