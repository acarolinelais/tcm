import { useQuery } from "@tanstack/react-query";

import { bugReportsApi } from "../api/bug-reports.api";
import type { FiltrosBugReport } from "../model/bug-report";

export function useBugReports(page: number, pageSize: number, filtros: FiltrosBugReport) {
  return useQuery({
    queryKey: ["bug-reports", page, pageSize, filtros],
    queryFn: () => bugReportsApi.listar(page, pageSize, filtros),
    placeholderData: (anterior) => anterior,
  });
}
