import { useMutation, useQueryClient } from "@tanstack/react-query";

import { casosTesteApi, type CasoTeste } from "../api/projetos.api";

export interface ResultadoTransferenciaEmLote {
  transferidos: number;
  falhas: { tcId: string; motivo: string }[];
}

/**
 * Transfere vários Test Cases ao backup de cada um (spec 022, RN-10). Reusa a rota individual: as chamadas
 * correm em paralelo e uma falha não interrompe as demais. A lista é invalidada uma vez, no fim.
 */
export function useTransferirEmLote(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projetos", projetoId, "transferir-em-lote"],
    mutationFn: async (casos: Pick<CasoTeste, "id" | "tc_id">[]): Promise<ResultadoTransferenciaEmLote> => {
      const resultados = await Promise.allSettled(casos.map((caso) => casosTesteApi.transferirParaBackup(caso.id)));
      const falhas = resultados.flatMap((resultado, indice) => resultado.status === "rejected"
        ? [{ tcId: casos[indice].tc_id, motivo: resultado.reason instanceof Error ? resultado.reason.message : String(resultado.reason) }]
        : []);
      return { transferidos: casos.length - falhas.length, falhas };
    },
    onSettled: () => queryClient.invalidateQueries({ queryKey: ["projetos"] }),
  });
}
