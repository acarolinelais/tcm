import { httpDelete, httpGet, httpPatch, httpPatchBody, httpPost, httpPostForm, httpPut } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import {
  mockCasosTesteApi,
  mockFormFactorApi,
  mockModelosDispositivoApi,
  mockProjetosApi,
} from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type {
  AtualizarCasoTesteInput,
  AtualizarProjetoInput,
  CasoTeste,
  CasoTesteDetalhe,
  CriarCasoTesteInput,
  CriarProjetoInput,
  FormFactorMatriz,
  FormFactorResultados,
  FormFactorGlobal,
  FormFactorResultadosGlobais,
  FormFactorExecucao,
  FiltrosFormFactor,
  FiltrosFormFactorGlobal,
  CriarRodadaFormFactorInput,
  EnviarResultadosRodadaInput,
  ImportacaoProjeto,
  ImportacaoSdf,
  LinkPullRequest,
  LinksPullRequest,
  OpcaoModeloDispositivo,
  Projeto,
  StatusProjeto,
  RodadaFormFactor,
} from "../model/projeto";

export type {
  AtualizarCasoTesteInput,
  AtualizarProjetoInput,
  CategoriaCasoTeste,
  CasoTeste,
  CasoTesteDetalhe,
  CriarCasoTesteInput,
  CriarProjetoInput,
  DificuldadeCasoTeste,
  FormFactorMatriz,
  FormFactorResultados,
  FormFactorGlobal,
  FormFactorResultadosGlobais,
  FormFactorExecucao,
  FiltrosFormFactor,
  FiltrosFormFactorGlobal,
  CriarRodadaFormFactorInput,
  EnviarResultadosRodadaInput,
  ImportacaoProjeto,
  ImportacaoSdf,
  LinhaFormFactor,
  LinkPullRequest,
  LinksPullRequest,
  OpcaoModeloDispositivo,
  Projeto,
  SituacaoCasoTeste,
  StatusProjeto,
  RodadaFormFactor,
} from "../model/projeto";

export const projetosApi = {
  listar(page = 1, pageSize = 20, associadosAMim = false) {
    return useMock
      ? Promise.resolve(mockProjetosApi.listar(page, pageSize, associadosAMim))
      : httpGet<PagedResult<Projeto>>("/api/projetos", { page, page_size: pageSize, ...(associadosAMim ? { associados_a_mim: "true" } : {}) });
  },
  obter(id: string) {
    return useMock
      ? Promise.resolve(mockProjetosApi.obter(id))
      : httpGet<Projeto>(`/api/projetos/${id}`);
  },
  criar(body: CriarProjetoInput) {
    return useMock
      ? Promise.resolve(mockProjetosApi.criar(body))
      : httpPost<Projeto>("/api/projetos", body);
  },
  importar(arquivo: File, timeId: string, modelosIds: string[], mockApp?: string, mockOneUi?: string) {
    if (useMock) {
      return Promise.resolve(mockProjetosApi.importar(arquivo, timeId, modelosIds, mockApp, mockOneUi));
    }
    const body = new FormData();
    body.append("arquivo", arquivo);
    body.append("time_id", timeId);
    modelosIds.forEach((modelId) => body.append("modelos_ids", modelId));
    return httpPostForm<ImportacaoProjeto>("/api/projetos/importar", body);
  },
  atualizarStatus(id: string, status: StatusProjeto) {
    return useMock
      ? Promise.resolve(mockProjetosApi.atualizarStatus(id, status))
      : httpPatchBody<Projeto>(`/api/projetos/${id}/status`, { status });
  },
  atualizar(id: string, body: AtualizarProjetoInput) {
    return useMock ? Promise.resolve(mockProjetosApi.atualizar(id, body)) : httpPut<Projeto>(`/api/projetos/${id}`, body);
  },
  excluir(id: string) {
    return useMock ? Promise.resolve(mockProjetosApi.excluir(id)) : httpDelete<void>(`/api/projetos/${id}`);
  },
};

export const casosTesteApi = {
  listar(projetoId: string, page = 1, pageSize = 20, filtros: { responsavelIds?: string[]; associadosAMim?: boolean; semana?: string } = {}) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.listar(projetoId, page, pageSize, filtros))
      : httpGet<PagedResult<CasoTeste>>(`/api/projetos/${projetoId}/test-cases`, {
        page,
        page_size: pageSize,
        ...(filtros.responsavelIds?.length ? { responsavel_id: filtros.responsavelIds } : {}),
        ...(filtros.associadosAMim ? { associados_a_mim: "true" } : {}),
        ...(filtros.semana ? { semana: filtros.semana, fuso_horario: Intl.DateTimeFormat().resolvedOptions().timeZone } : {}),
      });
  },
  obter(id: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.obter(id))
      : httpGet<CasoTesteDetalhe>(`/api/test-cases/${id}`);
  },
  criar(projetoId: string, body: CriarCasoTesteInput) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.criar(projetoId, body))
      : httpPost<CasoTeste>(`/api/projetos/${projetoId}/test-cases`, body);
  },
  atualizar(id: string, body: AtualizarCasoTesteInput) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.atualizar(id, body))
      : httpPut<CasoTeste>(`/api/test-cases/${id}`, body);
  },
  transferirParaBackup(id: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.transferirParaBackup(id))
      : httpPatchBody<CasoTeste>(`/api/test-cases/${id}/transferir-para-backup`, {});
  },
  listarPullRequests(casoId: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.listarPullRequests(casoId))
      : httpGet<LinksPullRequest>(`/api/test-cases/${casoId}/pull-requests`);
  },
  adicionarPullRequest(casoId: string, url: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.adicionarPullRequest(casoId, url))
      : httpPost<LinkPullRequest>(`/api/test-cases/${casoId}/pull-requests`, { url });
  },
  removerPullRequest(casoId: string, linkId: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.removerPullRequest(casoId, linkId))
      : httpPatch<void>(`/api/test-cases/${casoId}/pull-requests/${linkId}/inativar`);
  },
};

export const modelosDispositivoApi = {
  listarOpcoes(page = 1, pageSize = 100) {
    if (useMock) return Promise.resolve(mockModelosDispositivoApi.listarOpcoes(page, pageSize));
    return httpGet<PagedResult<OpcaoModeloDispositivo>>("/api/modelos-dispositivo/opcoes", { page, page_size: pageSize });
  },
};

export const formFactorApi = {
  listarGlobal(filtros: FiltrosFormFactorGlobal = {}) {
    const { page = 1, pageSize = 20, semana, projetoId, responsavelId, tcId, sdfId, modeloDispositivoId, resultado } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.listarGlobal(filtros))
      : httpGet<FormFactorGlobal>("/api/form-factor/general", {
        page,
        page_size: pageSize,
        ...(semana ? { semana } : {}),
        ...(projetoId ? { projeto_id: projetoId } : {}),
        ...(responsavelId ? { responsavel_id: responsavelId } : {}),
        ...(tcId ? { tc_id: tcId } : {}),
        ...(sdfId ? { sdf_id: sdfId } : {}),
        ...(modeloDispositivoId ? { modelo_dispositivo_id: modeloDispositivoId } : {}),
        ...(resultado ? { resultado } : {}),
      });
  },
  listarResultadosGlobais(filtros: FiltrosFormFactorGlobal = {}) {
    const { page = 1, pageSize = 20, semana, projetoId, responsavelId, tcId, sdfId, modeloDispositivoId, resultado, origem } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.listarResultadosGlobais(filtros))
      : httpGet<FormFactorResultadosGlobais>("/api/form-factor/general/results", {
        page,
        page_size: pageSize,
        ...(semana ? { semana } : {}),
        ...(projetoId ? { projeto_id: projetoId } : {}),
        ...(responsavelId ? { responsavel_id: responsavelId } : {}),
        ...(tcId ? { tc_id: tcId } : {}),
        ...(sdfId ? { sdf_id: sdfId } : {}),
        ...(modeloDispositivoId ? { modelo_dispositivo_id: modeloDispositivoId } : {}),
        ...(resultado ? { resultado } : {}),
        ...(origem ? { origem } : {}),
      });
  },
  listar(projetoId: string, filtros: FiltrosFormFactor = {}) {
    const { page = 1, pageSize = 20, semana, responsavelIds, tcId, sdfId, modeloDispositivoId, resultado } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.listar(projetoId, filtros))
      : httpGet<FormFactorMatriz>(`/api/projetos/${projetoId}/form-factor`, {
        page,
        page_size: pageSize,
        ...(semana ? { semana } : {}),
        ...(responsavelIds?.length ? { responsavel_id: responsavelIds } : {}),
        ...(tcId ? { tc_id: tcId } : {}),
        ...(sdfId ? { sdf_id: sdfId } : {}),
        ...(modeloDispositivoId ? { modelo_dispositivo_id: modeloDispositivoId } : {}),
        ...(resultado ? { resultado } : {}),
      });
  },
  listarResultados(projetoId: string, filtros: FiltrosFormFactor = {}) {
    const { page = 1, pageSize = 20, semana, responsavelIds, tcId, sdfId, modeloDispositivoId, resultado, origem } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.listarResultados(projetoId, filtros))
      : httpGet<FormFactorResultados>(`/api/projetos/${projetoId}/form-factor/results`, {
        page,
        page_size: pageSize,
        ...(semana ? { semana } : {}),
        ...(responsavelIds?.length ? { responsavel_id: responsavelIds } : {}),
        ...(tcId ? { tc_id: tcId } : {}),
        ...(sdfId ? { sdf_id: sdfId } : {}),
        ...(modeloDispositivoId ? { modelo_dispositivo_id: modeloDispositivoId } : {}),
        ...(resultado ? { resultado } : {}),
        ...(origem ? { origem } : {}),
      });
  },
  criarRodada(projetoId: string, input: CriarRodadaFormFactorInput) {
    return useMock
      ? Promise.resolve(mockFormFactorApi.criarRodada(projetoId, input))
      : httpPost<RodadaFormFactor>(`/api/projetos/${projetoId}/form-factor/rodadas`, input);
  },
  registrarResultadosRodada(projetoId: string, rodadaId: string, casoTesteId: string, input: EnviarResultadosRodadaInput) {
    return useMock
      ? Promise.resolve(mockFormFactorApi.registrarResultadosRodada(projetoId, rodadaId, casoTesteId, input))
      : httpPost<FormFactorExecucao>(`/api/projetos/${projetoId}/form-factor/rodadas/${rodadaId}/test-cases/${casoTesteId}/resultados`, input);
  },
  importar(projetoId: string, arquivo: File) {
    if (useMock) return Promise.resolve(mockFormFactorApi.importar(projetoId, arquivo));
    const body = new FormData();
    body.append("arquivo", arquivo);
    return httpPostForm<ImportacaoSdf>(`/api/projetos/${projetoId}/relatorios-sdf`, body);
  },
};
