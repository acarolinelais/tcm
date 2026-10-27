import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { RowActions } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";

import type { FormFactorMatriz } from "../../model/projeto";
import { colunasPorModelo } from "./colunas-form-factor";
import { estadoCasosTeste } from "../casos-teste/estado-casos-teste";

type Linha = FormFactorMatriz["items"][number];
const chaveDaLinha = (linha: Linha) => linha.caso_teste_id;
const SEM_LINHAS: Linha[] = [];

export function FormFactorTabela({ dados, carregando, erro, identificadoresMembros, opcoesAssignee, assignee, onAssigneeChange, tcId = "", sdfId = "", onFiltroTexto, modeloDispositivoId = "", resultadoFiltro = "", onFiltroResultado, podeRegistrar = false, onRegistrar, temFiltros, onLimparFiltros, page, pageSize, onPageChange, onPageSizeChange }: {
  dados: FormFactorMatriz | undefined;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  opcoesAssignee: { value: string; label: string }[];
  assignee: string;
  onAssigneeChange: (valor: string) => void;
  tcId?: string; sdfId?: string; onFiltroTexto?: (campo: "tcId" | "sdfId", valor: string) => void;
  modeloDispositivoId?: string; resultadoFiltro?: string; onFiltroResultado?: (modeloId: string, resultado: string) => void;
  podeRegistrar?: boolean;
  onRegistrar?: (linha: Linha) => void;
  temFiltros: boolean;
  onLimparFiltros: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const modelos = dados?.modelos ?? [];
  const linhas = erro ? SEM_LINHAS : dados?.items ?? SEM_LINHAS;
  const primeiraDaPagina = (page - 1) * pageSize;

  const colunas: DataTableColumn<Linha>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (linha) => String(primeiraDaPagina + linhas.indexOf(linha) + 1).padStart(2, "0") },
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={tcId} onChange={(valor) => onFiltroTexto?.("tcId", valor)} />, cell: (linha) => linha.tc_id },
    { id: "sdfId", header: <DataTableFilter label={t("sdfId")} value={sdfId} onChange={(valor) => onFiltroTexto?.("sdfId", valor)} />, cell: (linha) => linha.sdf_id ?? "—" },
    { id: "assignee", header: <DataTableFilter label={t("assignee")} value={assignee} onChange={onAssigneeChange} options={comOpcaoTodos(t("all"), opcoesAssignee)} searchable />, cell: (linha) => identificadoresMembros[linha.responsavel_id] ?? "—" },
    ...colunasPorModelo<Linha>(t, modelos, { modeloId: modeloDispositivoId, resultado: resultadoFiltro }, (modeloId, valor) => onFiltroResultado?.(modeloId, valor)),
    { id: "data", header: t("date"), cell: (linha) => linha.data_reportada ? formatDate(linha.data_reportada) : "—" },
    ...(podeRegistrar ? [{
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (linha: Linha) => <RowActions identificador={linha.tc_id} actions={[{ label: t("recordResult"), icon: <Plus {...rowActionIconProps} />, onPress: () => onRegistrar?.(linha) }]} />,
    }] : []),
  ];

  return <DataTable
    aria-label={t("formFactorSummary")}
    columns={colunas}
    items={linhas}
    getKey={chaveDaLinha}
    rowDependencies={[t, modelos, identificadoresMembros, podeRegistrar, onRegistrar, primeiraDaPagina]}
    state={estadoCasosTeste(t, { isLoading: carregando, isError: erro, isEmpty: !linhas.length, hasFilters: temFiltros, onClearFilters: onLimparFiltros, errorLabel: t("formFactorLoadError") })}
    pagination={<DataTablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
  />;
}
