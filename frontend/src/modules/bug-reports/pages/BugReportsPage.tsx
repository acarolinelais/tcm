import { type ReactNode, useEffect, useState } from "react";
import { Button } from "@heroui/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronRight, MessageSquareText } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { ProjetoSwitcher } from "@/modules/projetos/components/ProjetoSwitcher";
import { DetalhesCasoTesteDrawer } from "@/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer";
import { TcIdBotao } from "@/modules/projetos/components/casos-teste/TcIdBotao";
import { statusChipTons } from "@/modules/projetos/components/status/status-chip-estilos";
import { casosTesteApi } from "@/modules/projetos/api/projetos.api";
import { useProjetosSeletor } from "@/modules/projetos/hooks/useProjetos";
import { ROTULO_STATUS, filtrarEncerrados, perfilGerenciaCasos, type CasoTesteResumo } from "@/modules/projetos/model/projeto";
import { timesApi } from "@/modules/times/api/times.api";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { cn } from "@/shared/lib/utils";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { ErroComRetry } from "@/shared/ui/erro-com-retry";
import { EstadoVazio } from "@/shared/ui/estado-vazio";
import { InlineSelect } from "@/shared/ui/inline-select";
import { LinhaDaPilha as Linha } from "@/shared/ui/linha-da-pilha";
import { PageCard, PageDescription, PageTitle } from "@/shared/ui/page-card";
import { RowActionButton } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import { TagChip } from "@/shared/ui/tag-chip";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";

import { bugReportsApi } from "../api/bug-reports.api";
import { DescricaoFalhaDrawer, type FalhaExibida } from "../components/DescricaoFalhaDrawer";
import { useBugReports } from "../hooks/useBugReports";
import type { CasoComFalhas, FalhaSdf, FiltrosBugReport } from "../model/bug-report";

const dataHora = (falha: FalhaSdf) => formatDate(falha.data_execucao, { dateStyle: "short", timeStyle: "short" });

/** SDF Failures (spec 072): um caso por linha, com as falhas do SDF; a linha abre para mostrar todas. */
export function BugReportsPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const projetosQuery = useProjetosSeletor(perfil);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = projetosQuery;
  useEffect(() => {
    if (hasNextPage && !isFetchingNextPage) void fetchNextPage();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  // RN-06: projeto encerrado não tem falhas na página. O projeto fica em ?projeto=, como na Timeline.
  const projetos = filtrarEncerrados(projetosQuery.data?.pages.flatMap((pagina) => pagina.items) ?? [], false);
  const [parametros, setParametros] = useSearchParams();
  const pedido = parametros.get("projeto");
  const projetoAberto = projetos.find((projeto) => projeto.id === pedido) ?? (pedido && hasNextPage ? undefined : projetos[0]);

  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<FiltrosBugReport>({});
  const [expandidos, setExpandidos] = useState<ReadonlySet<string>>(new Set());
  const [casoAberto, setCasoAberto] = useState<CasoTesteResumo | null>(null);
  const [falhaAberta, setFalhaExibida] = useState<FalhaExibida | null>(null);
  const casos = useBugReports(projetoAberto?.id ?? "", pagina, tamanho, filtros);
  const itens = casos.isError ? [] : casos.data?.items ?? [];

  const podeEscolher = perfilGerenciaCasos(perfil);
  const membros = useQuery({
    queryKey: ["time-membros", projetoAberto?.time_id],
    queryFn: () => timesApi.membros(projetoAberto!.time_id),
    enabled: podeEscolher && Boolean(projetoAberto),
  });
  // RN-17: membros ativos do time, inclusive o dono do caso; "No Dev Fix" remove.
  const opcoesDevFix = [
    { value: "", label: t("noDevFix") },
    ...(membros.data ?? []).filter((membro) => membro.ativo).map((membro) => ({ value: membro.usuario_id, label: membro.usuario_user_id ?? membro.usuario_nome ?? "—" })),
  ];
  const client = useQueryClient();
  const escolherDevFix = useMutation({
    mutationFn: ({ casoId, devFixId }: { casoId: string; devFixId: string }) => casosTesteApi.atualizar(casoId, { dev_fix_id: devFixId || null }),
    onSuccess: () => toast.success(t("devFixChanged")),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseUpdateError")),
    // A lista e o painel do caso (o histórico mostra o Dev Fix); invalidar ["projetos"] recarregaria o seletor inteiro.
    onSettled: () => Promise.all([
      client.invalidateQueries({ queryKey: ["bug-reports"] }),
      client.invalidateQueries({ queryKey: ["projetos", "test-cases", "detalhe"] }),
    ]),
  });

  const temFiltro = Object.values(filtros).some(Boolean);
  const filtrar = (campo: keyof FiltrosBugReport) => (valor: string) => { setPagina(1); setFiltros({ ...filtros, [campo]: valor || undefined }); };
  function trocarProjeto(id: string) {
    setParametros({ projeto: id }, { replace: true });
    setPagina(1);
    setFiltros({});
    setExpandidos(new Set());
  }
  function alternar(casoId: string) {
    const novos = new Set(expandidos);
    if (!novos.delete(casoId)) novos.add(casoId);
    setExpandidos(novos);
  }
  // O catálogo de modelos exige gestão: as opções de device saem das falhas carregadas.
  const opcoesDevice = [...new Map(itens.flatMap((caso) => caso.falhas).map((falha) => [falha.modelo_dispositivo_id, falha.modelo_nome])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));
  const primeiraDaPagina = (pagina - 1) * tamanho;
  // RN-11: fechada, a linha mostra a falha mais recente; aberta, todas, uma embaixo da outra.
  const pilha = (caso: CasoComFalhas, celula: (falha: FalhaSdf) => ReactNode) =>
    (expandidos.has(caso.caso_teste_id) ? caso.falhas : caso.falhas.slice(0, 1)).map((falha, indice) => <Linha key={indice}>{celula(falha)}</Linha>);
  const topo = "[tbody_&]:align-top";

  const colunas: DataTableColumn<CasoComFalhas>[] = [
    {
      id: "numero",
      header: "",
      className: `w-20 min-w-20 ${topo}`,
      cell: (caso) => {
        const aberta = expandidos.has(caso.caso_teste_id);
        return <Linha className="gap-2">
          <span className="w-5 text-right tabular-nums text-muted">{String(primeiraDaPagina + itens.indexOf(caso) + 1).padStart(2, "0")}</span>
          {caso.falhas.length > 1 && <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-expanded={aberta}
            aria-label={t("rowFailures", { tc: caso.tc_id })}
            onPress={() => alternar(caso.caso_teste_id)}
            className="size-6 min-w-0 rounded-md text-muted data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus"
          >
            <ChevronRight aria-hidden="true" className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", aberta && "rotate-90")} />
          </Button>}
        </Linha>;
      },
    },
    {
      id: "tc_id",
      isRowHeader: true,
      className: topo,
      header: t("tcId"),
      cell: (caso) => <Linha><TcIdBotao caso={{ id: caso.caso_teste_id, tc_id: caso.tc_id }} onAbrir={setCasoAberto} /></Linha>,
      exportar: { titulo: t("tcId"), valor: (caso) => caso.tc_id },
    },
    {
      id: "form_factor",
      className: topo,
      header: <DataTableFilter label={t("formFactor")} value={filtros.modelo_dispositivo_id ?? ""} onChange={filtrar("modelo_dispositivo_id")} options={comOpcaoTodos(t("all"), opcoesDevice)} />,
      cell: (caso) => pilha(caso, (falha) => <span className="truncate">{falha.modelo_nome}</span>),
      exportar: { titulo: t("formFactor"), valor: (caso) => caso.falhas[0].modelo_nome },
    },
    {
      id: "sdf_id",
      className: topo,
      header: t("sdfId"),
      cell: (caso) => pilha(caso, (falha) => falha.sdf_id ?? "—"),
      exportar: { titulo: t("sdfId"), valor: (caso) => caso.falhas[0].sdf_id ?? "—" },
    },
    {
      id: "run_date",
      className: `whitespace-nowrap tabular-nums ${topo}`,
      header: t("executionDate"),
      cell: (caso) => pilha(caso, dataHora),
      exportar: { titulo: t("executionDate"), valor: (caso) => dataHora(caso.falhas[0]) },
    },
    {
      id: "status",
      className: topo,
      header: t("status"),
      cell: (caso) => <Linha><TagChip tom={statusChipTons[caso.status]}>{t(ROTULO_STATUS[caso.status])}</TagChip></Linha>,
      exportar: { titulo: t("status"), valor: (caso) => t(ROTULO_STATUS[caso.status]) },
    },
    {
      id: "description",
      className: `w-px whitespace-nowrap ${topo}`,
      header: t("resultDescription"),
      cell: (caso) => pilha(caso, (falha) => falha.descricao
        ? <RowActionButton identificador={`${caso.tc_id} ${falha.modelo_nome}`} action={{ label: t("viewDescription"), icon: <MessageSquareText {...rowActionIconProps} />, onPress: () => setFalhaExibida({ tcId: caso.tc_id, falha }) }} />
        : <span className="block w-full text-center">—</span>),
      exportar: { titulo: t("resultDescription"), valor: (caso) => caso.falhas[0].descricao ?? "—" },
    },
    {
      id: "dev_fix",
      className: topo,
      header: <DataTableFilter label={t("devFix")} value={filtros.dev_fix ?? ""} onChange={filtrar("dev_fix")} placeholder={t("searchAssignee")} />,
      cell: (caso) => <Linha>{podeEscolher
        ? <InlineSelect
          aria-label={`${t("changeDevFix")} ${caso.tc_id}`}
          value={caso.dev_fix_id ?? ""}
          options={opcoesDevFix}
          onChange={(devFixId) => escolherDevFix.mutate({ casoId: caso.caso_teste_id, devFixId })}
          isDisabled={escolherDevFix.isPending}
        >{caso.dev_fix_identificador ?? "—"}</InlineSelect>
        : caso.dev_fix_identificador ?? "—"}</Linha>,
      exportar: { titulo: t("devFix"), valor: (caso) => caso.dev_fix_identificador ?? "—" },
    },
    {
      id: "dev_owner",
      className: topo,
      header: <DataTableFilter label={t("devOwner")} value={filtros.responsavel ?? ""} onChange={filtrar("responsavel")} placeholder={t("searchAssignee")} />,
      cell: (caso) => <Linha>{caso.responsavel_identificador ?? "—"}</Linha>,
      exportar: { titulo: t("devOwner"), valor: (caso) => caso.responsavel_identificador ?? "—" },
    },
  ];

  const estado = estadoDaTabela({
    isLoading: casos.isLoading,
    isError: casos.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("bugReportsLoading"),
    errorLabel: t("bugReportsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noBugReports"), hint: t("noBugReportsHint") },
    filtered: { title: t("noBugReportsResults"), hint: t("noBugReportsResultsHint") },
  });

  const cabecalho = <header className="mb-5 shrink-0">
    <PageTitle>{t("bugReports")}</PageTitle>
    <PageDescription>{t("bugReportsDescription")}</PageDescription>
  </header>;
  if (projetosQuery.isError) {
    return <PageCard>{cabecalho}<ErroComRetry mensagem={t("bugReportsLoadError")} retry={{ label: t("retryQuery"), onRetry: () => void projetosQuery.refetch() }} /></PageCard>;
  }
  if (projetosQuery.isLoading || (!projetoAberto && hasNextPage)) return <PageCard>{cabecalho}<p role="status" className="text-[14px] text-muted">{t("loading")}</p></PageCard>;
  if (!projetoAberto) return <PageCard>{cabecalho}<EstadoVazio className="m-auto" titulo={t("noAccessibleProjects")} dica={t("noAccessibleProjectsHint")} /></PageCard>;

  return <PageCard>
    {cabecalho}
    <div className="mb-5 flex shrink-0 flex-wrap items-center gap-3 border-b border-separator pb-5">
      <div className="min-w-0"><ProjetoSwitcher comoTitulo={false} projetoId={projetoAberto.id} nome={projetoAberto.app} projetos={projetos} buscavel onEscolher={trocarProjeto} /></div>
      <div className="ml-auto">
        <WeekPickerHero permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={filtrar("periodo")} />
      </div>
    </div>
    <DataTable
      aria-label={t("bugReports")}
      columns={colunas}
      items={itens}
      getKey={(caso) => caso.caso_teste_id}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      exportacao={{ listagem: "bug-reports", todosOsItens: () => buscarTodasAsPaginas((page, pageSize) => bugReportsApi.listar(projetoAberto.id, page, pageSize, filtros)) }}
      rowDependencies={[t, podeEscolher, membros.dataUpdatedAt, escolherDevFix.isPending, expandidos, primeiraDaPagina]}
    />
    <DetalhesCasoTesteDrawer caso={casoAberto} perfil={perfil} onFechar={() => setCasoAberto(null)} />
    <DescricaoFalhaDrawer aberta={falhaAberta} onFechar={() => setFalhaExibida(null)} />
  </PageCard>;
}
