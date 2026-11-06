import { httpGet } from "@/core/api/http-client";
import { useMock } from "@/core/config";

import type { FiltrosTimeline, Timeline } from "../model/timeline";
import { timelineMock } from "./timeline.mock";

export const timelineApi = {
  /** `inicio` e `fim` em `AAAA-MM-DD`, `fim` inclusivo (spec 054). */
  obter: async (projetoId: string, inicio: string, fim: string, filtros: FiltrosTimeline): Promise<Timeline> => {
    if (useMock) return timelineMock(inicio, fim, filtros);
    return httpGet<Timeline>(`/api/projetos/${projetoId}/timeline`, {
      inicio,
      fim,
      fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone,
      responsavel_ids: filtros.responsavelIds,
      caso_teste_ids: filtros.casoIds,
    });
  },
};
