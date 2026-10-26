import type { TFunction } from "i18next";
import { ClipboardList } from "lucide-react";

import { estadoDaTabela } from "@/shared/ui/data-table-state";

/** Os quatro estados das listagens de Test Cases (aba Test Cases e resumo do Form Factor), com os mesmos textos. */
export function estadoCasosTeste(t: TFunction, e: { isLoading: boolean; isError: boolean; isEmpty: boolean; hasFilters: boolean; onClearFilters: () => void; errorLabel: string }) {
  return estadoDaTabela({
    ...e,
    loadingLabel: t("loading"),
    clearFiltersLabel: t("clearFilters"),
    empty: { icon: <ClipboardList aria-hidden="true" className="size-5" />, title: t("noTestCases"), hint: t("noTestCasesHint") },
    filtered: { title: t("noTestCasesResults"), hint: t("adjustFilters") },
  });
}
