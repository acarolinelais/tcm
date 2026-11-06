import { useQuery } from "@tanstack/react-query";
import type { PerfilAtual } from "@/core/auth/api";

import { timelineApi } from "../api/timeline.api";
import type { FiltrosTimeline } from "../model/timeline";

/**
 * Ao trocar só os filtros, a grade anterior fica na tela enquanto a nova carrega. Ao trocar de projeto ou de
 * período, não: os cards de antes cairiam nas colunas erradas ou viriam de outro projeto.
 */
export function useTimeline(projetoId: string | null, inicio: string, fim: string, filtros: FiltrosTimeline, perfil: PerfilAtual) {
  return useQuery({
    queryKey: ["timeline", perfil.unidade_id, perfil.id, projetoId, inicio, fim, filtros],
    queryFn: () => timelineApi.obter(projetoId ?? "", inicio, fim, filtros),
    enabled: Boolean(projetoId),
    placeholderData: (anterior, consultaAnterior) => {
      const [, , , projeto, inicioAnterior, fimAnterior] = consultaAnterior?.queryKey ?? [];
      return projeto === projetoId && inicioAnterior === inicio && fimAnterior === fim ? anterior : undefined;
    },
  });
}
