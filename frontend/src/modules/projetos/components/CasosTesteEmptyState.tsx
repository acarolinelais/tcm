import { ClipboardList, SearchX } from "lucide-react";
import { useTranslation } from "react-i18next";

import { Button } from "@/shared/ui/button";
import { TableEmptyState } from "@/shared/ui/table";

/** Estado vazio das tabelas de Test Cases (abas Test Cases e Form Factor), com e sem filtros. */
export function CasosTesteEmptyState({ temFiltros, onLimparFiltros }: { temFiltros: boolean; onLimparFiltros: () => void }) {
  const { t } = useTranslation();
  return <TableEmptyState>
    <div role="status" className="w-full max-w-md text-center">
      <div className="mx-auto mb-4 flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary">{temFiltros ? <SearchX aria-hidden="true" className="size-5" /> : <ClipboardList aria-hidden="true" className="size-5" />}</div>
      <h2 className="text-base font-semibold text-foreground">{t(temFiltros ? "noTestCasesResults" : "noTestCases")}</h2>
      <p className="mx-auto mt-1.5 max-w-sm text-sm leading-6 text-muted-foreground">{t(temFiltros ? "adjustFilters" : "noTestCasesHint")}</p>
      {temFiltros && <Button variant="outline" className="mt-4" onClick={onLimparFiltros}>{t("clearFilters")}</Button>}
    </div>
  </TableEmptyState>;
}
