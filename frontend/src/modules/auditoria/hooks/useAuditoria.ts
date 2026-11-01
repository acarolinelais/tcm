import { useQuery } from "@tanstack/react-query";

import { auditoriaApi } from "../api/auditoria.api";
import type { FiltrosAuditoria } from "../model/auditoria";

export function useAuditoria(page: number, pageSize: number, filtros: FiltrosAuditoria, enabled = true) {
  return useQuery({
    queryKey: ["auditoria", page, pageSize, filtros],
    queryFn: () => auditoriaApi.listar(page, pageSize, filtros),
    placeholderData: (anterior) => anterior,
    enabled,
  });
}
