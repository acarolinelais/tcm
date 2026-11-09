import { useState } from "react";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useOutletContext } from "react-router";
import { useTranslation } from "react-i18next";

import type { PerfilAtual } from "@/core/auth/api";
import { formatDate } from "@/core/i18n/format";
import { DetalhesCasoTesteDrawer } from "@/modules/projetos/components/casos-teste/DetalhesCasoTesteDrawer";
import { TcIdBotao } from "@/modules/projetos/components/casos-teste/TcIdBotao";
import { statusChipTons } from "@/modules/projetos/components/status/status-chip-estilos";
import { casosTesteApi, projetosApi } from "@/modules/projetos/api/projetos.api";
import { ROTULO_STATUS, perfilGerenciaCasos, type CasoTesteResumo } from "@/modules/projetos/model/projeto";
import { timesApi } from "@/modules/times/api/times.api";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { InlineSelect } from "@/shared/ui/inline-select";
import { PageCard, PageDescription, PageTitle } from "@/shared/ui/page-card";
import { TagChip } from "@/shared/ui/tag-chip";

import { bugReportsApi } from "../api/bug-reports.api";
import { useBugReports } from "../hooks/useBugReports";
import type { FalhaAberta, FiltrosBugReport } from "../model/bug-report";

const dataHora = (falha: FalhaAberta) => formatDate(falha.data_execucao, { dateStyle: "short", timeStyle: "short" });

export function BugReportsPage() {
  const { t } = useTranslation();
  const perfil = useOutletContext<PerfilAtual>();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<FiltrosBugReport>({});
  const [casoAberto, setCasoAberto] = useState<CasoTesteResumo | null>(null);
  const falhas = useBugReports(pagina, tamanho, filtros);
  const pessoal = perfil.perfil_codigo === "USUARIO_PADRAO";
  const projetos = useQuery({ queryKey: ["opcoes-projetos", "bug-reports", pessoal], queryFn: () => buscarTodasAsPaginas((page, pageSize) => projetosApi.listar(page, pageSize, pessoal)) });

  const itens = falhas.isError ? [] : falhas.data?.items ?? [];
  const podeTrocar = perfilGerenciaCasos(perfil);
  const timeIds = podeTrocar ? [...new Set(itens.map((falha) => falha.time_id))] : [];
  const consultasMembros = useQueries({
    queries: timeIds.map((timeId) => ({ queryKey: ["time-membros", timeId], queryFn: () => timesApi.membros(timeId) })),
  });
  const opcoesPorTime = Object.fromEntries(consultasMembros.map((consulta, indice) => [timeIds[indice], (consulta.data ?? [])
    .filter((membro) => membro.ativo)
    .map((membro) => ({ value: membro.usuario_id, label: membro.usuario_user_id ?? membro.usuario_nome ?? "—" }))]));
  const client = useQueryClient();
  const trocarResponsavel = useMutation({
    mutationFn: ({ casoId, responsavelId }: { casoId: string; responsavelId: string }) => casosTesteApi.atualizar(casoId, { responsavel_id: responsavelId }),
    onSuccess: () => toast.success(t("assigneeChanged")),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseUpdateError")),
    onSettled: () => Promise.all([client.invalidateQueries({ queryKey: ["bug-reports"] }), client.invalidateQueries({ queryKey: ["projetos"] }), client.invalidateQueries({ queryKey: ["overview"] })]),
  });
  const temFiltro = Object.values(filtros).some(Boolean);
  const filtro = (campo: keyof FiltrosBugReport) => (valor: string) => { setPagina(1); setFiltros({ ...filtros, [campo]: valor || undefined }); };
  // O catálogo de modelos exige gestão: as opções de device saem das falhas carregadas.
  const opcoesDevice = [...new Map(itens.map((falha) => [falha.modelo_dispositivo_id, falha.modelo_nome])).entries()]
    .map(([value, label]) => ({ value, label }))
    .sort((a, b) => a.label.localeCompare(b.label));

  const colunas: DataTableColumn<FalhaAberta>[] = [
    {
      id: "tc_id",
      isRowHeader: true,
      header: t("tcId"),
      cell: (falha) => <TcIdBotao caso={{ id: falha.caso_teste_id, tc_id: falha.tc_id }} onAbrir={setCasoAberto} />,
      exportar: { titulo: t("tcId"), valor: (falha) => falha.tc_id },
    },
    {
      id: "projeto",
      header: <DataTableFilter label={t("project")} value={filtros.projeto_id ?? ""} onChange={filtro("projeto_id")} options={comOpcaoTodos(t("all"), (projetos.data ?? []).map((projeto) => ({ value: projeto.id, label: projeto.nome })))} searchable />,
      cell: (falha) => falha.projeto_nome,
      exportar: { titulo: t("project"), valor: (falha) => falha.projeto_nome },
    },
    {
      id: "device",
      header: <DataTableFilter label={t("device")} value={filtros.modelo_dispositivo_id ?? ""} onChange={filtro("modelo_dispositivo_id")} options={comOpcaoTodos(t("all"), opcoesDevice)} />,
      cell: (falha) => falha.modelo_nome,
      exportar: { titulo: t("device"), valor: (falha) => falha.modelo_nome },
    },
    {
      id: "sdf_id",
      header: t("sdfId"),
      cell: (falha) => falha.sdf_id ?? "—",
      exportar: { titulo: t("sdfId"), valor: (falha) => falha.sdf_id ?? "—" },
    },
    {
      id: "motivo",
      header: t("failReason"),
      cell: (falha) => falha.motivo ? <span className="block max-w-[360px] truncate" title={falha.motivo}>{falha.motivo}</span> : "—",
      exportar: { titulo: t("failReason"), valor: (falha) => falha.motivo ?? "—" },
    },
    {
      id: "data_execucao",
      header: t("executionDate"),
      cell: dataHora,
      className: "whitespace-nowrap tabular-nums",
      exportar: { titulo: t("executionDate"), valor: dataHora },
    },
    {
      id: "status",
      header: t("status"),
      cell: (falha) => <TagChip tom={statusChipTons[falha.status]}>{t(ROTULO_STATUS[falha.status])}</TagChip>,
      exportar: { titulo: t("status"), valor: (falha) => t(ROTULO_STATUS[falha.status]) },
    },
    {
      id: "responsavel",
      header: <DataTableFilter label={t("assignee")} value={filtros.responsavel ?? ""} onChange={filtro("responsavel")} placeholder={t("searchAssignee")} />,
      cell: (falha) => podeTrocar
        ? <InlineSelect
          aria-label={`${t("changeAssignee")} ${falha.tc_id} ${falha.modelo_nome}`}
          value={falha.responsavel_id}
          // A API recusa o backup como responsável; ele nem aparece na lista.
          options={(opcoesPorTime[falha.time_id] ?? []).filter((opcao) => opcao.value !== falha.backup_id)}
          onChange={(responsavelId) => trocarResponsavel.mutate({ casoId: falha.caso_teste_id, responsavelId })}
          isDisabled={trocarResponsavel.isPending}
        >{falha.responsavel_identificador ?? "—"}</InlineSelect>
        : falha.responsavel_identificador ?? "—",
      exportar: { titulo: t("assignee"), valor: (falha) => falha.responsavel_identificador ?? "—" },
    },
  ];

  const estado = estadoDaTabela({
    isLoading: falhas.isLoading,
    isError: falhas.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => { setPagina(1); setFiltros({}); },
    loadingLabel: t("bugReportsLoading"),
    errorLabel: t("bugReportsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noBugReports"), hint: t("noBugReportsHint") },
    filtered: { title: t("noBugReportsResults"), hint: t("noBugReportsResultsHint") },
  });

  return <PageCard>
    <header className="mb-5 shrink-0">
      <PageTitle>{t("bugReports")}</PageTitle>
      <PageDescription>{t("bugReportsDescription")}</PageDescription>
    </header>
    <DataTable
      aria-label={t("bugReports")}
      columns={colunas}
      items={itens}
      getKey={(falha) => `${falha.caso_teste_id}-${falha.modelo_dispositivo_id}`}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={falhas.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      exportacao={{ listagem: "bug-reports", todosOsItens: () => buscarTodasAsPaginas((page, pageSize) => bugReportsApi.listar(page, pageSize, filtros)) }}
      rowDependencies={[t, podeTrocar, consultasMembros.map((consulta) => consulta.dataUpdatedAt).join(), trocarResponsavel.isPending]}
    />
    <DetalhesCasoTesteDrawer caso={casoAberto} perfil={perfil} onFechar={() => setCasoAberto(null)} />
  </PageCard>;
}
