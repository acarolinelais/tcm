import { Link } from "react-router";
import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";
import type { Projeto } from "../model/projeto";
import type { FormFactorGlobal, FiltrosFormFactorGlobal, FormFactorResultadosGlobais } from "../model/projeto";
import { StatusPill } from "./StatusBadge";

type Filtro = keyof Pick<FiltrosFormFactorGlobal, "projetoId" | "responsavelId" | "tcId" | "sdfId" | "modeloDispositivoId" | "resultado" | "origem">;

interface Props<T> {
  dados: T | undefined;
  carregando: boolean;
  erro: boolean;
  projetos: Projeto[];
  filtros: FiltrosFormFactorGlobal;
  onFiltroChange: (campo: Filtro, valor: string) => void;
  onLimparFiltros: () => void;
  temFiltros: boolean;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}

function ProjetoCell({ projetoId, nome }: { projetoId: string; nome: string }) {
  return <Link to={`/projetos/${projetoId}`} className="font-medium text-primary underline-offset-4 hover:underline focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{nome}</Link>;
}

function ResultadoCell({ valor, aplicavel }: { valor: string | undefined; aplicavel: boolean }) {
  const { t } = useTranslation();
  if (!aplicavel) return <span className="text-muted-foreground" aria-label={t("notApplicable")}>N/A</span>;
  if (!valor) return <span className="text-muted-foreground" aria-label={t("noResult")}>—</span>;
  if (!/^(pass|fail)$/i.test(valor)) return <span>{valor}</span>;
  return <StatusPill status={valor.toLowerCase() === "pass" ? "Pass" : "Fail"} label={valor.toUpperCase()} />;
}

function FiltrosCabecalho({ dados, projetos, filtros, onFiltroChange }: Pick<Props<FormFactorGlobal>, "dados" | "projetos" | "filtros" | "onFiltroChange">) {
  const { t } = useTranslation();
  const responsaveis = dados?.responsaveis ?? [];
  const modelos = dados?.modelos ?? [];
  return <>
    <TableHead className="w-14 px-4" aria-hidden="true" />
    <TableHead><TableColumnFilter label={t("project")} value={filtros.projetoId ?? ""} onChange={(value) => onFiltroChange("projetoId", value)} options={[{ value: "", label: t("all") }, ...projetos.map((projeto) => ({ value: projeto.id, label: projeto.nome }))]} searchable /></TableHead>
    <TableHead><TableColumnFilter label={t("tcId")} value={filtros.tcId ?? ""} onChange={(value) => onFiltroChange("tcId", value)} /></TableHead>
    <TableHead><TableColumnFilter label={t("sdfId")} value={filtros.sdfId ?? ""} onChange={(value) => onFiltroChange("sdfId", value)} /></TableHead>
    <TableHead><TableColumnFilter label={t("assignee")} value={filtros.responsavelId ?? ""} onChange={(value) => onFiltroChange("responsavelId", value)} options={[{ value: "", label: t("all") }, ...responsaveis.map((responsavel) => ({ value: responsavel.id, label: responsavel.identificador }))]} searchable /></TableHead>
    {modelos.map((modelo) => <TableHead key={modelo.id}>
      <div className="flex items-center gap-1">{modelo.nome}
        <TableColumnFilter label="" accessibleLabel={t("filterResultForModel", { model: modelo.nome })} value={filtros.modeloDispositivoId === modelo.id ? filtros.resultado ?? "" : ""} onChange={(value) => { onFiltroChange("modeloDispositivoId", value ? modelo.id : ""); onFiltroChange("resultado", value); }} options={[{ value: "", label: t("all") }, { value: "PASS", label: "PASS" }, { value: "FAIL", label: "FAIL" }]} />
      </div>
    </TableHead>)}
    <TableHead>{t("date")}</TableHead>
  </>;
}

function TableStates({ carregando, erro, temLinhas, temFiltros, onLimparFiltros, mensagemErro }: {
  carregando: boolean; erro: boolean; temLinhas: boolean; temFiltros: boolean;
  onLimparFiltros: () => void; mensagemErro: string;
}) {
  const { t } = useTranslation();
  if (carregando) return <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading")}</p>;
  if (erro) return <p role="alert" className="p-5 text-sm text-destructive">{mensagemErro}</p>;
  if (temLinhas) return null;
  return <div className="flex min-h-40 flex-col items-center justify-center gap-2 text-center">
    <p className="text-sm text-muted-foreground">{t(temFiltros ? "noGlobalResultsFiltered" : "noGlobalResults")}</p>
    {temFiltros && <button type="button" className="rounded-md px-3 py-1.5 text-sm font-medium text-primary underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" onClick={onLimparFiltros}>{t("clearFilters")}</button>}
  </div>;
}

export function FormFactorGlobalTabela(props: Props<FormFactorGlobal>) {
  const { t } = useTranslation();
  const rows = props.erro ? [] : props.dados?.items ?? [];
  const modelos = props.dados?.modelos ?? [];
  return <TableLayout>
    <Table className="min-w-max" containerClassName={rows.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <FiltrosCabecalho dados={props.dados} projetos={props.projetos} filtros={props.filtros} onFiltroChange={props.onFiltroChange} />
      </TableRow></TableHeader>
      {rows.length > 0 && <TableBody>{rows.map((row, index) => {
        const aplicaveis = new Set(row.modelos_ids);
        return <TableRow key={row.caso_teste_id} className="transition-colors hover:bg-muted/30 motion-reduce:transition-none">
          <TableCell className="w-14 px-4 text-right tabular-nums text-muted-foreground">{String((props.page - 1) * props.pageSize + index + 1).padStart(2, "0")}</TableCell>
          <TableCell><ProjetoCell projetoId={row.projeto_id} nome={row.projeto_nome} /></TableCell>
          <TableCell className="font-medium">{row.tc_id}</TableCell>
          <TableCell className="text-muted-foreground">{row.sdf_id ?? "—"}</TableCell>
          <TableCell className="text-muted-foreground">{props.dados?.responsaveis.find((item) => item.id === row.responsavel_id)?.identificador ?? "—"}</TableCell>
          {modelos.map((modelo) => <TableCell key={modelo.id}><ResultadoCell valor={row.resultados[modelo.id]} aplicavel={aplicaveis.has(modelo.id)} /></TableCell>)}
          <TableCell className="whitespace-nowrap text-muted-foreground">{row.data_reportada ? formatDate(row.data_reportada, { dateStyle: "short" }) : "—"}</TableCell>
        </TableRow>;
      })}</TableBody>}
    </Table>
    <TableStates carregando={props.carregando} erro={props.erro} temLinhas={rows.length > 0} temFiltros={props.temFiltros} onLimparFiltros={props.onLimparFiltros} mensagemErro={t("resultsLoadError")} />
    <TablePagination page={props.page} pageSize={props.pageSize} totalCount={props.dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />
  </TableLayout>;
}

export function FormFactorGlobalResultadosTabela(props: Props<FormFactorResultadosGlobais>) {
  const { t } = useTranslation();
  const rows = props.erro ? [] : props.dados?.items ?? [];
  const modelos = props.dados?.modelos ?? [];
  return <TableLayout>
    <Table className="min-w-max" containerClassName={rows.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <TableHead><TableColumnFilter label={t("project")} value={props.filtros.projetoId ?? ""} onChange={(value) => props.onFiltroChange("projetoId", value)} options={[{ value: "", label: t("all") }, ...props.projetos.map((projeto) => ({ value: projeto.id, label: projeto.nome }))]} searchable /></TableHead>
        <TableHead><TableColumnFilter label={t("tcId")} value={props.filtros.tcId ?? ""} onChange={(value) => props.onFiltroChange("tcId", value)} /></TableHead>
        <TableHead><TableColumnFilter label={t("sdfId")} value={props.filtros.sdfId ?? ""} onChange={(value) => props.onFiltroChange("sdfId", value)} /></TableHead>
        <TableHead><TableColumnFilter label={t("assignee")} value={props.filtros.responsavelId ?? ""} onChange={(value) => props.onFiltroChange("responsavelId", value)} options={[{ value: "", label: t("all") }, ...(props.dados?.responsaveis ?? []).map((responsavel) => ({ value: responsavel.id, label: responsavel.identificador }))]} searchable /></TableHead>
        <TableHead><TableColumnFilter label={t("origin")} value={props.filtros.origem ?? ""} onChange={(value) => props.onFiltroChange("origem", value)} options={[{ value: "", label: t("all") }, { value: "SDF", label: "SDF" }, { value: "MANUAL", label: t("manual") }]} /></TableHead>
        {modelos.map((modelo) => <TableHead key={modelo.id}><div className="flex items-center gap-1">{modelo.nome}<TableColumnFilter label="" accessibleLabel={t("filterResultForModel", { model: modelo.nome })} value={props.filtros.modeloDispositivoId === modelo.id ? props.filtros.resultado ?? "" : ""} onChange={(value) => { props.onFiltroChange("modeloDispositivoId", value ? modelo.id : ""); props.onFiltroChange("resultado", value); }} options={[{ value: "", label: t("all") }, { value: "PASS", label: "PASS" }, { value: "FAIL", label: "FAIL" }]} /></div></TableHead>)}
        <TableHead>{t("date")}</TableHead>
      </TableRow></TableHeader>
      {rows.length > 0 && <TableBody>{rows.map((row) => <TableRow key={row.execucao_id} className="transition-colors hover:bg-muted/30 motion-reduce:transition-none">
        <TableCell><ProjetoCell projetoId={row.projeto_id} nome={row.projeto_nome} /></TableCell>
        <TableCell className="font-medium">{row.tc_id}</TableCell>
        <TableCell className="text-muted-foreground">{row.sdf_id ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground">{props.dados?.responsaveis.find((item) => item.id === row.responsavel_id)?.identificador ?? "—"}</TableCell>
        <TableCell>{row.origem === "MANUAL" ? t("manual") : "SDF"}</TableCell>
        {modelos.map((modelo) => <TableCell key={modelo.id}><ResultadoCell valor={row.resultados[modelo.id]} aplicavel={row.modelos_ids.includes(modelo.id)} /></TableCell>)}
        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(row.data_reportada, { dateStyle: "short", timeStyle: "short" })}</TableCell>
      </TableRow>)}</TableBody>}
    </Table>
    <TableStates carregando={props.carregando} erro={props.erro} temLinhas={rows.length > 0} temFiltros={props.temFiltros} onLimparFiltros={props.onLimparFiltros} mensagemErro={t("resultsLoadError")} />
    <TablePagination page={props.page} pageSize={props.pageSize} totalCount={props.dados?.total_count ?? 0} onPageChange={props.onPageChange} onPageSizeChange={props.onPageSizeChange} />
  </TableLayout>;
}
