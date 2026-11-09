import { Button, Tooltip } from "@heroui/react";
import { ChevronRight, Plus } from "lucide-react";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { cn } from "@/shared/lib/utils";
import { comOpcaoTodos } from "@/shared/lib/opcoes";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { HistoryIcon } from "@/shared/ui/figma-icons";
import { RowActions } from "@/shared/ui/row-action-button";
import { rowActionIconProps } from "@/shared/ui/row-action-icon";
import type { CasoHistorico, FiltrosHistoricoProjeto, HistoricoProjeto, ModeloFormFactor, ResultadoNaData } from "../../model/projeto";
import { formatarDia } from "./formatar-dia";
import { ResultadoBotao, SemExecucao } from "./ResultadoBotao";

/** Resultado aberto na janela da RN-09: o caso, o device e o dia da célula. */
export interface ResultadoAberto {
  tcId: string;
  device: string;
  dia: string;
  resultado: ResultadoNaData;
}

type FiltroCabecalho = keyof Pick<FiltrosHistoricoProjeto, "tcId" | "responsavel" | "sdfId" | "modeloDispositivoId">;

interface Props {
  dados: HistoricoProjeto | undefined;
  carregando: boolean;
  erro: boolean;
  onTentarDeNovo: () => void;
  filtros: FiltrosHistoricoProjeto;
  onFiltroChange: (campo: FiltroCabecalho, valor: string) => void;
  temFiltros: boolean;
  onLimparFiltros: () => void;
  /** Casos com a linha aberta (spec 059, RN-12): mostram todos os devices do projeto. */
  expandidos: ReadonlySet<string>;
  onAlternar: (casoId: string) => void;
  onAbrirResultado: (resultado: ResultadoAberto) => void;
  onAbrirResumo: (caso: CasoHistorico) => void;
  /** Todos os casos com os filtros atuais, para "Exportar todos os itens" (spec 035). */
  buscarTodos: () => Promise<CasoHistorico[]>;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** Registro manual numa rodada: só a aba Form Factor passa. */
  podeRegistrar?: (caso: CasoHistorico) => boolean;
  onRegistrar?: (caso: CasoHistorico) => void;
}

const SEM_CASOS: CasoHistorico[] = [];
const SEM_MODELOS: ModeloFormFactor[] = [];

// Número, TC ID e Assignee ficam fixos ao rolar para os lados; as larguras fixas dão o recuo de cada um.
const fixa = "sticky z-[1] bg-table-body [thead_&]:bg-surface-secondary";

/** Uma linha da pilha, com os 40px das linhas de tabela: os devices ficam alinhados entre as colunas. */
function Linha({ children, className }: { children: ReactNode; className?: string }) {
  return <div className={cn("flex h-10 items-center", className)}>{children}</div>;
}

/**
 * General Results de um projeto (specs 032, 033 e 059): uma página de casos e até 5 datas, as mesmas em todas as
 * páginas (ADR 0046). Recolhida, a linha mostra o primeiro device do projeto; aberta, todos, um embaixo do outro.
 */
export function HistoricoProjetoTabela(props: Props) {
  const { t } = useTranslation();
  const { dados, filtros, expandidos } = props;
  const casos = props.erro ? SEM_CASOS : dados?.items ?? SEM_CASOS;
  const modelos = dados?.modelos ?? SEM_MODELOS;
  const primeiro = modelos[0];
  const opcoesModelos = modelos.map((modelo) => ({ value: modelo.id, label: modelo.nome }));
  const pilha = (caso: CasoHistorico, celula: (modelo: ModeloFormFactor) => ReactNode) =>
    (expandidos.has(caso.caso_teste_id) ? modelos : modelos.slice(0, 1)).map((modelo) => <Linha key={modelo.id}>{celula(modelo)}</Linha>);
  const sdfDoDevice = (caso: CasoHistorico, modeloId: string) => caso.ultimo_sdf_por_modelo[modeloId] ?? "—";
  const primeiraDaPagina = (props.page - 1) * props.pageSize;

  const colunas: DataTableColumn<CasoHistorico>[] = [
    {
      // Número da linha com a seta ao lado (design da spec 059), sem título, como nas tabelas de projeto.
      id: "numero",
      header: "",
      className: `${fixa} left-0 w-20 min-w-20 max-w-20 after:hidden [tbody_&]:align-top`,
      cell: (caso) => {
        const aberta = expandidos.has(caso.caso_teste_id);
        return <Linha className="gap-2">
          <span className="w-5 text-right tabular-nums text-muted">{String(primeiraDaPagina + casos.indexOf(caso) + 1).padStart(2, "0")}</span>
          {/* Com um device só, não há o que abrir. */}
          {modelos.length > 1 && <Button
            isIconOnly
            size="sm"
            variant="ghost"
            aria-expanded={aberta}
            // Rótulo fixo: o estado aberto ou fechado vai só no aria-expanded, para não ser lido duas vezes.
            aria-label={t("rowDevices", { tc: caso.tc_id })}
            onPress={() => props.onAlternar(caso.caso_teste_id)}
            className="size-6 min-w-0 rounded-md text-muted data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus"
          >
            <ChevronRight aria-hidden="true" className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", aberta && "rotate-90")} />
          </Button>}
        </Linha>;
      },
    },
    {
      id: "tcId",
      isRowHeader: true,
      className: `${fixa} left-20 w-44 min-w-44 max-w-44 [tbody_&]:align-top`,
      header: <DataTableFilter label={t("tcId")} value={filtros.tcId ?? ""} onChange={(valor) => props.onFiltroChange("tcId", valor)} />,
      cell: (caso) => <Linha><span className="truncate">{caso.tc_id}</span></Linha>,
      exportar: { titulo: t("tcId"), valor: (caso) => caso.tc_id },
    },
    {
      id: "assignee",
      className: `${fixa} left-64 w-36 min-w-36 [tbody_&]:align-top`,
      header: <DataTableFilter label={t("assignee")} value={filtros.responsavel ?? ""} onChange={(valor) => props.onFiltroChange("responsavel", valor)} />,
      cell: (caso) => <Linha><span className="truncate">{caso.responsavel_identificador ?? "—"}</span></Linha>,
      exportar: { titulo: t("assignee"), valor: (caso) => caso.responsavel_identificador ?? "—" },
    },
    {
      id: "formFactor",
      className: "min-w-32 [tbody_&]:align-top",
      header: <DataTableFilter label={t("formFactor")} value={filtros.modeloDispositivoId ?? ""} onChange={(valor) => props.onFiltroChange("modeloDispositivoId", valor)} options={comOpcaoTodos(t("all"), opcoesModelos)} />,
      cell: (caso) => pilha(caso, (modelo) => <span className="truncate">{modelo.nome}</span>),
      // A exportação traz o que a linha recolhida mostra: o primeiro device do projeto.
      exportar: { titulo: t("formFactor"), valor: () => primeiro?.nome ?? "—" },
    },
    {
      id: "sdfId",
      className: "min-w-32 [tbody_&]:align-top",
      header: <DataTableFilter label={t("sdfId")} value={filtros.sdfId ?? ""} onChange={(valor) => props.onFiltroChange("sdfId", valor)} />,
      cell: (caso) => pilha(caso, (modelo) => sdfDoDevice(caso, modelo.id)),
      exportar: { titulo: t("sdfId"), valor: (caso) => primeiro ? sdfDoDevice(caso, primeiro.id) : "—" },
    },
    ...(dados?.datas ?? []).map<DataTableColumn<CasoHistorico>>((dia) => ({
      id: `dia-${dia}`,
      className: "min-w-24 [tbody_&]:align-top",
      exportar: { titulo: formatarDia(dia), valor: (caso) => (primeiro && caso.resultados[dia]?.[primeiro.id]?.resultado) || "—" },
      header: <Tooltip delay={300} closeDelay={0}>
        <Button variant="ghost" className="h-7 min-h-0 rounded-md px-1 text-[14px] font-medium text-muted hover:bg-transparent data-[focus-visible]:ring-2 data-[focus-visible]:ring-focus">
          {formatarDia(dia)}
        </Button>
        <Tooltip.Content className="text-[12px]">{t("sdfResult")}</Tooltip.Content>
      </Tooltip>,
      cell: (caso) => pilha(caso, (modelo) => {
        const resultado = caso.resultados[dia]?.[modelo.id];
        if (!resultado) return <SemExecucao device={modelo.nome} dia={dia} />;
        return <ResultadoBotao resultado={resultado.resultado} device={modelo.nome} dia={dia} onPress={() => props.onAbrirResultado({ tcId: caso.tc_id, device: modelo.nome, dia, resultado })} />;
      }),
    })),
    {
      id: "acoes",
      className: "[tbody_&]:align-top",
      header: t("actions"),
      // Um histórico por caso (spec 059, RN-15), na primeira linha, mesmo com a linha aberta.
      cell: (caso) => <Linha><RowActions identificador={caso.tc_id} actions={[
        { label: t("viewExecutionHistory"), icon: <HistoryIcon />, onPress: () => props.onAbrirResumo(caso) },
        ...(props.podeRegistrar?.(caso) ? [{ label: t("recordResult"), icon: <Plus {...rowActionIconProps} />, onPress: () => props.onRegistrar?.(caso) }] : []),
      ]} /></Linha>,
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
      empty: { title: t("noProjectCases"), hint: t("noProjectCasesHint") },
      filtered: { title: t("noResults"), hint: t("noGlobalResultsFiltered") },
    })}
    pagination={<DataTablePagination page={props.page} pageSize={props.pageSize} totalCount={dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />}
    rowDependencies={[t, dados, expandidos, primeiraDaPagina]}
  />;
}
