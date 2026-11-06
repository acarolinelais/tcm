import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PerfilAtual } from "@/core/auth/api";

import { casosTesteApi } from "../api/projetos.api";
import type { KanbanProjeto, StatusCasoTeste } from "../model/projeto";

const kanbanQueryKey = (projetoId: string, perfil: PerfilAtual) => ["projetos", projetoId, "kanban", perfil.unidade_id, perfil.id] as const;

export function useKanban(projetoId: string, perfil: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: kanbanQueryKey(projetoId, perfil),
    queryFn: () => casosTesteApi.kanban(projetoId),
    enabled: Boolean(projetoId) && enabled,
  });
}

export interface MoverCasoInput {
  casoId: string;
  destino: StatusCasoTeste;
  /** Obrigatória ao mover para `Cancelled` (spec 026). */
  justificativa?: string;
}

/** Move o card na hora e desfaz se a API recusar; ao terminar, recarrega o Kanban e a aba Test Cases. */
export function useMoverCasoKanban(projetoId: string, perfil: PerfilAtual) {
  const queryClient = useQueryClient();
  const queryKey = kanbanQueryKey(projetoId, perfil);
  return useMutation({
    mutationFn: ({ casoId, destino, justificativa }: MoverCasoInput) =>
      casosTesteApi.atualizar(casoId, destino === "Cancelled" ? { status: destino, justificativa_exclusao: justificativa } : { status: destino }),
    onMutate: async (input: MoverCasoInput) => {
      await queryClient.cancelQueries({ queryKey });
      const anterior = queryClient.getQueryData<KanbanProjeto>(queryKey);
      if (anterior) queryClient.setQueryData(queryKey, moverCard(anterior, input));
      return { anterior };
    },
    onError: (_erro, _input, contexto) => {
      if (contexto?.anterior) queryClient.setQueryData(queryKey, contexto.anterior);
    },
    // Toda a árvore, como os outros mutadores de caso. Sem esperar a recarga: a mutação termina quando a
    // API responde, e o Kanban e a aba Test Cases se atualizam em seguida.
    onSettled: () => { void queryClient.invalidateQueries({ queryKey: ["projetos"] }); },
  });
}

function moverCard(kanban: KanbanProjeto, { casoId, destino }: MoverCasoInput): KanbanProjeto {
  const card = kanban.colunas.flatMap((coluna) => coluna.casos).find((item) => item.id === casoId);
  if (!card) return kanban;
  // Sem destinos até a API confirmar: o card não pode ser movido de novo enquanto salva.
  const movido = { ...card, destinos: [] };
  return {
    ...kanban,
    colunas: kanban.colunas.map((coluna) => {
      const casos = coluna.casos.filter((item) => item.id !== casoId);
      if (coluna.status === destino) casos.unshift(movido);
      return { ...coluna, casos, total: coluna.total + casos.length - coluna.casos.length };
    }),
  };
}
