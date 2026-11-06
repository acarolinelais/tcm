import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { RowActions } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";

import type { CasoTesteResumo, FormFactorMatriz } from "../../model/projeto";
import { colunasPorModelo, rotuloAssignee, rotuloSdf } from "./colunas-form-factor";
import { estadoCasosTeste } from "../casos-teste/estado-casos-teste";
import { TcIdBotao } from "../casos-teste/TcIdBotao";

type Linha = FormFactorMatriz["items"][number];
const chaveDaLinha = (linha: Linha) => linha.caso_teste_id;
const SEM_LINHAS: Linha[] = [];

export function FormFactorTabela({ dados, carregando, erro, identificadoresMembros, opcoesAssignee, assignee, onAssigneeChange, tcId = "", sdfId = "", onFiltroTexto, modeloDispositivoId = "", resultadoFiltro = "", onFiltroResultado, podeRegistrar, onRegistrar, onAbrirDetalhes, buscarTodos, temFiltros, onLimparFiltros, page, pageSize, onPageChange, onPageSizeChange }: {
  dados: FormFactorMatriz | undefined;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  opcoesAssignee: { value: string; label: string }[];
  /** Responsáveis escolhidos no filtro (seleção múltipla); vazio desliga o filtro. */
  assignee: string[];
  onAssigneeChange: (valores: string[]) => void;
  tcId?: string; sdfId?: string; onFiltroTexto?: (campo: "tcId" | "sdfId", valor: string) => void;
  modeloDispositivoId?: string; resultadoFiltro?: string; onFiltroResultado?: (modeloId: string, resultado: string) => void;
  podeRegistrar?: (linha: Linha) => boolean;
  onRegistrar?: (linha: Linha) => void;
  /** Abre o painel de detalhes do caso pelo TC ID (spec 030). */
  onAbrirDetalhes: (caso: CasoTesteResumo) => void;
  /** Todas as linhas com os filtros atuais, para "Exportar todos os itens" (spec 035). */
  buscarTodos: () => Promise<Linha[]>;
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
  // A coluna só aparece quando alguma linha da página tem ação para este usuário.
  const comAcoes = podeRegistrar ? linhas.some(podeRegistrar) : false;

  const assigneeDaLinha = rotuloAssignee(identificadoresMembros);
  const rotuloData = (linha: Linha) => linha.data_reportada ? formatDate(linha.data_reportada) : "—";
  const colunas: DataTableColumn<Linha>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (linha) => String(primeiraDaPagina + linhas.indexOf(linha) + 1).padStart(2, "0") },
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={tcId} onChange={(valor) => onFiltroTexto?.("tcId", valor)} />, cell: (linha) => <TcIdBotao caso={{ id: linha.caso_teste_id, tc_id: linha.tc_id }} onAbrir={onAbrirDetalhes} />, exportar: { titulo: t("tcId"), valor: (linha) => linha.tc_id } },
    { id: "sdfId", header: <DataTableFilter label={t("sdfId")} value={sdfId} onChange={(valor) => onFiltroTexto?.("sdfId", valor)} />, cell: rotuloSdf, exportar: { titulo: t("sdfId"), valor: rotuloSdf } },
    { id: "assignee", header: <DataTableMultiFilter label={t("assignee")} values={assignee} onChange={onAssigneeChange} options={opcoesAssignee} searchable />, cell: assigneeDaLinha, exportar: { titulo: t("assignee"), valor: assigneeDaLinha } },
    ...colunasPorModelo<Linha>(t, modelos, { modeloId: modeloDispositivoId, resultado: resultadoFiltro }, (modeloId, valor) => onFiltroResultado?.(modeloId, valor)),
    { id: "data", header: t("date"), cell: rotuloData, exportar: { titulo: t("date"), valor: rotuloData } },
    ...(comAcoes ? [{
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (linha: Linha) => podeRegistrar?.(linha) && <RowActions identificador={linha.tc_id} actions={[{ label: t("recordResult"), icon: <Plus {...rowActionIconProps} />, onPress: () => onRegistrar?.(linha) }]} />,
    }] : []),
  ];

  return <DataTable
    aria-label={t("formFactorSummary")}
    columns={colunas}
    items={linhas}
    getKey={chaveDaLinha}
    exportacao={{ listagem: "form-factor", todosOsItens: buscarTodos }}
    rowDependencies={[t, modelos, identificadoresMembros, podeRegistrar, onRegistrar, primeiraDaPagina]}
    state={estadoCasosTeste(t, { isLoading: carregando, isError: erro, isEmpty: !linhas.length, hasFilters: temFiltros, onClearFilters: onLimparFiltros, errorLabel: t("formFactorLoadError") })}
    pagination={<DataTablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
  />;
}
