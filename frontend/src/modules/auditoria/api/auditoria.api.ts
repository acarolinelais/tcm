import { httpGet } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockAuditoriaApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type { FiltrosAuditoria, RegistroAuditoria } from "../model/auditoria";

export const auditoriaApi = {
  listar: (page: number, pageSize: number, filtros: FiltrosAuditoria = {}) => {
    if (useMock) return Promise.resolve(mockAuditoriaApi.listar(page, pageSize, filtros));
    // Só os filtros preenchidos; `usuario_id` vai repetido na query (ADR 0017).
    const preenchidos = Object.fromEntries(Object.entries(filtros).filter(([, valor]) => Boolean(valor)));
    return httpGet<PagedResult<RegistroAuditoria>>("/api/auditoria", {
      page,
      page_size: pageSize,
      fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone,
      ...preenchidos,
    });
  },
};
