import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter, type TableFilterOption } from "@/shared/ui/table-column-filter";
import type { FormFactorResultados } from "../model/projeto";
import { StatusPill } from "./StatusBadge";

export function FormFactorResultadosTabela({ dados, carregando, erro, identificadoresMembros, opcoesAssignee, filtros, onFiltroChange, page, pageSize, onPageChange, onPageSizeChange }: {
  dados?: FormFactorResultados;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  opcoesAssignee: TableFilterOption[];
  filtros: { tcId: string; sdfId: string; responsavelId: string; origem: string; modeloDispositivoId: string; resultado: string };
  onFiltroChange: (campo: keyof typeof filtros, valor: string) => void;
  page: number; pageSize: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const items = erro ? [] : dados?.items ?? [];
  return <TableLayout>
    <Table containerClassName={items.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <TableHead><TableColumnFilter label={t("tcId")} value={filtros.tcId} onChange={(v) => onFiltroChange("tcId", v)} /></TableHead>
        <TableHead><TableColumnFilter label={t("sdfId")} value={filtros.sdfId} onChange={(v) => onFiltroChange("sdfId", v)} /></TableHead>
        <TableHead><TableColumnFilter label={t("assignee")} value={filtros.responsavelId} onChange={(v) => onFiltroChange("responsavelId", v)} options={[{ value: "", label: t("all") }, ...opcoesAssignee]} searchable /></TableHead>
        <TableHead><TableColumnFilter label={t("origin", { defaultValue: "Origin" })} value={filtros.origem} onChange={(v) => onFiltroChange("origem", v)} options={[{ value: "", label: t("all") }, { value: "SDF", label: "SDF" }, { value: "MANUAL", label: t("manual", { defaultValue: "Manual" }) }]} /></TableHead>
        {dados?.modelos.map((modelo) => <TableHead key={modelo.id}><div className="flex items-center gap-1">{modelo.nome}<TableColumnFilter label="" accessibleLabel={t("filterResultForModel", { defaultValue: "Result for {{model}}", model: modelo.nome })} value={filtros.modeloDispositivoId === modelo.id ? filtros.resultado : ""} onChange={(v) => { onFiltroChange("modeloDispositivoId", v ? modelo.id : ""); onFiltroChange("resultado", v); }} options={[{ value: "", label: t("all") }, { value: "PASS", label: "PASS" }, { value: "FAIL", label: "FAIL" }]} /></div></TableHead>)}
        <TableHead>{t("date")}</TableHead>
      </TableRow></TableHeader>
      {items.length > 0 && <TableBody>{items.map((execucao) => <TableRow key={execucao.execucao_id}>
        <TableCell className="font-medium">{execucao.tc_id}</TableCell>
        <TableCell className="text-muted-foreground">{execucao.sdf_id ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground">{identificadoresMembros[execucao.responsavel_id] ?? "—"}</TableCell>
        <TableCell>{execucao.origem === "SDF" ? "SDF" : t("manual", { defaultValue: "Manual" })}</TableCell>
        {dados?.modelos.map((modelo) => {
          const resultado = execucao.resultados[modelo.id];
          if (!resultado) return <TableCell key={modelo.id}><span className="text-muted-foreground">—</span></TableCell>;
          if (!/^(pass|fail)$/i.test(resultado)) return <TableCell key={modelo.id}>{resultado}</TableCell>;
          return <TableCell key={modelo.id}><StatusPill status={resultado.toLowerCase() === "pass" ? "Pass" : "Fail"} label={resultado} /></TableCell>;
        })}
        <TableCell className="text-muted-foreground">{formatDate(execucao.data_reportada)}</TableCell>
      </TableRow>)}</TableBody>}
    </Table>
    {carregando && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading")}</p>}
    {erro && <p role="alert" className="p-5 text-sm text-destructive">{t("resultsLoadError", { defaultValue: "Could not load results." })}</p>}
    {!carregando && !erro && !items.length && <p className="p-5 text-sm text-muted-foreground">{t("noResults", { defaultValue: "No results found." })}</p>}
    <TablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </TableLayout>;
}
