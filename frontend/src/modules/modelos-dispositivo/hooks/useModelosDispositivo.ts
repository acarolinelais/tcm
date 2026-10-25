import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { modelosDispositivoApi } from "../api/modelos-dispositivo.api";
import type { ModeloDispositivoFiltros, ModeloDispositivoFormValues } from "../model/modelo-dispositivo";

// Prefixo compartilhado com o seletor de Projetos: salvar no catálogo atualiza as opções também.
const queryKey = ["modelos-dispositivo"] as const;

export function useModelosDispositivoList(page: number, pageSize: number, filtros: ModeloDispositivoFiltros, enabled = true) {
  return useQuery({
    queryKey: [...queryKey, page, pageSize, filtros],
    queryFn: () => modelosDispositivoApi.listar(page, pageSize, filtros),
    placeholderData: (prev) => prev,
    enabled,
  });
}

function useInvalidarModelos() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey });
}

export function useCriarModeloDispositivo() {
  const invalidar = useInvalidarModelos();
  return useMutation({ mutationFn: (body: ModeloDispositivoFormValues) => modelosDispositivoApi.criar(body), onSuccess: invalidar });
}

export function useAtualizarModeloDispositivo() {
  const invalidar = useInvalidarModelos();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: ModeloDispositivoFormValues }) => modelosDispositivoApi.atualizar(id, body),
    onSuccess: invalidar,
  });
}

export function useDefinirAtivoModeloDispositivo() {
  const invalidar = useInvalidarModelos();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => (ativo ? modelosDispositivoApi.ativar(id) : modelosDispositivoApi.inativar(id)),
    onSuccess: invalidar,
  });
}
