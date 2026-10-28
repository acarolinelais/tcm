import { Link } from "react-router";
import { useTranslation } from "react-i18next";
import { History } from "lucide-react";
import type { TFunction } from "i18next";

import { formatDate } from "@/core/i18n/format";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { linkClassName } from "@/shared/ui/link";
import type { CasoTesteResumo, Projeto } from "../../model/projeto";
import type { FormFactorGlobal, FiltrosFormFactorGlobal, FormFactorResultadosGlobais } from "../../model/projeto";
import { TcIdBotao } from "../casos-teste/TcIdBotao";
import { colunasPorModelo } from "./colunas-form-factor";

type Filtro = keyof Pick<FiltrosFormFactorGlobal, "projetoId" | "responsavelId" | "tcId" | "sdfId" | "modeloDispositivoId" | "resultado" | "origem">;
type DadosGlobais = FormFactorGlobal | FormFactorResultadosGlobais;
type Linha = DadosGlobais["items"][number];

interface Props<T extends DadosGlobais> {
  dados: T | undefined;
  carregando: boolean;
  erro: boolean;
  projetos: Projeto[];
  filtros: FiltrosFormFactorGlobal;
  onFiltroChange: (campo: Filtro, valor: string) => void;
  /** Abre o painel de detalhes do caso pelo TC ID (spec 030). */
  onAbrirDetalhes: (caso: CasoTesteResumo) => void;
  onLimparFiltros: () => void;
  temFiltros: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const SEM_LINHAS: Linha[] = [];

/** Colunas que o Resumo e o histórico compartilham: projeto, TC, SDF ID e responsável, com os filtros no cabeçalho. */
function colunasComuns<T extends Linha>(t: TFunction, { dados, projetos, filtros, onFiltroChange, onAbrirDetalhes }: Props<DadosGlobais>): DataTableColumn<T>[] {
  const responsaveis = dados?.responsaveis ?? [];
  return [
    {
      id: "projeto",
      header: <DataTableFilter label={t("project")} value={filtros.projetoId ?? ""} onChange={(value) => onFiltroChange("projetoId", value)} options={comOpcaoTodos(t("all"), projetos.map((projeto) => ({ value: projeto.id, label: projeto.nome })))} searchable />,
      cell: (linha) => <Link to={`/projetos/${linha.projeto_id}`} className={linkClassName}>{linha.projeto_nome}</Link>,
    },
    { id: "tcId", isRowHeader: true, header: <DataTableFilter label={t("tcId")} value={filtros.tcId ?? ""} onChange={(value) => onFiltroChange("tcId", value)} />, cell: (linha) => <TcIdBotao caso={{ id: linha.caso_teste_id, tc_id: linha.tc_id }} onAbrir={onAbrirDetalhes} /> },
    { id: "sdfId", header: <DataTableFilter label={t("sdfId")} value={filtros.sdfId ?? ""} onChange={(value) => onFiltroChange("sdfId", value)} />, cell: (linha) => linha.sdf_id ?? "—" },
    {
      id: "assignee",
      header: <DataTableFilter label={t("assignee")} value={filtros.responsavelId ?? ""} onChange={(value) => onFiltroChange("responsavelId", value)} options={comOpcaoTodos(t("all"), responsaveis.map((responsavel) => ({ value: responsavel.id, label: responsavel.identificador })))} searchable />,
      cell: (linha) => responsaveis.find((item) => item.id === linha.responsavel_id)?.identificador ?? "—",
    },
  ];
}

/** Um modelo por coluna; o que não pertence ao projeto da linha aparece como N/A. */
function colunasDosModelos<T extends Linha>(t: TFunction, { dados, filtros, onFiltroChange }: Props<DadosGlobais>): DataTableColumn<T>[] {
  return colunasPorModelo<T>(
    t,
    dados?.modelos ?? [],
    { modeloId: filtros.modeloDispositivoId ?? "", resultado: filtros.resultado ?? "" },
    (modeloId, valor) => { onFiltroChange("modeloDispositivoId", valor ? modeloId : ""); onFiltroChange("resultado", valor); },
    (linha, modeloId) => linha.modelos_ids.includes(modeloId),
  );
}

function estadoGlobal(t: TFunction, props: Props<DadosGlobais>, vazio: boolean) {
  return estadoDaTabela({
    isLoading: props.carregando,
    isError: props.erro,
    isEmpty: vazio,
    hasFilters: props.temFiltros,
    onClearFilters: props.onLimparFiltros,
    loadingLabel: t("loading"),
    errorLabel: t("resultsLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <History aria-hidden="true" className="size-5" />, title: t("noGlobalResults"), hint: t("noGlobalResultsHint") },
    filtered: { title: t("noResults"), hint: t("noGlobalResultsFiltered") },
  });
}

/** Resumo: o resultado mais recente de cada Test Case, por modelo. */
export function FormFactorGlobalTabela(props: Props<FormFactorGlobal>) {
  const { t } = useTranslation();
  const linhas = props.erro ? SEM_LINHAS : props.dados?.items ?? SEM_LINHAS;
  const primeiraDaPagina = (props.page - 1) * props.pageSize;
  const colunas: DataTableColumn<Linha>[] = [
    { id: "numero", header: "", className: "w-12 text-right tabular-nums text-muted after:hidden", cell: (linha) => String(primeiraDaPagina + linhas.indexOf(linha) + 1).padStart(2, "0") },
    ...colunasComuns<Linha>(t, props),
    ...colunasDosModelos<Linha>(t, props),
    { id: "data", header: t("date"), cell: (linha) => linha.data_reportada ? formatDate(linha.data_reportada, { dateStyle: "short" }) : "—" },
  ];
  return <DataTable
    aria-label={t("formFactorSummary")}
    columns={colunas}
    items={linhas}
    getKey={(linha) => linha.caso_teste_id}
    state={estadoGlobal(t, props, !linhas.length)}
    pagination={<DataTablePagination page={props.page} pageSize={props.pageSize} totalCount={props.dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />}
    rowDependencies={[t, props.dados, primeiraDaPagina]}
  />;
}

/** Histórico: uma linha por execução registrada, com a origem (SDF ou manual). */
export function FormFactorGlobalResultadosTabela(props: Props<FormFactorResultadosGlobais>) {
  const { t } = useTranslation();
  type Execucao = FormFactorResultadosGlobais["items"][number];
  const execucoes: Execucao[] = props.erro ? [] : props.dados?.items ?? [];
  const colunas: DataTableColumn<Execucao>[] = [
    ...colunasComuns<Execucao>(t, props),
    {
      id: "origem",
      header: <DataTableFilter label={t("origin")} value={props.filtros.origem ?? ""} onChange={(value) => props.onFiltroChange("origem", value)} options={comOpcaoTodos(t("all"), [{ value: "SDF", label: "SDF" }, { value: "MANUAL", label: t("manual") }])} />,
      cell: (execucao) => execucao.origem === "MANUAL" ? t("manual") : "SDF",
    },
    ...colunasDosModelos<Execucao>(t, props),
    { id: "data", header: t("date"), cell: (execucao) => formatDate(execucao.data_reportada, { dateStyle: "short", timeStyle: "short" }) },
  ];
  return <DataTable
    aria-label={t("generalResultsAll")}
    columns={colunas}
    items={execucoes}
    getKey={(execucao) => execucao.execucao_id}
    state={estadoGlobal(t, props, !execucoes.length)}
    pagination={<DataTablePagination page={props.page} pageSize={props.pageSize} totalCount={props.dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />}
    rowDependencies={[t, props.dados]}
  />;
}
