import { Button, Tooltip } from "@heroui/react";
import { History, ListChecks } from "lucide-react";
import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { InlineSelect } from "@/shared/ui/inline-select";
import { RowActions } from "@/shared/ui/row-action-button";
import type { CasoHistorico, CasoTesteResumo, FiltrosHistoricoProjeto, HistoricoProjeto, ResultadoNaData } from "../../model/projeto";
import { TcIdBotao } from "../casos-teste/TcIdBotao";
import { formatarDia } from "./formatar-dia";
import { ResultadoBotao, SemExecucao } from "./ResultadoBotao";

/** Resultado aberto na janela da RN-09: o caso, o device e o dia da célula. */
export interface ResultadoAberto {
  tcId: string;
  device: string;
  dia: string;
  resultado: ResultadoNaData;
}

type FiltroCabecalho = keyof Pick<FiltrosHistoricoProjeto, "tcId" | "modeloDispositivoId">;

interface Props {
  dados: HistoricoProjeto | undefined;
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
  filtros: FiltrosHistoricoProjeto;
  onFiltroChange: (campo: FiltroCabecalho, valor: string) => void;
  temFiltros: boolean;
  onLimparFiltros: () => void;
  /** Modelo escolhido na linha (RN-03); sem escolha, o padrão do caso, que já considera a busca por device (RN-04, RN-10). */
  modeloDaLinha: (caso: CasoHistorico) => string;
  onModeloChange: (casoId: string, modeloId: string) => void;
  onAbrirResultado: (resultado: ResultadoAberto) => void;
  onAbrirResumo: (caso: CasoHistorico) => void;
  onAbrirDetalhes: (caso: CasoTesteResumo) => void;
  /** Todos os casos com os filtros atuais, para "Exportar todos os itens" (spec 035). */
  buscarTodos: () => Promise<CasoHistorico[]>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

const SEM_CASOS: CasoHistorico[] = [];

// TC ID e Form Factor ficam fixos ao rolar para os lados (RN-05); a largura fixa do TC ID dá o recuo do Form Factor.
const fixa = "sticky z-[1] bg-surface [thead_&]:bg-surface-secondary";

/** Resultados Gerais de um projeto (specs 032 e 033): uma página de casos e até 7 datas, as mesmas em todas as páginas (ADR 0039). */
export function HistoricoProjetoTabela(props: Props) {
  const { t } = useTranslation();
  const { dados, filtros, modeloDaLinha } = props;
  const casos = props.erro ? SEM_CASOS : dados?.items ?? SEM_CASOS;
  // O nome do modelo é lido em cada célula: o mapa evita uma busca por célula.
  const { nomes, opcoesModelos } = useMemo(() => {
    const modelos = dados?.modelos ?? [];
    return {
      nomes: new Map(modelos.map((modelo) => [modelo.id, modelo.nome])),
      opcoesModelos: modelos.map((modelo) => ({ value: modelo.id, label: modelo.nome })),
    };
  }, [dados?.modelos]);
  const nomeDoModelo = (modeloId: string) => nomes.get(modeloId) ?? "";

  const colunas: DataTableColumn<CasoHistorico>[] = [
    {
      id: "tcId",
      isRowHeader: true,
      className: `${fixa} left-0 w-40 min-w-40 max-w-40`,
      header: <DataTableFilter label={t("tcId")} value={filtros.tcId ?? ""} onChange={(valor) => props.onFiltroChange("tcId", valor)} />,
      cell: (caso) => <TcIdBotao caso={{ id: caso.caso_teste_id, tc_id: caso.tc_id }} onAbrir={props.onAbrirDetalhes} />,
      exportar: { titulo: t("tcId"), valor: (caso) => caso.tc_id },
    },
    {
      id: "formFactor",
      className: `${fixa} left-40 w-40 min-w-40`,
      header: <DataTableFilter label={t("formFactor")} value={filtros.modeloDispositivoId ?? ""} onChange={(valor) => props.onFiltroChange("modeloDispositivoId", valor)} options={comOpcaoTodos(t("all"), opcoesModelos)} />,
      exportar: { titulo: t("formFactor"), valor: (caso) => nomeDoModelo(modeloDaLinha(caso)) },
      cell: (caso) => {
        const modeloId = modeloDaLinha(caso);
        return <InlineSelect aria-label={t("formFactorOfCase", { tcId: caso.tc_id })} value={modeloId} options={opcoesModelos} onChange={(valor) => props.onModeloChange(caso.caso_teste_id, valor)}>
          <span className="truncate">{nomeDoModelo(modeloId)}</span>
        </InlineSelect>;
      },
    },
    ...(dados?.datas ?? []).map<DataTableColumn<CasoHistorico>>((dia) => ({
      id: `dia-${dia}`,
      className: "min-w-28",
      // Como na tela: o resultado do dia no modelo escolhido para a linha.
      exportar: { titulo: formatarDia(dia), valor: (caso) => caso.resultados[dia]?.[modeloDaLinha(caso)]?.resultado ?? "—" },
      header: <Tooltip delay={300} closeDelay={0}>
        <Button variant="ghost" className="h-7 min-h-0 rounded-md px-1 text-[14px] font-medium text-muted hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus">
          {formatarDia(dia)}
        </Button>
        <Tooltip.Content className="text-[12px]">{t("sdfResult")}</Tooltip.Content>
      </Tooltip>,
      cell: (caso) => {
        const modeloId = modeloDaLinha(caso);
        const device = nomeDoModelo(modeloId);
        const resultado = caso.resultados[dia]?.[modeloId];
        if (!resultado) return <SemExecucao device={device} dia={dia} />;
        return <ResultadoBotao resultado={resultado.resultado} device={device} dia={dia} onPress={() => props.onAbrirResultado({ tcId: caso.tc_id, device, dia, resultado })} />;
      },
    })),
    {
      id: "acoes",
      header: t("actions"),
      cell: (caso) => <RowActions identificador={caso.tc_id} actions={[{ label: t("executionSummary"), icon: <ListChecks aria-hidden="true" className="size-3" strokeWidth={1.25} />, onPress: () => props.onAbrirResumo(caso) }]} />,
    },
  ];

  return <DataTable
    aria-label={t("generalResults")}
    columns={colunas}
    items={casos}
    getKey={(caso) => caso.caso_teste_id}
    exportacao={{ listagem: "resultados-gerais", todosOsItens: props.buscarTodos }}
    state={estadoDaTabela({
      isLoading: props.carregando,
      isError: props.erro,
      isEmpty: !casos.length,
      hasFilters: props.temFiltros,
      onClearFilters: props.onLimparFiltros,
      loadingLabel: t("loading"),
      errorLabel: t("resultsLoadError"),
      clearFiltersLabel: t("clearFilters"),
      retry: { label: t("retryQuery"), onRetry: props.onTentarDeNovo },
      empty: { icon: <History aria-hidden="true" className="size-5" />, title: t("noProjectCases"), hint: t("noProjectCasesHint") },
      filtered: { title: t("noResults"), hint: t("noGlobalResultsFiltered") },
    })}
    pagination={<DataTablePagination page={props.page} pageSize={props.pageSize} totalCount={dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />}
    rowDependencies={[t, dados, modeloDaLinha]}
  />;
}
