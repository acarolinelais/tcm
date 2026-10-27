import { History } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter, type DataTableFilterOption } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import type { FormFactorResultados } from "../../model/projeto";
import { colunasPorModelo } from "./colunas-form-factor";

type Execucao = FormFactorResultados["items"][number];
type Filtros = { tcId: string; sdfId: string; origem: string; modeloDispositivoId: string; resultado: string };
const chaveDaExecucao = (execucao: Execucao) => execucao.execucao_id;
const SEM_EXECUCOES: Execucao[] = [];

export function FormFactorResultadosTabela({ dados, carregando, erro, identificadoresMembros, opcoesAssignee, filtros, responsaveis, onResponsaveisChange, onFiltroChange, onFiltroResultado, onLimparFiltros, page, pageSize, onPageChange, onPageSizeChange }: {
  dados?: FormFactorResultados;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  opcoesAssignee: DataTableFilterOption[];
  filtros: Filtros;
  /** Responsáveis escolhidos no filtro (seleção múltipla); vazio desliga o filtro. */
  responsaveis: string[];
  onResponsaveisChange: (valores: string[]) => void;
  onFiltroChange: (campo: Exclude<keyof Filtros, "modeloDispositivoId" | "resultado">, valor: string) => void;
  /** O filtro de resultado vale para um modelo por vez: muda os dois campos de uma vez. */
  onFiltroResultado: (modeloId: string, resultado: string) => void;
  onLimparFiltros: () => void;
  page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const items = erro ? SEM_EXECUCOES : dados?.items ?? SEM_EXECUCOES;
  const modelos = dados?.modelos ?? [];
  const colunas: DataTableColumn<Execucao>[] = [
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={filtros.tcId} onChange={(v) => onFiltroChange("tcId", v)} />, cell: (execucao) => execucao.tc_id },
    { id: "sdfId", header: <DataTableFilter label={t("sdfId")} value={filtros.sdfId} onChange={(v) => onFiltroChange("sdfId", v)} />, cell: (execucao) => execucao.sdf_id ?? "—" },
    { id: "assignee", header: <DataTableMultiFilter label={t("assignee")} values={responsaveis} onChange={onResponsaveisChange} options={opcoesAssignee} searchable />, cell: (execucao) => identificadoresMembros[execucao.responsavel_id] ?? "—" },
    { id: "origem", header: <DataTableFilter label={t("origin")} value={filtros.origem} onChange={(v) => onFiltroChange("origem", v)} options={comOpcaoTodos(t("all"), [{ value: "SDF", label: "SDF" }, { value: "MANUAL", label: t("manual") }])} />, cell: (execucao) => execucao.origem === "SDF" ? "SDF" : t("manual") },
    ...colunasPorModelo<Execucao>(t, modelos, { modeloId: filtros.modeloDispositivoId, resultado: filtros.resultado }, onFiltroResultado),
    { id: "data", header: t("date"), cell: (execucao) => formatDate(execucao.data_reportada, { dateStyle: "short", timeStyle: "short" }) },
  ];

  return <DataTable
    aria-label={t("formFactorResults")}
    columns={colunas}
    items={items}
    getKey={chaveDaExecucao}
    rowDependencies={[t, modelos, identificadoresMembros]}
    state={estadoDaTabela({
      isLoading: carregando,
      isError: erro,
      isEmpty: !items.length,
      hasFilters: responsaveis.length > 0 || Object.values(filtros).some(Boolean),
      onClearFilters: onLimparFiltros,
      loadingLabel: t("loading"),
      errorLabel: t("resultsLoadError"),
      clearFiltersLabel: t("clearFilters"),
      empty: { icon: <History aria-hidden="true" className="size-5" />, title: t("noResults"), hint: t("formFactorResultsHint") },
      filtered: { title: t("noResults"), hint: t("adjustFilters") },
    })}
    pagination={<DataTablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
  />;
}
