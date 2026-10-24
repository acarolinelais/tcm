import { httpDelete, httpGet, httpPatchBody, httpPost, httpPostForm, httpPut } from "@/core/api/http-client";
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
  CriarCasoTesteInput,
  CriarProjetoInput,
  ImportacaoProjeto,
  ImportacaoSdf,
  LinhaFormFactor,
  ModeloDispositivo,
  Projeto,
  StatusProjeto,
} from "../model/projeto";

export type {
  AtualizarCasoTesteInput,
  AtualizarProjetoInput,
  CategoriaCasoTeste,
  CasoTeste,
  CriarCasoTesteInput,
  CriarProjetoInput,
  DificuldadeCasoTeste,
  ImportacaoProjeto,
  ImportacaoSdf,
  LinhaFormFactor,
  ModeloDispositivo,
  Projeto,
  SituacaoCasoTeste,
  StatusProjeto,
} from "../model/projeto";

export const projetosApi = {
  listar(page = 1, pageSize = 20) {
    return useMock
      ? Promise.resolve(mockProjetosApi.listar(page, pageSize))
      : httpGet<PagedResult<Projeto>>("/api/projetos", { page, page_size: pageSize });
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
  listar(projetoId: string, page = 1, pageSize = 20, filtros: { responsavelId?: string } = {}) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.listar(projetoId, page, pageSize, filtros))
      : httpGet<PagedResult<CasoTeste>>(`/api/projetos/${projetoId}/test-cases`, {
        page,
        page_size: pageSize,
        ...(filtros.responsavelId ? { responsavel_id: filtros.responsavelId } : {}),
      });
  },
  obter(id: string) {
    return useMock
      ? Promise.resolve(mockCasosTesteApi.obter(id))
      : httpGet<CasoTeste>(`/api/test-cases/${id}`);
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
};

export const modelosDispositivoApi = {
  listar(page = 1, pageSize = 100, ativo?: boolean, busca?: string) {
    if (useMock) return Promise.resolve(mockModelosDispositivoApi.listar(page, pageSize, ativo, busca));
    return httpGet<PagedResult<ModeloDispositivo>>("/api/modelos-dispositivo", {
      page,
      page_size: pageSize,
      ...(ativo === undefined ? {} : { ativo: String(ativo) }),
      ...(busca ? { busca } : {}),
    });
  },
  criar(nome: string) {
    return useMock
      ? Promise.resolve(mockModelosDispositivoApi.criar(nome))
      : httpPost<ModeloDispositivo>("/api/modelos-dispositivo", { nome });
  },
  atualizar(id: string, body: { nome?: string; ativo?: boolean }) {
    return useMock
      ? Promise.resolve(mockModelosDispositivoApi.atualizar(id, body))
      : httpPut<ModeloDispositivo>(`/api/modelos-dispositivo/${id}`, body);
  },
  definirAtivo(id: string, ativo: boolean) {
    return useMock
      ? Promise.resolve(mockModelosDispositivoApi.definirAtivo(id, ativo))
      : httpPatchBody<ModeloDispositivo>(`/api/modelos-dispositivo/${id}/${ativo ? "ativar" : "inativar"}`, {});
  },
};

export const formFactorApi = {
  listar(projetoId: string, filtros: { page?: number; pageSize?: number; semana?: string; oneUi?: string } = {}) {
    const { page = 1, pageSize = 20, semana, oneUi } = filtros;
    return useMock
      ? Promise.resolve(mockFormFactorApi.listar(projetoId, page, pageSize, semana, oneUi))
      : httpGet<PagedResult<LinhaFormFactor>>(`/api/projetos/${projetoId}/form-factor`, {
        page,
        page_size: pageSize,
        ...(semana ? { semana } : {}),
        ...(oneUi ? { one_ui: oneUi } : {}),
      });
  },
  importar(projetoId: string, arquivo: File) {
    if (useMock) return Promise.resolve(mockFormFactorApi.importar(projetoId, arquivo));
    const body = new FormData();
    body.append("arquivo", arquivo);
    return httpPostForm<ImportacaoSdf>(`/api/projetos/${projetoId}/relatorios-sdf`, body);
  },
};
