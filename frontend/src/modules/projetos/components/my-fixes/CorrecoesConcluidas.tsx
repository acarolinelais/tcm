import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTableFilter } from "@/shared/ui/data-table-filter";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { DataDoSistema } from "@/shared/ui/data-do-sistema";
import { estadoDaTabela } from "@/shared/ui/data-table-state";
import { SeloTentativa } from "@/shared/ui/selo-tentativa";
import { TagChip, TONS_ETIQUETA } from "@/shared/ui/tag-chip";
import { WeekPickerHero } from "@/shared/ui/week-picker-hero";

import { casosTesteApi } from "../../api/projetos.api";
import { useCorrecoesConcluidas } from "../../hooks/useProjetos";
import { RESULTADOS_DA_CORRECAO, type CorrecaoConcluida, type FiltrosCorrecoesConcluidas, type ResultadoDaCorrecao } from "../../model/projeto";
import { statusChipTons } from "../status/status-chip-estilos";

// Os tons dos Status em que a tentativa fechou: Done, In Fixes e o neutro da exclusão.
const TOM_DO_RESULTADO = { corrigida: statusChipTons.Done, falhou_de_novo: statusChipTons.InFixes, encerrada: TONS_ETIQUETA.neutro } as const;
const dataExportada = (valor?: string | null) => (valor ? formatDate(valor, { dateStyle: "medium" }) : "—");

/**
 * Spec 076, RN-12 a RN-15: as tentativas de correção já fechadas, uma por linha. O dev vê as dele; a gestão vê as de
 * todos e filtra por corretor.
 */
export function CorrecoesConcluidas({ projetoId, opcoesCorretor, escolha }: {
  projetoId: string;
  /** A pílula que volta para Em correção, na mesma barra do período (como na SDF Failures). */
  escolha?: ReactNode;
  /** Só para a gestão: o dev só tem as próprias, então o filtro não aparece para ele. */
  opcoesCorretor?: { value: string; label: string }[];
}) {
  const { t } = useTranslation();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [filtros, setFiltros] = useState<FiltrosCorrecoesConcluidas>({});
  const correcoes = useCorrecoesConcluidas(projetoId, pagina, tamanho, filtros);
  const filtrar = (proximos: FiltrosCorrecoesConcluidas) => { setPagina(1); setFiltros(proximos); };
  const rotuloResultado = (resultado: ResultadoDaCorrecao) => t(`fixResult.${resultado}`);
  const rotuloOrigem = (correcao: CorrecaoConcluida) => t(correcao.origem === "regressao" ? "fixOriginRegression" : "fixOriginValidation");
  const itens = correcoes.data?.items ?? [];

  const colunas: DataTableColumn<CorrecaoConcluida>[] = [
    {
      id: "tc_id",
      isRowHeader: true,
      header: t("tcId"),
      cell: (correcao) => <span className="flex min-w-0 items-center gap-2">{correcao.tc_id}<SeloTentativa tentativa={correcao.tentativa} /></span>,
      exportar: { titulo: t("tcId"), valor: (correcao) => correcao.tc_id },
    },
    {
      id: "corretor",
      header: opcoesCorretor
        ? <DataTableFilter label={t("fixer")} value={filtros.corretor_id ?? ""} onChange={(corretor) => filtrar({ ...filtros, corretor_id: corretor || undefined })} options={[{ value: "", label: t("all") }, ...opcoesCorretor]} searchable />
        : t("fixer"),
      cell: (correcao) => correcao.corretor_identificador ?? "—",
      exportar: { titulo: t("fixer"), valor: (correcao) => correcao.corretor_identificador ?? "—" },
    },
    { id: "origem", header: t("fixOrigin"), cell: rotuloOrigem, exportar: { titulo: t("fixOrigin"), valor: rotuloOrigem } },
    { id: "falha_em", header: t("failedOn"), cell: (correcao) => <DataDoSistema valor={correcao.falha_em} />, exportar: { titulo: t("failedOn"), valor: (correcao) => dataExportada(correcao.falha_em) } },
    { id: "end_date", header: t("endDate"), cell: (correcao) => <DataDoSistema valor={correcao.em_revisao_em} />, exportar: { titulo: t("endDate"), valor: (correcao) => dataExportada(correcao.em_revisao_em) } },
    { id: "fechada_em", header: t("closedOn"), cell: (correcao) => <DataDoSistema valor={correcao.fechada_em} />, exportar: { titulo: t("closedOn"), valor: (correcao) => dataExportada(correcao.fechada_em) } },
    {
      id: "resultado",
      header: <DataTableFilter label={t("fixResult")} value={filtros.resultado ?? ""} onChange={(resultado) => filtrar({ ...filtros, resultado: (resultado || undefined) as ResultadoDaCorrecao | undefined })}
        options={[{ value: "", label: t("all") }, ...RESULTADOS_DA_CORRECAO.map((resultado) => ({ value: resultado, label: rotuloResultado(resultado) }))]} />,
      cell: (correcao) => <TagChip tom={TOM_DO_RESULTADO[correcao.resultado]}>{rotuloResultado(correcao.resultado)}</TagChip>,
      exportar: { titulo: t("fixResult"), valor: (correcao) => rotuloResultado(correcao.resultado) },
    },
    {
      id: "dias",
      header: t("daysToFix"),
      className: "tabular-nums",
      cell: (correcao) => correcao.dias_ate_corrigir,
      exportar: { titulo: t("daysToFix"), valor: (correcao) => correcao.dias_ate_corrigir },
    },
  ];

  const temFiltro = Boolean(filtros.corretor_id || filtros.resultado || filtros.periodo);
  const estado = estadoDaTabela({
    isLoading: correcoes.isLoading,
    isError: correcoes.isError,
    isEmpty: !itens.length,
    hasFilters: temFiltro,
    onClearFilters: () => filtrar({}),
    loadingLabel: t("loading"),
    errorLabel: t("completedFixesLoadError"),
    clearFiltersLabel: t("clearFilters"),
    empty: { title: t("noCompletedFixes"), hint: t("noCompletedFixesHint") },
    filtered: { title: t("noResults"), hint: t("adjustFilters") },
  });

  return <>
    <div className="mb-3 flex flex-wrap items-center gap-3">
      {escolha}
      <WeekPickerHero className="ml-auto" permitirDia label={t("dayOrWeek")} value={filtros.periodo ?? ""} onChange={(periodo) => filtrar({ ...filtros, periodo: periodo || undefined })} />
    </div>
    <DataTable
      aria-label={t("completedFixes")}
      columns={colunas}
      items={itens}
      getKey={(correcao) => correcao.id}
      state={estado}
      pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={correcoes.data?.total_count ?? 0} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
      rowDependencies={[t, opcoesCorretor]}
      exportacao={{ listagem: "correcoes-concluidas", todosOsItens: () => buscarTodasAsPaginas((page, pageSize) => casosTesteApi.listarCorrecoesConcluidas(projetoId, page, pageSize, filtros)) }}
    />
  </>;
}
