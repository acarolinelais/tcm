import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter, DataTableMultiFilter, type DataTableFilterOption } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { HistoryIcon } from "@/shared/ui/figma-icons";
import { RowActions } from "@/shared/ui/row-action-button";
import type { CasoTesteResumo, FormFactorResultados } from "../../model/projeto";
import type { CasoDoResumo } from "../resultados-gerais/ResumoExecucoesDrawer";
import { TcIdBotao } from "../casos-teste/TcIdBotao";
import { colunasPorModelo, rotuloAssignee, rotuloSdf } from "./colunas-form-factor";

type Execucao = FormFactorResultados["items"][number];
type Filtros = { tcId: string; sdfId: string; origem: string; modeloDispositivoId: string; resultado: string };
const chaveDaExecucao = (execucao: Execucao) => execucao.execucao_id;
const SEM_EXECUCOES: Execucao[] = [];

export function FormFactorResultadosTabela({ onAbrirDetalhes, onAbrirHistorico, mostrarAssignee = true, dados, carregando, erro, identificadoresMembros, opcoesAssignee, filtros, responsaveis, onResponsaveisChange, onFiltroChange, onFiltroResultado, onLimparFiltros, buscarTodos, page, pageSize, onPageChange, onPageSizeChange }: {
  /** Abre o painel de detalhes do caso pelo TC ID (spec 030). */
  onAbrirDetalhes: (caso: CasoTesteResumo) => void;
  /** Abre o histórico de execuções do caso, pelo ícone da coluna Actions (spec 058, RN-05). */
  onAbrirHistorico: (caso: CasoDoResumo) => void;
  /** Falso para o dev, que só vê o próprio time e não precisa da coluna (spec 058). */
  mostrarAssignee?: boolean;
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
  /** Todas as execuções com os filtros atuais, para "Exportar todos os itens" (spec 035). */
  buscarTodos: () => Promise<Execucao[]>;
  page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const items = erro ? SEM_EXECUCOES : dados?.items ?? SEM_EXECUCOES;
  const modelos = dados?.modelos ?? [];
  const assigneeDaExecucao = rotuloAssignee(identificadoresMembros);
  // O valor guardado continua `SDF`; só o nome muda (spec 058, RN-04).
  const rotuloOrigem = (execucao: Execucao) => execucao.origem === "SDF" ? t("originSpreadsheet") : t("manual");
  const rotuloData = (execucao: Execucao) => formatDate(execucao.data_reportada, { dateStyle: "short", timeStyle: "short" });
  const colunas: DataTableColumn<Execucao>[] = [
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={filtros.tcId} onChange={(v) => onFiltroChange("tcId", v)} />, cell: (execucao) => <TcIdBotao caso={{ id: execucao.caso_teste_id, tc_id: execucao.tc_id }} onAbrir={onAbrirDetalhes} />, exportar: { titulo: t("tcId"), valor: (execucao) => execucao.tc_id } },
    { id: "sdfId", header: <DataTableFilter label={t("sdfId")} value={filtros.sdfId} onChange={(v) => onFiltroChange("sdfId", v)} />, cell: rotuloSdf, exportar: { titulo: t("sdfId"), valor: rotuloSdf } },
    ...(mostrarAssignee ? [{ id: "assignee", header: <DataTableMultiFilter label={t("assignee")} values={responsaveis} onChange={onResponsaveisChange} options={opcoesAssignee} searchable />, cell: assigneeDaExecucao, exportar: { titulo: t("assignee"), valor: assigneeDaExecucao } }] : []),
    { id: "origem", header: <DataTableFilter label={t("origin")} value={filtros.origem} onChange={(v) => onFiltroChange("origem", v)} options={comOpcaoTodos(t("all"), [{ value: "SDF", label: t("originSpreadsheet") }, { value: "MANUAL", label: t("manual") }])} />, cell: rotuloOrigem, exportar: { titulo: t("origin"), valor: rotuloOrigem } },
    ...colunasPorModelo<Execucao>(t, modelos, { modeloId: filtros.modeloDispositivoId, resultado: filtros.resultado }, onFiltroResultado),
    { id: "data", header: t("date"), cell: rotuloData, exportar: { titulo: t("date"), valor: rotuloData } },
    {
      id: "acoes",
      header: t("actions"),
      className: "w-px whitespace-nowrap",
      cell: (execucao) => <RowActions identificador={execucao.tc_id} actions={[{
        label: t("viewExecutionHistory"),
        icon: <HistoryIcon />,
        onPress: () => onAbrirHistorico({ caso_teste_id: execucao.caso_teste_id, tc_id: execucao.tc_id, responsavel_identificador: identificadoresMembros[execucao.responsavel_id] ?? null }),
      }]} />,
    },
  ];

  return <DataTable
    aria-label={t("formFactorResults")}
    columns={colunas}
    items={items}
    getKey={chaveDaExecucao}
    exportacao={{ listagem: "form-factor-resultados", todosOsItens: buscarTodos }}
    rowDependencies={[t, modelos, identificadoresMembros, mostrarAssignee, onAbrirHistorico]}
    state={estadoDaTabela({
      isLoading: carregando,
      isError: erro,
      isEmpty: !items.length,
      hasFilters: responsaveis.length > 0 || Object.values(filtros).some(Boolean),
      onClearFilters: onLimparFiltros,
      loadingLabel: t("loading"),
      errorLabel: t("resultsLoadError"),
      clearFiltersLabel: t("clearFilters"),
      empty: { title: t("noResults"), hint: t("formFactorResultsHint") },
      filtered: { title: t("noResults"), hint: t("adjustFilters") },
    })}
    pagination={<DataTablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />}
  />;
}
