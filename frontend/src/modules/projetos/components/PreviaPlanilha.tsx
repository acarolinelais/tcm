import { useState } from "react";
import { useTranslation } from "react-i18next";

import { formatNumber } from "@/core/i18n/format";
import { DEFAULT_TABLE_PAGE_SIZE, Table, TableBody, TableCell, TableHead, TableHeader, TablePagination, TableRow } from "@/shared/ui/table";
import { ROTULO_SITUACAO } from "../model/projeto";
import type { PlanilhaProjeto } from "../utils/planilha-projeto";

/** Prévia paginada no cliente: a planilha já foi lida inteira no navegador. */
export function PreviaPlanilha({ previa }: { previa: PlanilhaProjeto }) {
  const { t } = useTranslation();
  const [pagina, setPagina] = useState(1);
  // Reler o arquivo (mesmo com o mesmo nome) volta para a primeira página.
  const [previaAnterior, setPreviaAnterior] = useState(previa);
  if (previaAnterior !== previa) {
    setPreviaAnterior(previa);
    setPagina(1);
  }
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const casosDaPagina = previa.casos.slice((pagina - 1) * tamanho, pagina * tamanho);

  return (
    <section aria-label={t("spreadsheetPreview")} className="mt-6 overflow-hidden rounded-2xl border border-border bg-white">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-[#F7F8FA] px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold">{t("spreadsheetPreview")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("project")}: {previa.app} {previa.one_ui}</p>
        </div>
        <span className="text-xs tabular-nums text-muted-foreground">{t("testCaseCount", { count: previa.casos.length, countLabel: formatNumber(previa.casos.length) })}</span>
      </div>
      <div className="thin-scroll max-h-96 overflow-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>{t("tcId")}</TableHead>
              <TableHead>{t("category")}</TableHead>
              <TableHead>{t("difficulty")}</TableHead>
              <TableHead>{t("tcSituation")}</TableHead>
              <TableHead>{t("assignee")}</TableHead>
              <TableHead>{t("backup")}</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {casosDaPagina.map((caso) => (
              <TableRow key={caso.linha}>
                <TableCell className="font-medium">{caso.tc_id}</TableCell>
                <TableCell className="text-muted-foreground">{caso.category}</TableCell>
                <TableCell className="text-muted-foreground">{caso.difficulty}</TableCell>
                <TableCell className="text-muted-foreground">{t(ROTULO_SITUACAO[caso.situation])}</TableCell>
                <TableCell className="text-muted-foreground">{caso.responsavel}</TableCell>
                <TableCell className="text-muted-foreground">{caso.backup}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <TablePagination
        className="px-5 pb-3"
        page={pagina}
        pageSize={tamanho}
        totalCount={previa.casos.length}
        onPageChange={setPagina}
        onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }}
      />
    </section>
  );
}
