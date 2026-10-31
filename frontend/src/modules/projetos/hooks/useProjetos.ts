import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { PerfilAtual } from "@/core/auth/api";
import { ApiError } from "@/shared/api/problem-details";

import {
  casosTesteApi,
  formFactorApi,
  projetosApi,
  type AtualizarCasoTesteInput,
  type CriarCasoTesteInput,
  type CriarProjetoInput,
  type FiltrosFormFactor,
  type FiltrosHistoricoProjeto,
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

/** Um projeto do escopo; a tela do projeto e a do Kanban pelo Board compartilham este cache. */
export function useProjeto(projetoId: string, perfil: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", "detalhe", projetoId, perfil.unidade_id, perfil.id],
    queryFn: () => projetosApi.obter(projetoId),
    enabled: Boolean(projetoId) && enabled,
  });
}

/** Árvore setor → time → projeto do escopo, para a escolha em cascata do Board (spec 037). */
export function useNavegacaoBoard(perfil: PerfilAtual) {
  return useQuery({
    queryKey: ["projetos", "navegacao", perfil.unidade_id, perfil.id],
    queryFn: () => projetosApi.navegacao(),
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
  filtros?: { responsavelIds?: string[]; associadosAMim?: boolean; semana?: string }, perfil?: PerfilAtual, enabled = true) {
  return useQuery({
    queryKey: ["projetos", projetoId, "test-cases", page, pageSize, filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => filtros ? casosTesteApi.listar(projetoId, page, pageSize, filtros) : casosTesteApi.listar(projetoId, page, pageSize),
    enabled: Boolean(projetoId) && enabled,
  });
}

export const ehNaoEncontrado = (erro: unknown) => erro instanceof ApiError && erro.problem.status === 404;

/** 4xx (ex.: caso fora do escopo) não melhora tentando de novo. */
const semRetryEm4xx = (falhas: number, erro: Error) => !(erro instanceof ApiError && erro.problem.status < 500) && falhas < 3;

/** Detalhe de um Test Case com os textos da planilha (spec 028). */
export function useCasoTeste(id: string, perfil?: PerfilAtual) {
  return useQuery({
    queryKey: ["projetos", "test-cases", "detalhe", id, perfil?.unidade_id, perfil?.id],
    queryFn: () => casosTesteApi.obter(id),
    enabled: Boolean(id),
    retry: semRetryEm4xx,
  });
}

const pullRequestsQueryKey = (casoId: string) => ["projetos", "test-cases", "pull-requests", casoId] as const;

/** Links de PR do caso (spec 030). As mutações só invalidam esta lista: os links não aparecem nas tabelas. */
export function usePullRequestsCasoTeste(casoId: string, perfil?: PerfilAtual) {
  return useQuery({
    queryKey: [...pullRequestsQueryKey(casoId), perfil?.unidade_id, perfil?.id],
    queryFn: () => casosTesteApi.listarPullRequests(casoId),
    enabled: Boolean(casoId),
    retry: semRetryEm4xx,
  });
}

export function useAdicionarPullRequest(casoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (url: string) => casosTesteApi.adicionarPullRequest(casoId, url),
    // Também no erro: um 409 significa que outra pessoa já adicionou o link, e a lista precisa mostrá-lo.
    onSettled: () => queryClient.invalidateQueries({ queryKey: pullRequestsQueryKey(casoId) }),
  });
}

export function useRemoverPullRequest(casoId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (linkId: string) => casosTesteApi.removerPullRequest(casoId, linkId),
    // Também no erro: um 404 significa que outra pessoa já removeu, e a lista precisa refletir isso.
    onSettled: () => queryClient.invalidateQueries({ queryKey: pullRequestsQueryKey(casoId) }),
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

export function useHistoricoProjeto(projetoId: string, filtros: FiltrosHistoricoProjeto, perfil?: PerfilAtual) {
  return useQuery({
    queryKey: ["form-factor", "historico", projetoId, filtros, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.historicoProjeto(projetoId, filtros),
    enabled: Boolean(projetoId),
    // Troca de página ou filtro mantém a tabela até a resposta chegar; outro projeto ou outro perfil não herda os dados.
    placeholderData: (anterior, consultaAnterior) => {
      const [, , projeto, , unidadeId, usuarioId] = consultaAnterior?.queryKey ?? [];
      return projeto === projetoId && unidadeId === perfil?.unidade_id && usuarioId === perfil?.id ? anterior : undefined;
    },
  });
}

export function useResumoExecucoes(casoTesteId: string | null, perfil?: PerfilAtual) {
  return useQuery({
    queryKey: ["form-factor", "resumo-execucoes", casoTesteId, perfil?.unidade_id, perfil?.id],
    queryFn: () => formFactorApi.resumoExecucoes(casoTesteId!),
    enabled: Boolean(casoTesteId),
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
