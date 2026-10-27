import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, FolderKanban, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Button as HeroButton, Tooltip } from "@heroui/react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate, formatNumber } from "@/core/i18n/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SELECT_EMPTY_VALUE, SelectTrigger } from "@/shared/ui/select";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { AlertConfirm } from "@/shared/ui/alert-confirm";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { EyeIcon } from "@/shared/ui/figma-icons";
import { InlineSelect } from "@/shared/ui/inline-select";
import { RowActions, type RowAction } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TagChip } from "@/shared/ui/tag-chip";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { formatarDiaIso } from "@/shared/lib/utils";
import { ApiError } from "@/shared/api/problem-details";
import { errosDaApi } from "../utils/formatar-erro-planilha";
import { UploadPlanilha } from "../components/importacao/UploadPlanilha";
import { useLeituraPlanilha } from "../hooks/useLeituraPlanilha";
import { statusProjetoTons } from "../components/status/status-projeto-estilos";
import { timesApi } from "@/modules/times/api/times.api";
import { modelosDispositivoApi, projetosApi, type Projeto, type StatusProjeto } from "../api/projetos.api";

type ModoCriacao = "manual" | "planilha";
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const timesVazios: Awaited<ReturnType<typeof timesApi.listar>>["items"] = [];
const FILTROS_VAZIOS = { nome: "", time: "", app: "", oneUi: "", modelo: "", status: "", createdAt: "" };

export function ProjetosPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciar = admin || perfil.permissoes.includes("projetos.gerenciar");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina, setTamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosProjeto, setFiltrosProjeto] = useState(FILTROS_VAZIOS);
  const projetos = useQuery({ queryKey: ["projetos", pagina, tamanhoPagina], queryFn: () => projetosApi.listar(pagina, tamanhoPagina) });
  const times = useQuery({ queryKey: ["projetos-times"], queryFn: () => timesApi.listar(1, 100, { ativo: true }), enabled: podeGerenciar });
  const modelos = useQuery({ queryKey: ["modelos-dispositivo", "opcoes"], queryFn: () => modelosDispositivoApi.listarOpcoes(), enabled: podeGerenciar });
  const client = useQueryClient();
  const [criacaoAberta, setCriacaoAberta] = useState(false);
  const [modo, setModo] = useState<ModoCriacao>("planilha");
  const [timeId, setTimeId] = useState("");
  const [app, setApp] = useState("");
  const [oneUi, setOneUi] = useState("");
  const [nomeProjeto, setNomeProjeto] = useState("");
  const [modelosIds, setModelosIds] = useState<string[]>([]);
  const leitura = useLeituraPlanilha(t("projectFileReadError"));
  const [projetoEditando, setProjetoEditando] = useState<Projeto | null>(null);
  const [projetoExcluindo, setProjetoExcluindo] = useState<Projeto | null>(null);
  const [edicaoNome, setEdicaoNome] = useState("");
  const [edicaoApp, setEdicaoApp] = useState("");
  const [edicaoOneUi, setEdicaoOneUi] = useState("");
  const [edicaoTimeId, setEdicaoTimeId] = useState("");
  const [edicaoModelosIds, setEdicaoModelosIds] = useState<string[]>([]);

  // Com problemas na planilha, o envio só confere: o servidor devolve também os problemas de
  // responsável e backup, que a prévia não consegue verificar, e não cria nada (CA-26, CA-27).
  const conferirPlanilha = modo === "planilha" && leitura.erros.length > 0;
  const timesDisponiveis = times.data?.items ?? timesVazios;
  const opcoesModelos = useMemo(() => (modelos.data?.items ?? []).map((model) => ({ value: model.id, label: model.nome, description: model.descricao })), [modelos.data?.items]);
  const opcoesFiltroModelos = useMemo(() => [...new Set((projetos.data?.items ?? []).flatMap((project) => project.modelos_dispositivo ?? []))].sort((a, b) => a.localeCompare(b)).map((nome) => ({ value: nome, label: nome })), [projetos.data?.items]);
  const nomeTime = useMemo(() => Object.fromEntries([...perfil.times, ...timesDisponiveis].map((time) => [time.id, time.nome])), [perfil.times, timesDisponiveis]);
  const projetosFiltrados = (projetos.isError ? [] : projetos.data?.items ?? []).filter((project) => {
    // Filtro de data pelo dia (AAAA-MM-DD) no fuso do navegador, nunca pelo texto formatado.
    const criadoEm = project.created_at ? formatarDiaIso(new Date(project.created_at)) : "";
    return project.nome.toLocaleLowerCase().includes(filtrosProjeto.nome.toLocaleLowerCase())
      && (nomeTime[project.time_id] ?? project.time_id).toLocaleLowerCase().includes(filtrosProjeto.time.toLocaleLowerCase())
      && project.app.toLocaleLowerCase().includes(filtrosProjeto.app.toLocaleLowerCase())
      && project.one_ui.toLocaleLowerCase().includes(filtrosProjeto.oneUi.toLocaleLowerCase())
      && (!filtrosProjeto.modelo || (project.modelos_dispositivo ?? []).includes(filtrosProjeto.modelo))
      && (!filtrosProjeto.status || project.status === filtrosProjeto.status)
      && (!filtrosProjeto.createdAt || criadoEm === filtrosProjeto.createdAt);
  });
  const alterarFiltroProjeto = (campo: keyof typeof filtrosProjeto, valor: string) => {
    setPagina(1);
    setFiltrosProjeto((atual) => ({ ...atual, [campo]: valor }));
  };
  const queryMutation = useMutation({
    mutationFn: async () => {
      if (modo === "manual") return { projeto: await projetosApi.criar({ time_id: timeId, nome: nomeProjeto.trim() || `${app.trim()} ${oneUi.trim()}`, app: app.trim(), one_ui: oneUi.trim(), modelos_ids: modelosIds }), quantidade_casos: 0 };
      if (!leitura.arquivo) throw new Error(t("projectFileRequired"));
      const result = await projetosApi.importar(leitura.arquivo, timeId, modelosIds, leitura.previa?.app ?? "", leitura.previa?.one_ui ?? "");
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
        leitura.definirErrosDoServidor(errosDaApi(error.problem), error.problem.total_linhas);
        toast.error(t("projectImportValidationError"));
        return;
      }
      toast.error(error instanceof Error ? error.message : t("projectCreateError"));
    },
  });
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProjeto }) => projetosApi.atualizarStatus(id, status),
    // Só a lista desta página: o prefixo ["projetos"] também casa com o detalhe do projeto, que não tem `items`.
    onMutate: ({ id, status }) => client.setQueryData<Awaited<ReturnType<typeof projetosApi.listar>>>(["projetos", pagina, tamanhoPagina], (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, status } : item) }),
    onError: () => toast.error(t("projectStatusError")),
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos"] }),
  });
  const editarProjeto = useMutation({
    mutationFn: () => projetosApi.atualizar(projetoEditando!.id, { nome: edicaoNome.trim(), app: edicaoApp.trim(), one_ui: edicaoOneUi.trim(), time_id: edicaoTimeId, modelos_ids: edicaoModelosIds }),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setProjetoEditando(null); toast.success(t("projectUpdateSuccess")); },
    onError: () => toast.error(t("projectUpdateError")),
  });
  const excluirProjeto = useMutation({
    mutationFn: () => projetosApi.excluir(projetoExcluindo!.id),
    onSuccess: async () => { await client.invalidateQueries({ queryKey: ["projetos"] }); setProjetoExcluindo(null); toast.success(t("projectDeleteSuccess")); },
    onError: () => toast.error(t("projectDeleteError")),
  });

  function limparFormulario() {
    leitura.limpar();
    setTimeId(""); setApp(""); setOneUi(""); setNomeProjeto(""); setModelosIds([]); setModo("planilha");
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
  function projectSetup(visivel: boolean, sufixo: "import" | "manual") {
    if (!visivel) return null;
    return <section className="mt-7 border-t border-border pt-6">
      <h2 className="mb-5 text-base font-semibold">{t("projectSetup")}</h2>
      <div className="grid gap-5 sm:grid-cols-2">
        <div><Label htmlFor={`project-team-${sufixo}`}>{t("team")}</Label><Select value={timeId} onValueChange={(value) => setTimeId(value === SELECT_EMPTY_VALUE ? "" : value)}><SelectTrigger id={`project-team-${sufixo}`} className="mt-2"><SelectValue placeholder={t("selectTeam")} /></SelectTrigger><SelectContent><SelectItem value={SELECT_EMPTY_VALUE}>{t("selectTeam")}</SelectItem>{timesDisponiveis.map((team) => <SelectItem key={team.id} value={team.id}>{team.nome}</SelectItem>)}</SelectContent></Select></div>
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
    </section>;
  }

  if (!podeConsultar) return <p role="alert" className="p-6 text-sm">{t("permissionDenied")}</p>;

  const opcoesStatus = statusProjeto.map((status) => ({ value: status, label: statusLabel(status) }));
  const primeiraDaPagina = (pagina - 1) * tamanhoPagina;
  // O filtro é local: o mesmo projeto muda de posição sem mudar de identidade, então o número depende da ordem.
  const ordemDosProjetos = projetosFiltrados.map((project) => project.id).join();
  const abrirEdicao = (project: Projeto) => {
    setProjetoEditando(project); setEdicaoNome(project.nome); setEdicaoApp(project.app); setEdicaoOneUi(project.one_ui); setEdicaoTimeId(project.time_id); setEdicaoModelosIds(project.modelos_ids ?? []);
  };
  const acoesDoProjeto = (project: Projeto): RowAction[] => [
    { label: t("viewProject"), icon: <EyeIcon />, onPress: () => navigate(`/projetos/${project.id}`) },
    ...(podeGerenciar ? [
      { label: t("editProject"), icon: <Pencil {...rowActionIconProps} />, onPress: () => abrirEdicao(project) },
      { label: t("deleteProject"), icon: <Trash2 {...rowActionIconProps} />, onPress: () => setProjetoExcluindo(project), destructive: true },
    ] : []),
  ];
  const colunas: DataTableColumn<Projeto>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (project) => String(primeiraDaPagina + projetosFiltrados.indexOf(project) + 1).padStart(2, "0") },
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("project")} value={filtrosProjeto.nome} onChange={(value) => alterarFiltroProjeto("nome", value)} />, cell: (project) => <Link to={`/projetos/${project.id}`} className="hover:text-accent focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{project.nome}</Link> },
    { id: "time", header: <DataTableFilter label={t("team")} value={filtrosProjeto.time} onChange={(value) => alterarFiltroProjeto("time", value)} />, cell: (project) => nomeTime[project.time_id] ?? "—" },
    { id: "app", header: <DataTableFilter label={t("app")} value={filtrosProjeto.app} onChange={(value) => alterarFiltroProjeto("app", value)} />, cell: (project) => project.app },
    { id: "oneUi", header: <DataTableFilter label={t("oneUi")} value={filtrosProjeto.oneUi} onChange={(value) => alterarFiltroProjeto("oneUi", value)} />, cell: (project) => project.one_ui },
    { id: "modelos", header: <DataTableFilter label={t("deviceModels")} value={filtrosProjeto.modelo} onChange={(value) => alterarFiltroProjeto("modelo", value)} options={comOpcaoTodos(t("all"), opcoesFiltroModelos)} searchable />, cell: (project) => <ContagemModelos modelos={project.modelos_dispositivo ?? []} rotulo={t("deviceModels")} /> },
    {
      id: "status",
      header: <DataTableFilter label={t("status")} value={filtrosProjeto.status} onChange={(value) => alterarFiltroProjeto("status", value)} options={comOpcaoTodos(t("all"), opcoesStatus)} />,
      cell: (project) => {
        const etiqueta = <TagChip tom={statusProjetoTons[project.status]}>{statusLabel(project.status)}</TagChip>;
        return podeGerenciar
          ? <InlineSelect aria-label={t("projectStatusFor", { name: project.nome })} value={project.status} options={opcoesStatus} onChange={(value) => statusMutation.mutate({ id: project.id, status: value as StatusProjeto })}>{etiqueta}</InlineSelect>
          : etiqueta;
      },
    },
    { id: "criadoEm", header: <DataTableFilter label={t("createdAt")} value={filtrosProjeto.createdAt} onChange={(value) => alterarFiltroProjeto("createdAt", value)} type="date" />, cell: (project) => project.created_at ? formatDate(project.created_at) : "—" },
    { id: "acoes", header: t("actions"), className: "w-px whitespace-nowrap", cell: (project) => <RowActions identificador={project.nome} actions={acoesDoProjeto(project)} /> },
  ];
  const estadoProjetos = estadoDaTabela({
    isLoading: projetos.isLoading,
    isError: projetos.isError,
    isEmpty: !projetosFiltrados.length,
    hasFilters: Object.values(filtrosProjeto).some(Boolean),
    onClearFilters: () => { setPagina(1); setFiltrosProjeto(FILTROS_VAZIOS); },
    loadingLabel: t("loadingProjects"),
    errorLabel: t("projectsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <FolderKanban aria-hidden="true" className="size-5" />, title: t("noProjects"), hint: t("noProjectsHint") },
    filtered: { title: t("noResults"), hint: t("noProjectResults") },
  });

  return <section className={criacaoAberta ? "relative flex h-full min-h-0 flex-col" : "flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10"}>
    {!criacaoAberta ? <>
      <header className="mb-7 flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-foreground">{t("myProjects")}</h1>
        {podeGerenciar && <HeroButton variant="primary" size="sm" className="rounded-full px-4" onPress={() => { limparFormulario(); setCriacaoAberta(true); }}><Plus aria-hidden="true" className="size-4" />{t("newProject")}</HeroButton>}
      </header>
      <DataTable
        aria-label={t("myProjects")}
        columns={colunas}
        items={projetosFiltrados}
        state={estadoProjetos}
        pagination={<DataTablePagination page={pagina} pageSize={tamanhoPagina} totalCount={projetos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />}
        rowDependencies={[t, nomeTime, podeGerenciar, primeiraDaPagina, ordemDosProjetos]}
      />
    </> : <>
      <div className="absolute -top-11 left-0 z-10">
        <Button variant="ghost" className="h-auto gap-1 px-1 py-1 text-base font-normal text-foreground hover:text-foreground" onClick={() => { setCriacaoAberta(false); limparFormulario(); }}><ChevronLeft aria-hidden="true" className="size-4" />{t("projectsNav")}</Button>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10">
      <div className="thin-scroll min-h-0 flex-1 overflow-auto">
        <div className="flex min-h-full w-full flex-col">
          <header className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-medium text-foreground">{t("newProject")}</h1>
            <div className="relative grid w-52 shrink-0 grid-cols-2 rounded-xl bg-[#F7F8FA] p-1" role="tablist" aria-label={t("projectCreationMethod")}>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-1 left-1 right-1 grid grid-cols-2"><span className={`col-start-1 rounded-lg bg-white shadow-sm transition-transform duration-150 ease-out motion-reduce:transition-none ${modo === "manual" ? "translate-x-full" : "translate-x-0"}`} /></span>
              <button id="project-import-tab" role="tab" aria-controls="project-import-panel" aria-selected={modo === "planilha"} type="button" onClick={() => setModo("planilha")} className={`relative z-10 rounded-lg px-3 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none ${modo === "planilha" ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}>{t("import")}</button>
              <button id="project-manual-tab" role="tab" aria-controls="project-manual-panel" aria-selected={modo === "manual"} type="button" onClick={() => setModo("manual")} className={`relative z-10 rounded-lg px-3 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none ${modo === "manual" ? "font-medium text-primary" : "text-muted-foreground hover:text-foreground"}`}>{t("manual")}</button>
            </div>
          </header>
          <div className="relative grid min-h-0 flex-1 grid-cols-1 grid-rows-[minmax(0,1fr)]">
            {(["planilha", "manual"] as const).map((painel) => {
              const ativo = modo === painel;
              const importacao = painel === "planilha";
              const painelId = importacao ? "project-import-panel" : "project-manual-panel";
              const tabId = importacao ? "project-import-tab" : "project-manual-tab";
              return <section key={painel} id={painelId} role="tabpanel" aria-labelledby={tabId} aria-hidden={!ativo} inert={!ativo} className={`col-start-1 row-start-1 flex min-w-0 flex-col transition-[opacity,transform,visibility] duration-150 ease-out motion-reduce:transition-none ${ativo ? "relative visible translate-y-0 opacity-100" : "invisible pointer-events-none absolute inset-x-0 top-0 translate-y-1 opacity-0"}`}>
                <div className="flex min-h-full w-full flex-col">
                  {importacao ? <section aria-label={t("uploadSpreadsheet")} className="flex flex-1 flex-col">
                    <h2 className="mb-3 text-lg font-medium leading-6 text-[#454442]">{t("uploadSpreadsheet")}</h2>
                    <UploadPlanilha leitura={leitura} onBaixarModelo={downloadTemplate} />
                  </section> : <section className="rounded-2xl border border-border bg-white p-5 sm:p-7"><div className="mb-6"><h2 className="text-base font-semibold">{t("projectDetails")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("projectNameFormulaHint")}</p></div><div className="grid gap-5 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="project-name">{t("projectNamePreview")}</Label><Input id="project-name" value={nomeProjeto || (app.trim() && oneUi.trim() ? `${app.trim()} ${oneUi.trim()}` : "")} onChange={(event) => setNomeProjeto(event.target.value)} className="mt-2" maxLength={150} /></div><div><Label htmlFor="project-app">{t("app")}</Label><Input id="project-app" value={app} onChange={(event) => setApp(event.target.value)} className="mt-2" placeholder={t("appPlaceholder")} maxLength={100} /></div><div><Label htmlFor="project-oneui">{t("oneUi")}</Label><Input id="project-oneui" value={oneUi} onChange={(event) => setOneUi(event.target.value)} className="mt-2" placeholder="9.5" maxLength={40} /></div></div></section>}
                  {projectSetup(importacao ? Boolean(leitura.arquivo) : true, importacao ? "import" : "manual")}
                </div>
              </section>;
            })}
          </div>
        </div>
      </div>
      <footer className="mt-6 flex shrink-0 items-center justify-end gap-4 border-t border-border pt-5"><div className="flex gap-2"><Button variant="outline" onClick={() => { setCriacaoAberta(false); limparFormulario(); }}>{t("cancel")}</Button><Button disabled={queryMutation.isPending || leitura.fase === "lendo" || !timeId || (modo === "manual" ? !app.trim() || !oneUi.trim() : !leitura.arquivo)} onClick={() => queryMutation.mutate()}>{queryMutation.isPending ? t("saving") : conferirPlanilha ? t("checkSpreadsheet") : t("createProject")}</Button></div></footer>
      </div>
    </>}
    <Dialog open={Boolean(projetoEditando)} onOpenChange={(open) => { if (!open && !editarProjeto.isPending) setProjetoEditando(null); }}>
      <DrawerContent>
        <DrawerHeader><DrawerTitle>{t("editProjectTitle", { name: projetoEditando?.nome ?? "" })}</DrawerTitle></DrawerHeader>
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={(event) => { event.preventDefault(); editarProjeto.mutate(); }}>
          <div className="flex-1 space-y-5 overflow-y-auto px-7 py-6">
            <div><Label htmlFor="edit-project-name">{t("projectNamePreview")}</Label><Input id="edit-project-name" className="mt-2" value={edicaoNome} onChange={(event) => setEdicaoNome(event.target.value)} maxLength={150} required /></div>
            <div><Label htmlFor="edit-project-app">{t("app")}</Label><Input id="edit-project-app" className="mt-2" value={edicaoApp} onChange={(event) => setEdicaoApp(event.target.value)} maxLength={100} required /></div>
            <div><Label htmlFor="edit-project-oneui">{t("oneUi")}</Label><Input id="edit-project-oneui" className="mt-2" value={edicaoOneUi} onChange={(event) => setEdicaoOneUi(event.target.value)} maxLength={40} required /></div>
            <div><Label htmlFor="edit-project-team">{t("team")}</Label><Select value={edicaoTimeId} onValueChange={setEdicaoTimeId}><SelectTrigger id="edit-project-team" className="mt-2"><SelectValue placeholder={t("selectTeam")} /></SelectTrigger><SelectContent>{timesDisponiveis.map((team) => <SelectItem key={team.id} value={team.id}>{team.nome}</SelectItem>)}</SelectContent></Select></div>
            <MultiSelectCombobox
              label={t("deviceModels")}
              placeholder={t("selectDeviceModels", { defaultValue: "Selecionar modelos" })}
              options={opcoesModelos}
              value={edicaoModelosIds}
              onValueChange={setEdicaoModelosIds}
              emptyLabel={modelos.isLoading ? t("loadingDeviceModels") : t("noDeviceModels")}
              removeLabel={(name) => t("removeSelectedModel", { defaultValue: "Remover {{name}}", name })}
            />
          </div>
          <div className="flex justify-end gap-2 border-t border-border px-7 py-5"><DrawerClose asChild><Button type="button" variant="outline" disabled={editarProjeto.isPending}>{t("cancel")}</Button></DrawerClose><Button type="submit" disabled={!edicaoNome.trim() || !edicaoApp.trim() || !edicaoOneUi.trim() || !edicaoTimeId || editarProjeto.isPending}>{editarProjeto.isPending ? t("saving") : t("save")}</Button></div>
        </form>
      </DrawerContent>
    </Dialog>
    <AlertConfirm open={Boolean(projetoExcluindo)} onOpenChange={(open) => { if (!open && !excluirProjeto.isPending) setProjetoExcluindo(null); }} title={t("deleteProjectTitle")} description={t("deleteProjectDescription", { name: projetoExcluindo?.nome ?? "" })} confirmLabel={t("deleteProject")} variant="destructive" isPending={excluirProjeto.isPending} onConfirm={() => excluirProjeto.mutate()} />
  </section>;
}

/** Quantidade de modelos do projeto; os nomes aparecem no tooltip. */
function ContagemModelos({ modelos, rotulo }: { modelos: string[]; rotulo: string }) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <HeroButton variant="ghost" aria-label={`${rotulo}: ${modelos.length}`} className="h-7 min-h-0 gap-1.5 rounded-lg px-1.5 text-[14px] text-[#454442]">
        <Smartphone aria-hidden="true" absoluteStrokeWidth strokeWidth={1} className="size-3.5" /><span className="tabular-nums">{modelos.length}</span>
      </HeroButton>
      {modelos.length > 0 && <Tooltip.Content className="max-w-64 text-[13px]">
        {modelos.map((nome, indice) => <span key={`${nome}-${indice}`} className="block truncate">{nome}</span>)}
      </Tooltip.Content>}
    </Tooltip>
  );
}
