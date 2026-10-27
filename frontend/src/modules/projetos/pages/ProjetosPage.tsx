import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Eye, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { createPortal } from "react-dom";
import { Link, useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Button as HeroButton, Chip, Table as HeroTable } from "@heroui/react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate, formatNumber } from "@/core/i18n/format";
import { Button } from "@/shared/ui/button";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { Select, SelectContent, SelectItem, SelectValue, SELECT_EMPTY_VALUE, SelectTrigger } from "@/shared/ui/select";
import { DEFAULT_TABLE_PAGE_SIZE, TableLayout } from "@/shared/ui/table";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
import { Dialog, DrawerClose, DrawerContent, DrawerHeader, DrawerTitle } from "@/shared/ui/dialog";
import { ConfirmDialog } from "@/shared/ui/confirm-dialog";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { toast } from "@/shared/lib/toast";
import { ApiError } from "@/shared/api/problem-details";
import { errosDaApi } from "../utils/formatar-erro-planilha";
import { UploadPlanilha } from "../components/importacao/UploadPlanilha";
import { useLeituraPlanilha } from "../hooks/useLeituraPlanilha";
import { timesApi } from "@/modules/times/api/times.api";
import { modelosDispositivoApi, projetosApi, type Projeto, type StatusProjeto } from "../api/projetos.api";

type ModoCriacao = "manual" | "planilha";
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const timesVazios: Awaited<ReturnType<typeof timesApi.listar>>["items"] = [];

export function ProjetosPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const navigate = useNavigate();
  const admin = perfil.perfil_codigo === "ADMIN_UNIDADE";
  const podeConsultar = admin || perfil.permissoes.includes("projetos.consultar") || perfil.permissoes.includes("test_cases.consultar");
  const podeGerenciar = admin || perfil.permissoes.includes("projetos.gerenciar");
  const [pagina, setPagina] = useState(1);
  const [tamanhoPagina] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtrosProjeto, setFiltrosProjeto] = useState({ nome: "", time: "", app: "", oneUi: "", status: "", createdAt: "" });
  const [modelosFiltrados, setModelosFiltrados] = useState<string[]>([]);
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
  const projetosFiltrados = (projetos.data?.items ?? []).filter((project) => {
    const createdAt = project.created_at ? formatDate(project.created_at) : "";
    return project.nome.toLocaleLowerCase().includes(filtrosProjeto.nome.toLocaleLowerCase())
      && (nomeTime[project.time_id] ?? project.time_id).toLocaleLowerCase().includes(filtrosProjeto.time.toLocaleLowerCase())
      && project.app.toLocaleLowerCase().includes(filtrosProjeto.app.toLocaleLowerCase())
      && project.one_ui.toLocaleLowerCase().includes(filtrosProjeto.oneUi.toLocaleLowerCase())
      && (!modelosFiltrados.length || modelosFiltrados.some((nome) => (project.modelos_dispositivo ?? []).includes(nome)))
      && (!filtrosProjeto.status || project.status === filtrosProjeto.status)
      && createdAt.toLocaleLowerCase().includes(filtrosProjeto.createdAt.toLocaleLowerCase());
  });
  const totalProjetos = projetos.data?.total_count ?? 0;
  const totalPaginas = Math.max(1, Math.ceil(totalProjetos / tamanhoPagina));
  const primeiraPaginaVisivel = Math.max(1, Math.min(pagina - 1, totalPaginas - 2));
  const paginasVisiveis = Array.from({ length: Math.min(3, totalPaginas) }, (_, index) => primeiraPaginaVisivel + index);
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
    onMutate: ({ id, status }) => client.setQueriesData<Awaited<ReturnType<typeof projetosApi.listar>>>({ queryKey: ["projetos"] }, (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, status } : item) }),
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

  return <section className={criacaoAberta ? "relative flex h-full min-h-0 flex-col" : "flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-[#EEEEF1] bg-card px-7 py-8 sm:px-11 sm:py-10"}>
    {!criacaoAberta ? <>
      <header className="mb-7 flex shrink-0 items-center justify-between gap-4">
        <h1 className="text-2xl font-medium text-foreground">{t("myProjects")}</h1>
        {podeGerenciar && <HeroButton variant="primary" size="sm" className="rounded-full px-4" onPress={() => { limparFormulario(); setCriacaoAberta(true); }}><Plus aria-hidden="true" className="size-4" />{t("newProject")}</HeroButton>}
      </header>
      <TableLayout className="min-h-0 overflow-hidden rounded-[20px] bg-[#f2f3f5] p-1.5">
        {projetos.isLoading ? <div role="status" className="flex min-h-64 flex-1 items-center justify-center rounded-2xl bg-white text-sm text-muted-foreground">{t("loadingProjects")}</div> : projetos.isError ? <div role="alert" className="flex min-h-64 flex-1 items-center justify-center rounded-2xl bg-white text-sm text-destructive">{t("projectsLoadError")}</div> : <HeroTable className="projects-table min-h-0 flex-1" variant="primary">
          <HeroTable.ScrollContainer>
            <HeroTable.Content aria-label={t("myProjects")} selectionMode="none">
              <HeroTable.Header>
                <HeroTable.Column id="project" textValue={t("project")}><TableColumnFilter label={t("project")} value={filtrosProjeto.nome} onChange={(value) => alterarFiltroProjeto("nome", value)} /></HeroTable.Column>
                <HeroTable.Column id="team" textValue={t("team")}><TableColumnFilter label={t("team")} value={filtrosProjeto.time} onChange={(value) => alterarFiltroProjeto("time", value)} /></HeroTable.Column>
                <HeroTable.Column id="app" textValue={t("app")}><TableColumnFilter label={t("app")} value={filtrosProjeto.app} onChange={(value) => alterarFiltroProjeto("app", value)} /></HeroTable.Column>
                <HeroTable.Column id="one-ui" textValue={t("oneUi")}><TableColumnFilter label={t("oneUi")} value={filtrosProjeto.oneUi} onChange={(value) => alterarFiltroProjeto("oneUi", value)} /></HeroTable.Column>
                <HeroTable.Column id="models" textValue={t("deviceModels")}><TableColumnFilter label={t("deviceModels")} value="" onChange={() => undefined} options={opcoesFiltroModelos} multiple selectedValues={modelosFiltrados} onSelectedValuesChange={(values) => { setPagina(1); setModelosFiltrados(values); }} /></HeroTable.Column>
                <HeroTable.Column id="status" textValue={t("status")}><TableColumnFilter label={t("status")} value={filtrosProjeto.status} onChange={(value) => alterarFiltroProjeto("status", value)} options={[{ value: "", label: t("all") }, ...statusProjeto.map((status) => ({ value: status, label: statusLabel(status) }))]} /></HeroTable.Column>
                <HeroTable.Column id="created" textValue={t("createdAt")}><TableColumnFilter label={t("createdAt")} value={filtrosProjeto.createdAt} onChange={(value) => alterarFiltroProjeto("createdAt", value)} /></HeroTable.Column>
                <HeroTable.Column id="actions" textValue={t("actions")} className="text-right">{t("actions")}</HeroTable.Column>
              </HeroTable.Header>
              <HeroTable.Body>
                {projetosFiltrados.length ? projetosFiltrados.map((project, index) => <ProjectRow key={project.id} project={project} rowNumber={(pagina - 1) * tamanhoPagina + index + 1} teamName={nomeTime[project.time_id]} canEdit={podeGerenciar} onView={() => navigate(`/projetos/${project.id}`)} onEdit={() => { setProjetoEditando(project); setEdicaoNome(project.nome); setEdicaoApp(project.app); setEdicaoOneUi(project.one_ui); setEdicaoTimeId(project.time_id); setEdicaoModelosIds(project.modelos_ids ?? []); }} onDelete={() => setProjetoExcluindo(project)} onStatusChange={(status) => statusMutation.mutate({ id: project.id, status })} statusLabel={statusLabel} />) : <HeroTable.Row id="empty-projects"><HeroTable.Cell colSpan={8} className="h-64 text-center align-middle"><div role="status"><p className="font-medium">{projetos.data?.items.length ? t("noProjectResults", { defaultValue: "Nenhum projeto corresponde aos filtros." }) : t("noProjects")}</p><p className="mt-1 text-muted-foreground">{projetos.data?.items.length ? t("adjustFilters", { defaultValue: "Ajuste ou limpe os filtros para ver os resultados." }) : t("noProjectsHint")}</p></div></HeroTable.Cell></HeroTable.Row>}
              </HeroTable.Body>
            </HeroTable.Content>
          </HeroTable.ScrollContainer>
          <HeroTable.Footer>
            <span>{formatNumber(totalProjetos)} {t("projectsNav").toLocaleLowerCase()}</span>
            <nav aria-label={t("pagination", { defaultValue: "Pagination" })} className="flex items-center gap-1">
              <HeroButton variant="ghost" size="sm" isDisabled={pagina <= 1} onPress={() => setPagina(pagina - 1)}><ChevronLeft className="size-3.5" />{t("previousPage")}</HeroButton>
              {paginasVisiveis.map((page) => <HeroButton key={page} variant={page === pagina ? "secondary" : "ghost"} size="sm" isIconOnly aria-current={page === pagina ? "page" : undefined} aria-label={t("pageOfTotal", { page, total: totalPaginas })} onPress={() => setPagina(page)}>{page}</HeroButton>)}
              <HeroButton variant="ghost" size="sm" isDisabled={pagina >= totalPaginas} onPress={() => setPagina(pagina + 1)}>{t("nextPage")}<ChevronLeft className="size-3.5 rotate-180" /></HeroButton>
            </nav>
          </HeroTable.Footer>
        </HeroTable>}
      </TableLayout>
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
    <ConfirmDialog open={Boolean(projetoExcluindo)} onOpenChange={(open) => { if (!open && !excluirProjeto.isPending) setProjetoExcluindo(null); }} title={t("deleteProjectTitle")} description={t("deleteProjectDescription", { name: projetoExcluindo?.nome ?? "" })} confirmLabel={t("deleteProject")} variant="destructive" isPending={excluirProjeto.isPending} onConfirm={() => excluirProjeto.mutate()} />
  </section>;
}

function ProjectRow({ project, rowNumber, teamName, canEdit, onView, onEdit, onDelete, onStatusChange, statusLabel }: { project: Projeto; rowNumber: number; teamName?: string; canEdit: boolean; onView: () => void; onEdit: () => void; onDelete: () => void; onStatusChange: (status: StatusProjeto) => void; statusLabel: (status: StatusProjeto) => string }) {
  const { t } = useTranslation();
  const modelos = project.modelos_dispositivo ?? [];
  const statusColor = project.status === "Completed" ? "success" : project.status === "InProgress" ? "warning" : project.status === "Canceled" ? "danger" : project.status === "Created" ? "accent" : "default";
  return <HeroTable.Row id={project.id}>
    <HeroTable.Cell className="font-medium"><span className="mr-2 inline-block w-5 text-[10px] font-normal text-[#858991]">{String(rowNumber).padStart(2, "0")}</span><Link to={`/projetos/${project.id}`} className="text-left hover:text-primary">{project.nome}</Link></HeroTable.Cell>
    <HeroTable.Cell className="text-[#666970]">{teamName ?? "—"}</HeroTable.Cell>
    <HeroTable.Cell className="text-[#666970]">{project.app}</HeroTable.Cell>
    <HeroTable.Cell className="text-[#666970]">{project.one_ui}</HeroTable.Cell>
    <HeroTable.Cell><ProjectDeviceCount projectId={project.id} models={modelos} label={t("deviceModels")} /></HeroTable.Cell>
    <HeroTable.Cell>{canEdit ? <Select value={project.status} onValueChange={(value) => onStatusChange(value as StatusProjeto)}><SelectTrigger aria-label={t("projectStatusFor", { name: project.nome })} className={`h-6 w-32 rounded-full border-0 px-2 text-[10px] ${project.status === "Completed" ? "bg-[#e3f6e9] text-[#278a4c]" : project.status === "InProgress" ? "bg-[#fff1dd] text-[#a36012]" : project.status === "Canceled" ? "bg-[#fde8e8] text-[#b64646]" : project.status === "Created" ? "bg-[#e6efff] text-[#3672f2]" : "bg-[#eff0f2] text-[#686b70]"}`}><SelectValue /></SelectTrigger><SelectContent>{statusProjeto.map((status) => <SelectItem key={status} value={status}>{statusLabel(status)}</SelectItem>)}</SelectContent></Select> : <Chip color={statusColor} variant="soft" size="sm" className="text-[10px]"><Chip.Label>{statusLabel(project.status)}</Chip.Label></Chip>}</HeroTable.Cell>
    <HeroTable.Cell className="text-[#666970]">{project.created_at ? formatDate(project.created_at) : "—"}</HeroTable.Cell>
    <HeroTable.Cell className="text-right"><div className="inline-flex items-center gap-1">
      <HeroButton variant="tertiary" size="sm" isIconOnly aria-label={t("viewProject")} className="!size-6 !min-w-6 rounded-full bg-[#f0f0f0] p-1" onPress={onView}><Eye className="size-3" /></HeroButton>
      {canEdit && <>
        <HeroButton variant="tertiary" size="sm" isIconOnly aria-label={t("editProject")} className="!size-6 !min-w-6 rounded-full bg-[#f0f0f0] p-1" onPress={onEdit}><Pencil className="size-3" /></HeroButton>
        <HeroButton variant="tertiary" size="sm" isIconOnly aria-label={t("deleteProject")} className="!size-6 !min-w-6 rounded-full bg-[#fff0f0] p-1 text-[#df6262]" onPress={onDelete}><Trash2 className="size-3" /></HeroButton>
      </>}
    </div></HeroTable.Cell>
  </HeroTable.Row>;
}

function ProjectDeviceCount({ projectId, models, label }: { projectId: string; models: string[]; label: string }) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const closeTimeout = useRef<number | null>(null);
  const tooltipId = `project-models-${projectId}`;

  function showTooltip() {
    if (closeTimeout.current !== null) window.clearTimeout(closeTimeout.current);
    setOpen(true);
  }

  function hideTooltip() {
    if (document.activeElement === triggerRef.current) return;
    if (closeTimeout.current !== null) window.clearTimeout(closeTimeout.current);
    closeTimeout.current = window.setTimeout(() => setOpen(false), 120);
  }

  useEffect(() => {
    if (!open) return;
    const positionTooltip = () => {
      const bounds = triggerRef.current?.getBoundingClientRect();
      if (!bounds) return;
      const tooltipBounds = tooltipRef.current?.getBoundingClientRect();
      const width = tooltipBounds?.width ?? Math.min(256, window.innerWidth - 16);
      const height = tooltipBounds?.height ?? Math.min(models.length * 24 + 16, 192);
      const left = Math.max(8, Math.min((bounds.left + bounds.right - width) / 2, window.innerWidth - width - 8));
      const top = bounds.bottom + height + 8 <= window.innerHeight
        ? bounds.bottom + 8
        : Math.max(8, bounds.top - height - 8);
      setPosition({ left, top });
    };
    positionTooltip();
    window.addEventListener("resize", positionTooltip);
    window.addEventListener("scroll", positionTooltip, true);
    return () => {
      window.removeEventListener("resize", positionTooltip);
      window.removeEventListener("scroll", positionTooltip, true);
      if (closeTimeout.current !== null) window.clearTimeout(closeTimeout.current);
    };
  }, [open, models.length]);

  return <>
    <button ref={triggerRef} type="button" aria-label={`${label}: ${models.length}`} aria-describedby={open && models.length > 0 ? tooltipId : undefined} onMouseEnter={showTooltip} onMouseLeave={hideTooltip} onFocus={showTooltip} onBlur={() => setOpen(false)} onClick={showTooltip} className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-muted-foreground hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"><Smartphone aria-hidden="true" className="size-4" /><span>{models.length}</span></button>
    {open && models.length > 0 && createPortal(<div ref={tooltipRef} id={tooltipId} role="tooltip" onMouseEnter={showTooltip} onMouseLeave={hideTooltip} style={{ position: "fixed", left: position.left, top: position.top }} className="z-[80] max-h-48 w-max max-w-64 overflow-y-auto rounded-lg border border-border bg-white px-3 py-2 text-sm text-foreground shadow-lg">{models.map((name, index) => <span key={`${name}-${index}`} className="block truncate">{name}</span>)}</div>, document.body)}
  </>;
}

