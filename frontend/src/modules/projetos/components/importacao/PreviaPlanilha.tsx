import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@heroui/react";
import { ChevronDown } from "lucide-react";

import { formatNumber } from "@/core/i18n/format";
import { cn } from "@/shared/lib/utils";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";
import { DataTable, type DataTableColumn } from "@/shared/ui/data-table";
import { DataTablePagination } from "@/shared/ui/data-table-pagination";
import { ROTULO_AUTOMACAO, ROTULO_SITUACAO } from "../../model/projeto";
import type { PlanilhaProjeto } from "../../utils/planilha-projeto";

type Caso = PlanilhaProjeto["casos"][number];

/** Prévia paginada no cliente: a planilha já foi lida inteira no navegador. */
export function PreviaPlanilha({ previa }: { previa: PlanilhaProjeto }) {
  const { t } = useTranslation();
  const [pagina, setPagina] = useState(1);
  const [tamanho, setTamanho] = useState(DEFAULT_TABLE_PAGE_SIZE);
  const [visivel, setVisivel] = useState(true);
  // Duas leituras seguidas podem reaproveitar o componente: planilha nova começa visível e na primeira página.
  const [lida, setLida] = useState(previa);
  if (lida !== previa) { setLida(previa); setVisivel(true); setPagina(1); }
  const casosDaPagina = previa.casos.slice((pagina - 1) * tamanho, pagina * tamanho);
  const colunas: DataTableColumn<Caso>[] = [
    { id: "tcId", isRowHeader: true, header: t("tcId"), cell: (caso) => caso.tc_id },
    { id: "category", header: t("category"), cell: (caso) => caso.category },
    { id: "automationLevel", header: t("automationLevel"), cell: (caso) => caso.automation_level ? t(ROTULO_AUTOMACAO[caso.automation_level]) : "—" },
    { id: "difficulty", header: t("difficulty"), cell: (caso) => caso.difficulty },
    { id: "situation", header: t("tcSituation"), cell: (caso) => t(ROTULO_SITUACAO[caso.situation]) },
    { id: "assignee", header: t("assignee"), cell: (caso) => caso.responsavel },
    { id: "backup", header: t("backup"), cell: (caso) => caso.backup },
  ];

  return (
    <section aria-label={t("spreadsheetPreview")} className="mt-6">
      <div className="mb-3 flex flex-wrap items-end justify-between gap-2 px-1">
        <div>
          <h2 className="text-base font-medium leading-6 text-body">{t("spreadsheetPreview")}</h2>
          <p className="mt-0.5 text-[13px] text-muted">{t("project")}: {previa.app} {previa.one_ui}</p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[13px] tabular-nums text-muted">{t("testCaseCount", { count: previa.casos.length, countLabel: formatNumber(previa.casos.length) })}</span>
          <Button variant="ghost" size="sm" aria-expanded={visivel} onPress={() => setVisivel((atual) => !atual)} className="h-7 min-h-0 gap-1 rounded-lg px-2 text-[13px] font-medium text-body">
            {t(visivel ? "hidePreview" : "showPreview")}
            <ChevronDown aria-hidden="true" className={cn("size-4 transition-transform duration-150 motion-reduce:transition-none", visivel && "rotate-180")} />
          </Button>
        </div>
      </div>
      {/* Com mais de uma página a altura é fixa, para a paginação não pular ao trocar de página (spec 016, RN-21). */}
      {visivel && <div className={`flex flex-col ${previa.casos.length > tamanho ? "h-[30rem]" : "max-h-[30rem]"}`}>
        <DataTable
          aria-label={t("spreadsheetPreview")}
          columns={colunas}
          items={casosDaPagina}
          getKey={(caso) => String(caso.linha)}
          rowDependencies={[t]}
          pagination={<DataTablePagination page={pagina} pageSize={tamanho} totalCount={previa.casos.length} onPageChange={setPagina} onPageSizeChange={(n) => { setTamanho(n); setPagina(1); }} />}
        />
      </div>}
    </section>
  );
}
