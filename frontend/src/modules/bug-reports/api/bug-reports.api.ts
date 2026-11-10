import { httpGet } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockBugReportsApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type { CasoComFalhas, FiltrosBugReport } from "../model/bug-report";

export const bugReportsApi = {
  listar: (projetoId: string, page: number, pageSize: number, filtros: FiltrosBugReport = {}) => {
    if (useMock) return Promise.resolve(mockBugReportsApi.listar(projetoId, page, pageSize, filtros));
    const { periodo, ...outros } = filtros;
    const preenchidos = Object.fromEntries(Object.entries(outros).filter(([, valor]) => Boolean(valor?.trim())));
    // O período vai como `dia` ou `semana`, no fuso do navegador, como na General Results.
    const recorte: Record<string, string> = periodo ? { [periodo.includes("-W") ? "semana" : "dia"]: periodo, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone } : {};
    return httpGet<PagedResult<CasoComFalhas>>("/api/bug-reports", { projeto_id: projetoId, page, page_size: pageSize, ...preenchidos, ...recorte });
  },
};
