import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PerfilAtual } from "@/core/auth/api";

import {
  casosTesteApi,
  formFactorApi,
  modelosDispositivoApi,
  projetosApi,
  type AtualizarCasoTesteInput,
  type CriarCasoTesteInput,
  type CriarProjetoInput,
  type StatusProjeto,
} from "../api/projetos.api";

export const projetosQueryKey = ["projetos"] as const;
export const modelosQueryKey = ["modelos-dispositivo"] as const;

export function useProjetosPessoais(perfil: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", "pessoais", perfil.unidade_id, perfil.id],
    queryFn: () => projetosApi.listar(1, 1, true),
    refetchOnMount: "always",
    enabled,
  });
}

export function useProjetosSeletor(perfil: PerfilAtual) {
  const pessoal = perfil.perfil_codigo === "USUARIO_PADRAO";
  return useInfiniteQuery({
    queryKey: ["projetos", "seletor", perfil.unidade_id, perfil.id, pessoal],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => pessoal ? projetosApi.listar(pageParam, 100, true) : projetosApi.listar(pageParam, 100),
    getNextPageParam: (last) => last.page * last.page_size < last.total_count ? last.page + 1 : undefined,
  });
}

export function useProjetos(page: number, pageSize: number) {
  return useQuery({
    queryKey: [...projetosQueryKey, page, pageSize],
    queryFn: () => projetosApi.listar(page, pageSize),
  });
}

export function useCriarProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarProjetoInput) => projetosApi.criar(input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projetosQueryKey }),
  });
}

export function useImportarProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ arquivo, timeId, modelosIds, mockApp, mockOneUi }: { arquivo: File; timeId: string; modelosIds: string[]; mockApp?: string; mockOneUi?: string }) => projetosApi.importar(arquivo, timeId, modelosIds, mockApp, mockOneUi),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projetosQueryKey }),
  });
}

export function useAtualizarStatusProjeto() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: StatusProjeto }) => projetosApi.atualizarStatus(id, status),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: projetosQueryKey }),
  });
}

export function useCasosTeste(projetoId: string, page: number, pageSize: number,
  filtros?: { responsavelId?: string; associadosAMim?: boolean }, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", projetoId, "test-cases", page, pageSize, filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => filtros ? casosTesteApi.listar(projetoId, page, pageSize, filtros) : casosTesteApi.listar(projetoId, page, pageSize),
    enabled: Boolean(projetoId) && enabled,
  });
}

export function useCriarCasoTeste(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CriarCasoTesteInput) => casosTesteApi.criar(projetoId, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }),
  });
}

export function useAtualizarCasoTeste(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projetos", projetoId, "atualizar-caso"],
    mutationFn: ({ id, input }: { id: string; input: AtualizarCasoTesteInput }) => casosTesteApi.atualizar(id, input),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos"] }),
  });
}

export function useTransferirCasoTeste(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projetos", projetoId, "transferir-caso"],
    mutationFn: (id: string) => casosTesteApi.transferirParaBackup(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos"] }),
  });
}

export function useModelosDispositivo(ativo?: boolean) {
  return useQuery({
    queryKey: [...modelosQueryKey, ativo],
    queryFn: () => modelosDispositivoApi.listar(1, 100, ativo),
  });
}

export function useCriarModeloDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (nome: string) => modelosDispositivoApi.criar(nome),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: modelosQueryKey }),
  });
}

export function useAtualizarModeloDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: { nome?: string; ativo?: boolean } }) => modelosDispositivoApi.atualizar(id, body),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: modelosQueryKey }),
  });
}

export function useDefinirAtivoModeloDispositivo() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ativo }: { id: string; ativo: boolean }) => modelosDispositivoApi.definirAtivo(id, ativo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: modelosQueryKey }),
  });
}

export function useFormFactor(projetoId: string, filtros: { page?: number; pageSize?: number; semana?: string; oneUi?: string }) {
  return useQuery({
    queryKey: ["projetos", projetoId, "form-factor", filtros],
    queryFn: () => formFactorApi.listar(projetoId, filtros),
    enabled: Boolean(projetoId),
  });
}

export function useImportarRelatorioSdf(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: File) => formFactorApi.importar(projetoId, arquivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }),
  });
}
