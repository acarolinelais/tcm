import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { toast } from "@/shared/lib/toast";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { DataDoSistema } from "@/shared/ui/data-do-sistema";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { InlineSelect } from "@/shared/ui/inline-select";
import { SeloTentativa } from "@/shared/ui/selo-tentativa";
import { TagChip } from "@/shared/ui/tag-chip";

import { casosTesteApi } from "../../api/projetos.api";
import { useMyFixes } from "../../hooks/useProjetos";
import { ROTULO_STATUS, STATUS_DA_CORRECAO, type CasoComFalhas, type FiltrosMyFixes, type StatusDaCorrecao } from "../../model/projeto";
import { TcIdBotao } from "../casos-teste/TcIdBotao";
import { statusChipTons } from "../status/status-chip-estilos";
import { FalhasDoCasoDrawer } from "./FalhasDoCasoDrawer";

/** Spec 073: os casos que a pessoa tem para corrigir no projeto, com o Status da correção na linha. */
// A planilha leva a data como a célula mostra, no idioma da tela (ADR 0042).
const dataExportada = (valor?: string | null) => (valor ? formatDate(valor, { dateStyle: "medium" }) : "—");

export function MyFixesTab({ projetoId }: { projetoId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<FiltrosMyFixes>({});
  const [casoAberto, setCasoAberto] = useState<CasoComFalhas | null>(null);
  const casos = useMyFixes(projetoId, pagina, tamanho, filtros);
  const mudarStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusDaCorrecao }) => casosTesteApi.mudarStatusDaCorrecao(id, status),
    onSuccess: () => Promise.all(["my-fixes", "bug-reports", "projetos"].map((chave) => queryClient.invalidateQueries({ queryKey: [chave] }))),
    onError: (error) => toast.error(error instanceof Error ? error.message : t("caseUpdateError")),
  });
  const filtrar = (proximos: FiltrosMyFixes) => { setPagina(1); setFiltros(proximos); };
  const opcoesStatus = STATUS_DA_CORRECAO.map((status) => ({ value: status, label: t(ROTULO_STATUS[status]) }));
  const itens = casos.data?.items ?? [];

  const colunas: DataTableColumn<CasoComFalhas>[] = [
    {
      id: "tc_id",
      isRowHeader: true,
      header: t("tcId"),
      cell: (caso) => <span className="flex min-w-0 items-center gap-2"><TcIdBotao caso={{ id: caso.caso_teste_id, tc_id: caso.tc_id }} onAbrir={() => setCasoAberto(caso)} /><SeloTentativa tentativa={caso.tentativa_correcao} /></span>,
      exportar: { titulo: t("tcId"), valor: (caso) => caso.tc_id },
    },
    {
      id: "status",
      header: <DataTableMultiFilter label={t("status")} values={filtros.status ?? []} onChange={(status) => filtrar({ ...filtros, status: status.length ? status as StatusDaCorrecao[] : undefined })} options={opcoesStatus} />,
      // RN-10: só os Status da correção, na ordem do fluxo.
      cell: (caso) => (
        <InlineSelect aria-label={`${t("status")} ${caso.tc_id}`} value={caso.status} options={opcoesStatus} isDisabled={mudarStatus.isPending} onChange={(status) => mudarStatus.mutate({ id: caso.caso_teste_id, status: status as StatusDaCorrecao })}>
          <TagChip tom={statusChipTons[caso.status]}>{t(ROTULO_STATUS[caso.status])}</TagChip>
        </InlineSelect>
      ),
      exportar: { titulo: t("status"), valor: (caso) => t(ROTULO_STATUS[caso.status]) },
    },
    {
      id: "dev_owner",
      header: <DataTableFilter label={t("devOwner")} value={filtros.responsavel ?? ""} onChange={(responsavel) => filtrar({ ...filtros, responsavel: responsavel || undefined })} />,
      cell: (caso) => caso.responsavel_identificador ?? "—",
      exportar: { titulo: t("devOwner"), valor: (caso) => caso.responsavel_identificador ?? "—" },
    },
    { id: "dev_fix", header: t("devFix"), cell: (caso) => caso.dev_fix_identificador ?? "—", exportar: { titulo: t("devFix"), valor: (caso) => caso.dev_fix_identificador ?? "—" } },
    { id: "run_date", header: t("executionDate"), cell: (caso) => <DataDoSistema valor={caso.falhas[0]?.data_execucao} />, exportar: { titulo: t("executionDate"), valor: (caso) => dataExportada(caso.falhas[0]?.data_execucao) } },
    { id: "end_date", header: t("endDate"), cell: (caso) => <DataDoSistema valor={caso.correcao_em_revisao_em} />, exportar: { titulo: t("endDate"), valor: (caso) => dataExportada(caso.correcao_em_revisao_em) } },
  ];

  const temFiltro = Boolean(filtros.status?.length || filtros.responsavel);
  const estado = estadoDaTabela({
    isLoading: casos.isLoading,
    isError: casos.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => filtrar({}),
    loadingLabel: t("loading"),
    errorLabel: t("myFixesLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noMyFixes"), hint: t("noMyFixesHint") },
    filtered: { title: t("noBugReportsResults"), hint: t("noBugReportsResultsHint") },
  });

  return <>
    <DataTable
      aria-label={t("myFixes")}
      columns={colunas}
      items={itens}
      getKey={(caso) => caso.caso_teste_id}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={casos.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      rowDependencies={[t, mudarStatus.isPending]}
    />
    <FalhasDoCasoDrawer caso={casoAberto} onFechar={() => setCasoAberto(null)} />
  </>;
}
