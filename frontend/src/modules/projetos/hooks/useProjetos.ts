import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PerfilAtual } from "@/core/auth/api";

import {
  casosTesteApi,
  formFactorApi,
  projetosApi,
  type AtualizarCasoTesteInput,
  type CriarCasoTesteInput,
  type CriarProjetoInput,
  type FiltrosFormFactor,
  type FiltrosFormFactorGlobal,
  type CriarRodadaFormFactorInput,
  type EnviarResultadosRodadaInput,
  type StatusProjeto,
} from "../api/projetos.api";

export const projetosQueryKey = ["projetos"] as const;

export function useProjetosPessoais(perfil: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", "pessoais", perfil.unidade_id, perfil.id],
    queryFn: () => projetosApi.listar(1, 1, true),
    refetchOnMount: "always",
    enabled,
  });
}

export function useProjetosSeletor(perfil: PerfilAtual, enabled = true) {
  const pessoal = perfil.perfil_codigo === "USUARIO_PADRAO";
  return useInfiniteQuery({
    queryKey: ["projetos", "seletor", perfil.unidade_id, perfil.id, pessoal],
    initialPageParam: 1,
    queryFn: ({ pageParam }) => pessoal ? projetosApi.listar(pageParam, 100, true) : projetosApi.listar(pageParam, 100),
    getNextPageParam: (last) => last.page * last.page_size < last.total_count ? last.page + 1 : undefined,
    enabled,
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
  filtros?: { responsavelId?: string; associadosAMim?: boolean; semana?: string }, perfil?: PerfilAtual, enabled = true) {
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
    // Toda a árvore de projetos: a lista e os contadores também mudam com um caso novo.
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos"] }),
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

export function useFormFactor(projetoId: string, filtros: FiltrosFormFactor, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", projetoId, "form-factor", filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.listar(projetoId, filtros),
    enabled: Boolean(projetoId) && enabled,
  });
}

export function useFormFactorGlobal(filtros: FiltrosFormFactorGlobal, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["form-factor", "global", filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.listarGlobal(filtros),
    enabled,
  });
}

export function useFormFactorResultadosGlobais(filtros: FiltrosFormFactorGlobal, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["form-factor", "global-results", filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.listarResultadosGlobais(filtros),
    enabled,
  });
}

export function useFormFactorResultados(projetoId: string, filtros: FiltrosFormFactor, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", projetoId, "form-factor-results", filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.listarResultados(projetoId, filtros),
    enabled: Boolean(projetoId) && enabled,
  });
}

export function useCriarRodadaFormFactor(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projetos", projetoId, "form-factor-manual"],
    mutationFn: (input: CriarRodadaFormFactorInput) => formFactorApi.criarRodada(projetoId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }),
        queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor-results"] }),
      ]);
    },
  });
}

export function useRegistrarResultadosRodadaFormFactor(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationKey: ["projetos", projetoId, "form-factor-rodada-results"],
    mutationFn: ({ rodadaId, casoTesteId, input }: { rodadaId: string; casoTesteId: string; input: EnviarResultadosRodadaInput }) =>
      formFactorApi.registrarResultadosRodada(projetoId, rodadaId, casoTesteId, input),
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }),
        queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor-results"] }),
        queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "test-cases"] }),
      ]);
    },
  });
}

export function useImportarRelatorioSdf(projetoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (arquivo: File) => formFactorApi.importar(projetoId, arquivo),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["projetos", projetoId, "form-factor"] }),
  });
}
