import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronLeft, Pencil, Plus, Smartphone, Trash2 } from "lucide-react";
import { Link, useNavigate, useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";
import { Button as HeroButton, Tooltip } from "@heroui/react";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate, formatNumber } from "@/core/i18n/format";
import { SelectField, TextInputField } from "@/shared/ui/form-field";
import { MultiSelectCombobox } from "@/shared/ui/multi-select-combobox";
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
import { baixarPlanilha, buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { formatarDiaIso, lerDiaIso } from "@/shared/lib/utils";
import { ApiError } from "@/shared/api/problem-details";
import { errosDaApi } from "../utils/formatar-erro-planilha";
import { CABECALHOS_MODELO_PLANILHA, EXEMPLO_MODELO_PLANILHA, formatarDiaBr } from "../utils/planilha-projeto";
import { UploadPlanilha } from "../components/importacao/UploadPlanilha";
import { EditarProjetoDrawer } from "../components/EditarProjetoDrawer";
import { useLeituraPlanilha } from "../hooks/useLeituraPlanilha";
import { statusProjetoTons } from "../components/status/status-projeto-estilos";
import { timesApi } from "@/modules/times/api/times.api";
import { modelosDispositivoApi, projetosApi, type Projeto, type StatusProjeto } from "../api/projetos.api";
import { ROTULO_STATUS_PROJETO } from "../model/projeto";

type ModoCriacao = "manual" | "planilha";
const statusProjeto: StatusProjeto[] = ["Created", "To Do", "InProgress", "Completed", "Canceled"];
const timesVazios: Awaited<ReturnType<typeof timesApi.listar>>["items"] = [];
const FILTROS_VAZIOS = { nome: "", time: "", app: "", oneUi: "", modelo: "", status: "", createdAt: "", updatedAt: "" };

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

  // Com problemas na planilha, o envio só confere: o servidor devolve também os problemas de
  // responsável e backup, que a prévia não consegue verificar, e não cria nada (CA-26, CA-27).
  const conferirPlanilha = modo === "planilha" && leitura.erros.length > 0;
  const timesDisponiveis = times.data?.items ?? timesVazios;
  const opcoesModelos = useMemo(() => (modelos.data?.items ?? []).map((model) => ({ value: model.id, label: model.nome, description: model.descricao })), [modelos.data?.items]);
  const opcoesFiltroModelos = useMemo(() => [...new Set((projetos.data?.items ?? []).flatMap((project) => project.modelos_dispositivo ?? []))].sort((a, b) => a.localeCompare(b)).map((nome) => ({ value: nome, label: nome })), [projetos.data?.items]);
  const nomeTime = useMemo(() => Object.fromEntries([...perfil.times, ...timesDisponiveis].map((time) => [time.id, time.nome])), [perfil.times, timesDisponiveis]);
  const passaNosFiltros = (project: Projeto) => {
    // Filtro de data pelo dia (AAAA-MM-DD) no fuso do navegador, nunca pelo texto formatado.
    const dia = (data: string | null) => data ? formatarDiaIso(new Date(data)) : "";
    return project.nome.toLocaleLowerCase().includes(filtrosProjeto.nome.toLocaleLowerCase())
      && (nomeTime[project.time_id] ?? project.time_id).toLocaleLowerCase().includes(filtrosProjeto.time.toLocaleLowerCase())
      && project.app.toLocaleLowerCase().includes(filtrosProjeto.app.toLocaleLowerCase())
      && project.one_ui.toLocaleLowerCase().includes(filtrosProjeto.oneUi.toLocaleLowerCase())
      && (!filtrosProjeto.modelo || (project.modelos_dispositivo ?? []).includes(filtrosProjeto.modelo))
      && (!filtrosProjeto.status || project.status === filtrosProjeto.status)
      && (!filtrosProjeto.createdAt || dia(project.created_at) === filtrosProjeto.createdAt)
      && (!filtrosProjeto.updatedAt || dia(project.updated_at) === filtrosProjeto.updatedAt);
  };
  const projetosFiltrados = (projetos.isError ? [] : projetos.data?.items ?? []).filter(passaNosFiltros);
  // O filtro é local, sobre a página: para exportar tudo, busca todas as páginas e filtra depois.
  const buscarProjetosParaExportar = async () => (await buscarTodasAsPaginas((page, pageSize) => projetosApi.listar(page, pageSize))).filter(passaNosFiltros);
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
  // Canceled e Completed mudam o projeto para o time todo: pedem confirmação antes de gravar.
  const [statusPendente, setStatusPendente] = useState<{ projeto: Projeto; status: StatusProjeto } | null>(null);
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProjeto }) => projetosApi.atualizarStatus(id, status),
    // Só a lista desta página: o prefixo ["projetos"] também casa com o detalhe do projeto, que não tem `items`.
    onMutate: ({ id, status }) => client.setQueryData<Awaited<ReturnType<typeof projetosApi.listar>>>(["projetos", pagina, tamanhoPagina], (old) => old && { ...old, items: old.items.map((item) => item.id === id ? { ...item, status } : item) }),
    onError: (error) => {
      const quantidade = error instanceof ApiError ? error.problem.errors?.find((erro) => erro.codigo === "projeto_com_casos_pendentes")?.parametros?.quantidade : undefined;
      toast.error(typeof quantidade === "number" ? t("projectCompleteBlocked", { count: quantidade }) : t("projectStatusError"));
    },
    onSettled: () => client.invalidateQueries({ queryKey: ["projetos"] }),
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
  function dataDeExemplo() {
    const data = new Date();
    data.setDate(data.getDate() + 30);
    return formatarDiaBr(formatarDiaIso(data));
  }
  async function downloadTemplate() {
    const XLSX = await import("@e965/xlsx");
    const worksheet = XLSX.utils.aoa_to_sheet([
      [...CABECALHOS_MODELO_PLANILHA],
      // A Planned date de exemplo (spec 075) é daqui a 30 dias, para o modelo continuar válido em qualquer dia.
      CABECALHOS_MODELO_PLANILHA.map((coluna) => coluna === "Planned date" ? dataDeExemplo() : EXEMPLO_MODELO_PLANILHA[coluna]),
    ]);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Test Cases");
    baixarPlanilha(XLSX.write(workbook, { bookType: "xlsx", type: "array" }), "template-projeto-test-cases.xlsx");
  }
  function statusLabel(status: StatusProjeto) {
    return t(ROTULO_STATUS_PROJETO[status]);
  }
  function projectSetup(visivel: boolean) {
    if (!visivel) return null;
    return <section className="mt-7 border-t border-border pt-6">
      <h2 className="mb-5 text-base font-semibold">{t("projectSetup")}</h2>
      <div className="grid items-start gap-5 sm:grid-cols-2">
        <SelectField label={t("team")} value={timeId} onChange={setTimeId} emptyOption={t("selectTeam")} options={timesDisponiveis.map((team) => ({ value: team.id, label: team.nome }))} />
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
  const alterarStatus = (projeto: Projeto, status: StatusProjeto) => status === "Canceled" || status === "Completed"
    ? setStatusPendente({ projeto, status })
    : statusMutation.mutate({ id: projeto.id, status });
  const primeiraDaPagina = (pagina - 1) * tamanhoPagina;
  // O filtro é local: o mesmo projeto muda de posição sem mudar de identidade, então o número depende da ordem.
  const ordemDosProjetos = projetosFiltrados.map((project) => project.id).join();
  const acoesDoProjeto = (project: Projeto): RowAction[] => [
    { label: t("viewProject"), icon: <EyeIcon />, onPress: () => navigate(`/projetos/${project.id}`) },
    ...(podeGerenciar ? [
      { label: t("editProject"), icon: <Pencil {...rowActionIconProps} />, onPress: () => setProjetoEditando(project) },
      { label: t("deleteProject"), icon: <Trash2 {...rowActionIconProps} />, onPress: () => setProjetoExcluindo(project), destructive: true },
    ] : []),
  ];
  const rotuloTime = (project: Projeto) => nomeTime[project.time_id] ?? "—";
  const rotuloCriadoEm = (project: Projeto) => project.created_at ? formatDate(project.created_at) : "—";
  const rotuloAtualizadoEm = (project: Projeto) => project.updated_at ? formatDate(project.updated_at) : "—";
  const rotuloDataPlanejada = (project: Projeto) => project.data_planejada ? formatDate(lerDiaIso(project.data_planejada)) : "—";
  const colunas: DataTableColumn<Projeto>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (project) => String(primeiraDaPagina + projetosFiltrados.indexOf(project) + 1).padStart(2, "0") },
    { id: "nome", isRowHeader: true, header: <DataTableFilter label={t("project")} value={filtrosProjeto.nome} onChange={(value) => alterarFiltroProjeto("nome", value)} />, cell: (project) => <Link to={`/projetos/${project.id}`} className="hover:text-accent-text focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus">{project.nome}</Link>, exportar: { titulo: t("project"), valor: (project) => project.nome } },
    { id: "time", header: <DataTableFilter label={t("team")} value={filtrosProjeto.time} onChange={(value) => alterarFiltroProjeto("time", value)} />, cell: rotuloTime, exportar: { titulo: t("team"), valor: rotuloTime } },
    { id: "app", header: <DataTableFilter label={t("app")} value={filtrosProjeto.app} onChange={(value) => alterarFiltroProjeto("app", value)} />, cell: (project) => project.app, exportar: { titulo: t("app"), valor: (project) => project.app } },
    { id: "oneUi", header: <DataTableFilter label={t("oneUi")} value={filtrosProjeto.oneUi} onChange={(value) => alterarFiltroProjeto("oneUi", value)} />, cell: (project) => project.one_ui, exportar: { titulo: t("oneUi"), valor: (project) => project.one_ui } },
    { id: "modelos", header: <DataTableFilter label={t("deviceModels")} value={filtrosProjeto.modelo} onChange={(value) => alterarFiltroProjeto("modelo", value)} options={comOpcaoTodos(t("all"), opcoesFiltroModelos)} searchable />, cell: (project) => <ContagemModelos modelos={project.modelos_dispositivo ?? []} rotulo={t("deviceModels")} />, exportar: { titulo: t("deviceModels"), valor: (project) => (project.modelos_dispositivo ?? []).join(", ") } },
    {
      id: "status",
      header: <DataTableFilter label={t("status")} value={filtrosProjeto.status} onChange={(value) => alterarFiltroProjeto("status", value)} options={comOpcaoTodos(t("all"), opcoesStatus)} />,
      exportar: { titulo: t("status"), valor: (project) => statusLabel(project.status) },
      cell: (project) => {
        const etiqueta = <TagChip tom={statusProjetoTons[project.status]}>{statusLabel(project.status)}</TagChip>;
        return podeGerenciar
          ? <InlineSelect aria-label={t("projectStatusFor", { name: project.nome })} value={project.status} options={opcoesStatus} onChange={(value) => alterarStatus(project, value as StatusProjeto)}>{etiqueta}</InlineSelect>
          : etiqueta;
      },
    },
    { id: "criadoEm", header: <DataTableFilter label={t("createdAt")} value={filtrosProjeto.createdAt} onChange={(value) => alterarFiltroProjeto("createdAt", value)} type="date" />, cell: rotuloCriadoEm, exportar: { titulo: t("createdAt"), valor: rotuloCriadoEm } },
    { id: "atualizadoEm", header: <DataTableFilter label={t("updatedAt")} value={filtrosProjeto.updatedAt} onChange={(value) => alterarFiltroProjeto("updatedAt", value)} type="date" />, cell: rotuloAtualizadoEm, exportar: { titulo: t("updatedAt"), valor: rotuloAtualizadoEm } },
    { id: "dataPlanejada", header: t("plannedDate"), className: "whitespace-nowrap tabular-nums", cell: rotuloDataPlanejada, exportar: { titulo: t("plannedDate"), valor: rotuloDataPlanejada } },
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
    empty: { title: t("noProjects"), hint: t("noProjectsHint") },
    filtered: { title: t("noResults"), hint: t("noProjectResults") },
  });

  return <section className={criacaoAberta ? "relative flex h-full min-h-0 flex-col" : "flex h-full min-h-0 flex-col overflow-hidden rounded-[42px] border border-edge bg-card px-7 py-8 sm:px-11 sm:py-10"}>
    {!criacaoAberta ? <>
      <header className="mb-7 flex shrink-0 items-start justify-between gap-4">
        <div className="min-w-0"><h1 className="text-2xl font-medium text-accent-text">{t("myProjects")}</h1><p className="mt-1.5 text-[14px] leading-5 text-muted">{t("projectsDescription")}</p></div>
        {podeGerenciar && <HeroButton variant="primary" onPress={() => { limparFormulario(); setCriacaoAberta(true); }}><Plus aria-hidden="true" absoluteStrokeWidth strokeWidth={1.5} className="size-4" />{t("newProject")}</HeroButton>}
      </header>
      <DataTable
        aria-label={t("myProjects")}
        columns={colunas}
        items={projetosFiltrados}
        state={estadoProjetos}
        pagination={<DataTablePagination page={pagina} pageSize={tamanhoPagina} totalCount={projetos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(size) => { setTamanhoPagina(size); setPagina(1); }} />}
        exportacao={{ listagem: "projetos", todosOsItens: buscarProjetosParaExportar }}
        rowDependencies={[t, nomeTime, podeGerenciar, primeiraDaPagina, ordemDosProjetos]}
      />
    </> : <>
      <div className="absolute -top-11 left-0 z-10">
        <HeroButton variant="ghost" className="h-auto gap-1 px-1 py-1 text-base font-normal text-foreground hover:bg-transparent" onPress={() => { setCriacaoAberta(false); limparFormulario(); }}><ChevronLeft aria-hidden="true" className="size-4" />{t("projectsNav")}</HeroButton>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-[42px] border border-edge bg-card px-7 py-8 sm:px-11 sm:py-10">
      <div className="thin-scroll -mx-1 min-h-0 flex-1 overflow-auto px-1">
        <div className="flex min-h-full w-full flex-col">
          <header className="mb-4 flex items-center justify-between gap-4">
            <h1 className="text-2xl font-medium text-accent-text">{t("newProject")}</h1>
            <div className="relative grid w-52 shrink-0 grid-cols-2 rounded-xl bg-panel p-1" role="tablist" aria-label={t("projectCreationMethod")}>
              <span aria-hidden="true" className="pointer-events-none absolute inset-y-1 left-1 right-1 grid grid-cols-2"><span className={`col-start-1 rounded-lg bg-surface shadow-sm transition-transform duration-150 ease-out motion-reduce:transition-none ${modo === "manual" ? "translate-x-full" : "translate-x-0"}`} /></span>
              <button id="project-import-tab" role="tab" aria-controls={modo === "planilha" ? "project-import-panel" : undefined} aria-selected={modo === "planilha"} type="button" onClick={() => setModo("planilha")} className={`relative z-10 rounded-lg px-3 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none ${modo === "planilha" ? "font-medium text-accent-text" : "text-muted-foreground hover:text-foreground"}`}>{t("import")}</button>
              <button id="project-manual-tab" role="tab" aria-controls={modo === "manual" ? "project-manual-panel" : undefined} aria-selected={modo === "manual"} type="button" onClick={() => setModo("manual")} className={`relative z-10 rounded-lg px-3 py-2 text-sm transition-colors duration-150 motion-reduce:transition-none ${modo === "manual" ? "font-medium text-accent-text" : "text-muted-foreground hover:text-foreground"}`}>{t("manual")}</button>
            </div>
          </header>
          {/* Só o modo escolhido fica na tela: um campo Time por vez, sem nomes repetidos (spec 031, RN-08). */}
          <section id={modo === "planilha" ? "project-import-panel" : "project-manual-panel"} role="tabpanel" aria-labelledby={modo === "planilha" ? "project-import-tab" : "project-manual-tab"} className="flex min-w-0 flex-1 flex-col">
            {modo === "planilha" ? <section aria-label={t("uploadSpreadsheet")} className="flex flex-col">
              <h2 className="mb-3 text-lg font-medium leading-6 text-body">{t("uploadSpreadsheet")}</h2>
              <UploadPlanilha leitura={leitura} onBaixarModelo={downloadTemplate} />
            </section> : <section className="rounded-2xl border border-edge bg-surface p-5 sm:p-7">
              <div className="mb-6"><h2 className="text-base font-semibold">{t("projectDetails")}</h2><p className="mt-1 text-sm text-muted-foreground">{t("projectNameFormulaHint")}</p></div>
              <div className="grid items-start gap-5 sm:grid-cols-2">
                <div className="sm:col-span-2"><TextInputField label={t("projectNamePreview")} value={nomeProjeto || (app.trim() && oneUi.trim() ? `${app.trim()} ${oneUi.trim()}` : "")} onChange={setNomeProjeto} maxLength={150} /></div>
                <TextInputField label={t("app")} value={app} onChange={setApp} placeholder={t("appPlaceholder")} maxLength={100} />
                <TextInputField label={t("oneUi")} value={oneUi} onChange={setOneUi} placeholder="9.5" maxLength={40} />
              </div>
            </section>}
            {projectSetup(modo === "manual" || Boolean(leitura.arquivo))}
          </section>
        </div>
      </div>
      <footer className="mt-6 flex shrink-0 items-center justify-end gap-4 border-t border-border pt-5"><div className="flex gap-2"><HeroButton variant="tertiary" onPress={() => { setCriacaoAberta(false); limparFormulario(); }}>{t("cancel")}</HeroButton><HeroButton variant="primary" isDisabled={queryMutation.isPending || leitura.fase === "lendo" || !timeId || (modo === "manual" ? !app.trim() || !oneUi.trim() : !leitura.arquivo)} onPress={() => queryMutation.mutate()}>{queryMutation.isPending ? t("saving") : conferirPlanilha ? t("checkSpreadsheet") : t("createProject")}</HeroButton></div></footer>
      </div>
    </>}
    <EditarProjetoDrawer projeto={projetoEditando} onFechar={() => setProjetoEditando(null)} times={timesDisponiveis} nomeTime={nomeTime} opcoesModelos={opcoesModelos} carregandoModelos={modelos.isLoading} />
    <AlertConfirm
      open={Boolean(statusPendente)}
      onOpenChange={(open) => { if (!open) setStatusPendente(null); }}
      title={t("projectStatusConfirmTitle", { name: statusPendente?.projeto.nome ?? "", status: statusPendente ? statusLabel(statusPendente.status) : "" })}
      description={t(statusPendente?.status === "Canceled" ? "projectStatusCanceledDescription" : "projectStatusCompletedDescription")}
      confirmLabel={t("projectStatusConfirm")}
      variant={statusPendente?.status === "Canceled" ? "destructive" : "default"}
      onConfirm={() => { if (statusPendente) statusMutation.mutate({ id: statusPendente.projeto.id, status: statusPendente.status }); setStatusPendente(null); }}
    />
    <AlertConfirm open={Boolean(projetoExcluindo)} onOpenChange={(open) => { if (!open && !excluirProjeto.isPending) setProjetoExcluindo(null); }} title={t("deleteProjectTitle")} description={t("deleteProjectDescription", { name: projetoExcluindo?.nome ?? "" })} confirmLabel={t("deleteProject")} variant="destructive" isPending={excluirProjeto.isPending} onConfirm={() => excluirProjeto.mutate()} />
  </section>;
}

/** Quantidade de modelos do projeto; os nomes aparecem no tooltip. */
function ContagemModelos({ modelos, rotulo }: { modelos: string[]; rotulo: string }) {
  return (
    <Tooltip delay={300} closeDelay={0}>
      <HeroButton variant="ghost" aria-label={`${rotulo}: ${modelos.length}`} className="h-7 min-h-0 gap-1.5 rounded-lg px-1.5 text-[14px] text-body">
        <Smartphone aria-hidden="true" absoluteStrokeWidth strokeWidth={1} className="size-3.5" /><span className="tabular-nums">{modelos.length}</span>
      </HeroButton>
      {modelos.length > 0 && <Tooltip.Content className="max-w-64 text-[13px]">
        {modelos.map((nome, indice) => <span key={`${nome}-${indice}`} className="block truncate">{nome}</span>)}
      </Tooltip.Content>}
    </Tooltip>
  );
}
