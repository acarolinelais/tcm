import { useTranslation } from "react-i18next";
import { Plus } from "lucide-react";

import { formatDate } from "@/core/i18n/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import { TableRowActions } from "@/shared/ui/table-row-actions";

import type { FormFactorMatriz } from "../model/projeto";
import { CasosTesteEmptyState } from "./CasosTesteEmptyState";
import { FormFactorResultBadge } from "./FormFactorResultBadge";

/** Pass e Fail ganham o mesmo pill do Status; outros valores do SDF aparecem como texto, sem alteração. */
function ResultadoCelula({ valor }: { valor: string | undefined }) {
  if (!valor) return <span className="text-muted-foreground">—</span>;
  return <FormFactorResultBadge value={valor} />;
}

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
  onRegistrar?: (linha: FormFactorMatriz["items"][number]) => void;
  temFiltros: boolean;
  onLimparFiltros: () => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const linhas = erro ? [] : dados?.items ?? [];
  const modelos = dados?.modelos ?? [];

  return <TableLayout>
    <Table className="min-w-max" containerClassName={linhas.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <TableHead aria-hidden="true" className="w-14 px-4" />
        <TableHead><TableColumnFilter label={t("tcId")} value={tcId} onChange={(valor) => onFiltroTexto?.("tcId", valor)} /></TableHead>
        <TableHead><TableColumnFilter label={t("sdfId")} value={sdfId} onChange={(valor) => onFiltroTexto?.("sdfId", valor)} /></TableHead>
        <TableHead><TableColumnFilter label={t("assignee")} value={assignee} onChange={onAssigneeChange} options={[{ value: "", label: t("all") }, ...opcoesAssignee]} searchable /></TableHead>
        {modelos.map((modelo) => <TableHead key={modelo.id}><div className="flex items-center gap-1">{modelo.nome}<TableColumnFilter label="" accessibleLabel={t("filterResultForModel", { defaultValue: "Result for {{model}}", model: modelo.nome })} value={modeloDispositivoId === modelo.id ? resultadoFiltro : ""} onChange={(valor) => onFiltroResultado?.(modelo.id, valor)} options={[{ value: "", label: t("all") }, { value: "PASS", label: "PASS" }, { value: "FAIL", label: "FAIL" }]} /></div></TableHead>)}
        <TableHead>{t("date")}</TableHead>
        {podeRegistrar && <TableHead className="text-right">{t("actions")}</TableHead>}
      </TableRow></TableHeader>
      {linhas.length ? <TableBody>{linhas.map((linha, index) => {
        const numeroDaLinha = (page - 1) * pageSize + index + 1;
        return <TableRow key={linha.caso_teste_id} className="transition-colors duration-150 hover:bg-muted/30 motion-reduce:transition-none">
        <TableCell className="w-14 px-4 text-right tabular-nums text-muted-foreground">{String(numeroDaLinha).padStart(2, "0")}</TableCell>
        <TableCell className="font-medium">{linha.tc_id}</TableCell>
        <TableCell className="text-muted-foreground">{linha.sdf_id ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground">{identificadoresMembros[linha.responsavel_id] ?? "—"}</TableCell>
        {modelos.map((modelo) => <TableCell key={modelo.id}><ResultadoCelula valor={linha.resultados[modelo.id]} /></TableCell>)}
        <TableCell className="text-muted-foreground">{linha.data_reportada ? formatDate(linha.data_reportada) : "—"}</TableCell>
        {podeRegistrar && <TableCell className="text-right"><TableRowActions label={linha.tc_id} actions={[
          { label: t("recordResult", { defaultValue: "Record result" }), icon: Plus, onSelect: () => onRegistrar?.(linha) },
        ]} /></TableCell>}
      </TableRow>})}</TableBody> : null}
    </Table>
    {!carregando && !erro && !linhas.length && <CasosTesteEmptyState temFiltros={temFiltros} onLimparFiltros={onLimparFiltros} />}
    {carregando && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading")}</p>}
    {erro && <p role="alert" className="p-5 text-sm text-destructive">{t("formFactorLoadError")}</p>}
    <TablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </TableLayout>;
}
