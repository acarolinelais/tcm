import { httpDelete, httpGet, httpPatch, httpPatchBody, httpPost, httpPostForm, httpPut } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import {
  mockCasosTesteApi,
  mockFormFactorApi,
  mockModelosDispositivoApi,
  mockProjetosApi,
} from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";
import { DEFAULT_TABLE_PAGE_SIZE } from "@/shared/lib/paginacao";

import type {
  AtualizarCasoTesteInput,
  AtualizarProjetoInput,
  CasoTeste,
  CasoTesteDetalhe,
  CriarCasoTesteInput,
  CriarProjetoInput,
  FormFactorMatriz,
  FormFactorResultados,
  FormFactorExecucao,
  FiltrosFormFactor,
  FiltrosHistoricoProjeto,
  CriarRodadaFormFactorInput,
  EnviarResultadosRodadaInput,
  HistoricoProjeto,
  ImportacaoProjeto,
  ImportacaoSdf,
  UltimaImportacaoSdf,
  KanbanProjeto,
  LinkPullRequest,
  LinksPullRequest,
  NavegacaoBoard,
  ResumoExecucoes,
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
  FormFactorExecucao,
  FiltrosFormFactor,
  FiltrosHistoricoProjeto,
  CriarRodadaFormFactorInput,
  EnviarResultadosRodadaInput,
  HistoricoProjeto,
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
    // O fuso do navegador decide qual é o dia de hoje para a Planned date da planilha (spec 075).
    return httpPostForm<ImportacaoProjeto>(`/api/projetos/importar?fuso_horario=${encodeURIComponent(fusoHorario())}`, body);
  },
  atualizarStatus(id: string, status: StatusProjeto) {
    return useMock
      ? Promise.resolve(mockProjetosApi.atualizarStatus(id, status))
      : httpPatchBody<Projeto>(`/api/projetos/${id}/status`, { status });
  },
  atualizar(id: string, body: AtualizarProjetoInput) {
    if (useMock) return Promise.resolve(mockProjetosApi.atualizar(id, body));
    // O fuso do navegador decide qual é o dia de hoje para a data planejada (spec 071).
    const fuso = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    return httpPut<Projeto>(`/api/projetos/${id}?fuso_horario=${fuso}`, body);
  },
  excluir(id: string) {
    return useMock ? Promise.resolve(mockProjetosApi.excluir(id)) : httpDelete<void>(`/api/projetos/${id}`);
  },
  navegacao() {
    return useMock ? Promise.resolve(mockProjetosApi.navegacao()) : httpGet<NavegacaoBoard>("/api/projetos/navegacao");
  },
};

export const casosTesteApi = {
  kanban(projetoId: string) {
    return useMock ? Promise.resolve(mockCasosTesteApi.kanban(projetoId)) : httpGet<KanbanProjeto>(`/api/projetos/${projetoId}/kanban`);
  },
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

const fusoHorario = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export const formFactorApi = {
  historicoProjeto(projetoId: string, filtros: FiltrosHistoricoProjeto = {}) {
    const { page = 1, pageSize = DEFAULT_TABLE_PAGE_SIZE, tcId, responsavel, sdfId, modeloDispositivoId, periodo, associadosAMim } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.historicoProjeto(projetoId, filtros))
      : httpGet<HistoricoProjeto>(`/api/form-factor/general/projetos/${projetoId}/historico`, {
        fuso_horario: fusoHorario(),
        page,
        page_size: pageSize,
        ...(tcId ? { tc_id: tcId } : {}),
        ...(responsavel ? { responsavel } : {}),
        ...(sdfId ? { sdf_id: sdfId } : {}),
        ...(modeloDispositivoId ? { modelo_dispositivo_id: modeloDispositivoId } : {}),
        ...(periodo ? { [periodo.includes("-W") ? "semana" : "dia"]: periodo } : {}),
        ...(associadosAMim ? { associados_a_mim: "true" } : {}),
      });
  },
  resumoExecucoes(casoTesteId: string) {
    return useMock
      ? Promise.resolve(mockFormFactorApi.resumoExecucoes(casoTesteId))
      : httpGet<ResumoExecucoes>(`/api/form-factor/general/casos/${casoTesteId}/execucoes`, {
        fuso_horario: fusoHorario(),
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
  // O modo mock não grava a importação, então não há o que desfazer.
  ultimaImportacao(projetoId: string) {
    return useMock ? Promise.resolve(null) : httpGet<UltimaImportacaoSdf | null>(`/api/projetos/${projetoId}/relatorios-sdf/ultimo`);
  },
  desfazerImportacao(projetoId: string, importacaoId: string) {
    return httpPost<{ casos_revertidos: number }>(`/api/projetos/${projetoId}/relatorios-sdf/${importacaoId}/desfazer`, {});
  },
};
