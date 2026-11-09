import { httpGet } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockBugReportsApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type { FalhaAberta, FiltrosBugReport } from "../model/bug-report";

export const bugReportsApi = {
  listar: (page: number, pageSize: number, filtros: FiltrosBugReport = {}) => {
    if (useMock) return Promise.resolve(mockBugReportsApi.listar(page, pageSize, filtros));
    const preenchidos = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => Boolean(valor?.trim())));
    return httpGet<PagedResult<FalhaAberta>>("/api/bug-reports", { page, page_size: pageSize, ...preenchidos });
  },
};
