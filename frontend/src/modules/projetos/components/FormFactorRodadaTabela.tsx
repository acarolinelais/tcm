import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Table, TableBody, TableCell, TableHead, TableHeader, TableLayout, TablePagination, TableRow } from "@/shared/ui/table";
import { TableRowActions } from "@/shared/ui/table-row-actions";

import type { CasoTesteRodada, FormFactorRodadaCasos } from "../model/projeto";
import { FormFactorResultBadge } from "./FormFactorResultBadge";
import { StatusPill } from "./StatusBadge";
import { ROTULO_STATUS } from "../model/projeto";

export function FormFactorRodadaTabela({ dados, carregando, erro, identificadoresMembros, podeRegistrar, onRegistrar, page, pageSize, onPageChange, onPageSizeChange }: {
  dados?: FormFactorRodadaCasos;
  carregando: boolean;
  erro: boolean;
  identificadoresMembros: Record<string, string>;
  podeRegistrar: (item: CasoTesteRodada) => boolean;
  onRegistrar: (item: CasoTesteRodada) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
}) {
  const { t } = useTranslation();
  const items = erro ? [] : dados?.items ?? [];
  return <TableLayout>
    <Table className="min-w-max" containerClassName={items.length ? "thin-scroll min-h-0 flex-1 overflow-auto" : "shrink-0 overflow-visible"}>
      <TableHeader><TableRow>
        <TableHead>{t("tcId")}</TableHead>
        <TableHead>{t("status")}</TableHead>
        <TableHead>{t("assignee")}</TableHead>
        <TableHead>{t("backup")}</TableHead>
        {dados?.modelos.map((modelo) => <TableHead key={modelo.id}>{modelo.nome}</TableHead>)}
        <TableHead>{t("roundProgress", { defaultValue: "Result entry" })}</TableHead>
        <TableHead className="text-right">{t("actions")}</TableHead>
      </TableRow></TableHeader>
      {items.length > 0 && <TableBody>{items.map((item) => <TableRow key={item.execucao_id}>
        <TableCell className="font-medium">{item.tc_id}</TableCell>
        <TableCell><StatusPill status={item.status} label={t(ROTULO_STATUS[item.status])} /></TableCell>
        <TableCell className="text-muted-foreground">{identificadoresMembros[item.responsavel_id] ?? "—"}</TableCell>
        <TableCell className="text-muted-foreground">{item.backup_id ? identificadoresMembros[item.backup_id] ?? "—" : "—"}</TableCell>
        {dados?.modelos.map((modelo) => <TableCell key={modelo.id}>{item.resultados[modelo.id] ? <FormFactorResultBadge value={item.resultados[modelo.id]} /> : <span className="text-muted-foreground">—</span>}</TableCell>)}
        <TableCell className="text-sm text-muted-foreground">{item.resultados_registrados ? t("resultsRecorded", { defaultValue: "Recorded" }) : t("resultsPending", { defaultValue: "Pending" })}</TableCell>
        <TableCell className="text-right">{!item.resultados_registrados && podeRegistrar(item) && <TableRowActions label={item.tc_id} actions={[{ label: t("recordResult", { defaultValue: "Record result" }), icon: Plus, onSelect: () => onRegistrar(item) }]} />}</TableCell>
      </TableRow>)}</TableBody>}
    </Table>
    {carregando && <p role="status" className="p-5 text-sm text-muted-foreground">{t("loading")}</p>}
    {erro && <p role="alert" className="p-5 text-sm text-destructive">{t("formFactorLoadError")}</p>}
    {!carregando && !erro && !items.length && <p className="p-5 text-sm text-muted-foreground">{t("noRoundTestCases", { defaultValue: "This round has no Test Cases." })}</p>}
    <TablePagination page={page} pageSize={pageSize} totalCount={dados?.total_count ?? 0} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />
  </TableLayout>;
}
