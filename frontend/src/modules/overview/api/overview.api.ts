import { useMock } from "@/core/config";
import { httpGet } from "@/core/api/http-client";

import type { OverviewData, OverviewResponse } from "../model/overview";
import { overviewMock } from "./overview.mock";

export const overviewApi = {
  obter: async (): Promise<OverviewData> => {
    // Modo de demonstração (spec 010): dados de exemplo (spec 039, RN-06).
    if (useMock) return overviewMock;
    const r = await httpGet<OverviewResponse>("/api/overview", {
      fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone,
    });
    return {
      total: r.total,
      concluidos: r.concluidos,
      emAndamento: r.em_andamento,
      aFazer: r.a_fazer,
      atribuidos: r.atribuidos,
      desempenho: r.desempenho,
    };
  },
};
