import { useTranslation } from "react-i18next";

import { formatDate } from "@/core/i18n/format";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableColumnFilter } from "@/shared/ui/table-column-filter";

import type { FormFactorMatriz, StatusCasoTeste } from "../model/projeto";
import { CasosTesteEmptyState } from "./CasosTesteEmptyState";
import { StatusPill } from "./StatusBadge";

/** Pass e Fail ganham o mesmo pill do Status; outros valores do SDF aparecem como texto, sem alteração. */
function ResultadoCelula({ valor }: { valor: string | undefined }) {
  if (!valor) return <span className="text-muted-foreground">—</span>;
  const status: StatusCasoTeste | null = /^pass$/i.test(valor) ? "Pass" : /^fail$/i.test(valor) ? "Fail" : null;
  if (!status) return <>{valor}</>;
  return <StatusPill status={status} label={valor} />;
}

export function FormFactorTabela({ dados, carregando, erro, identificadoresMembros, opcoesAssignee, assignee, onAssigneeChange, temFiltros, onLimparFiltros, page, pageSize, onPageChange, onPageSizeChange }: {
  dados: FormFactorMatriz | undefined;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  opcoesAssignee: { value: string; label: string }[];
  assignee: string;
  onAssigneeChange: (valor: string) => void;
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
    <Table containerClassName={linhas.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <TableHead>{t("tcId")}</TableHead>
        <TableHead>{t("sdfId")}</TableHead>
        <TableHead><TableColumnFilter label={t("assignee")} value={assignee} onChange={onAssigneeChange} options={[{ value: "", label: t("all") }, ...opcoesAssignee]} /></TableHead>
        {modelos.map((modelo) => <TableHead key={modelo.id}>{modelo.nome}</TableHead>)}
        <TableHead>{t("date")}</TableHead>
      </TableRow></TableHeader>
      {linhas.length ? <TableBody>{linhas.map((linha) => <TableRow key={linha.caso_teste_id}>
        <TableCell className="font-medium">{linha.tc_id}</TableCell>
        <TableCell className="text-muted-foreground">{linha.sdf_id ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground">{identificadoresMembros[linha.responsavel_id] ?? "—"}</TableCell>
        {modelos.map((modelo) => <TableCell key={modelo.id}><ResultadoCelula valor={linha.resultados[modelo.id]} /></TableCell>)}
        <TableCell className="text-muted-foreground">{linha.data_reportada ? formatDate(linha.data_reportada) : "—"}</TableCell>
      </TableRow>)}</TableBody> : null}
    </Table>
    {!carregando && !erro && !linhas.length && <CasosTesteEmptyState temFiltros={temFiltros} onLimparFiltros={onLimparFiltros} />}
    {carregando && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading")}</p>}
    {erro && <p role="alert" className="p-5 text-sm text-destructive">{t("formFactorLoadError")}</p>}
    <TablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </TableLayout>;
}
