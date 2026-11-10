import { useQuery } from "@tanstack/react-query";

import { bugReportsApi } from "../api/bug-reports.api";
import type { FiltrosBugReport } from "../model/bug-report";

export function useBugReports(projetoId: string, page: number, pageSize: number, filtros: FiltrosBugReport) {
  return useQuery({
    queryKey: ["bug-reports", projetoId, page, pageSize, filtros],
    queryFn: () => bugReportsApi.listar(projetoId, page, pageSize, filtros),
    enabled: Boolean(projetoId),
    placeholderData: (anterior) => anterior,
  });
}
