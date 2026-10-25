import { httpGet, httpPatchBody, httpPost, httpPut } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockModelosDispositivoApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type { ModeloDispositivo, ModeloDispositivoFiltros, ModeloDispositivoFormValues } from "../model/modelo-dispositivo";

const url = "/api/modelos-dispositivo";

// Descrição vazia vai como null: o backend grava "sem descrição".
const corpo = ({ nome, descricao }: ModeloDispositivoFormValues) => ({ nome, descricao: descricao || null });

export const modelosDispositivoApi = {
  listar(page: number, pageSize: number, filtros: ModeloDispositivoFiltros = {}) {
    if (useMock) return Promise.resolve(mockModelosDispositivoApi.listar(page, pageSize, filtros.ativo, filtros.busca));
    return httpGet<PagedResult<ModeloDispositivo>>(url, {
      page,
      page_size: pageSize,
      ...(filtros.ativo === undefined ? {} : { ativo: String(filtros.ativo) }),
      ...(filtros.busca ? { busca: filtros.busca } : {}),
    });
  },
  criar(body: ModeloDispositivoFormValues) {
    return useMock ? Promise.resolve(mockModelosDispositivoApi.criar(corpo(body))) : httpPost<ModeloDispositivo>(url, corpo(body));
  },
  atualizar(id: string, body: ModeloDispositivoFormValues) {
    return useMock ? Promise.resolve(mockModelosDispositivoApi.atualizar(id, corpo(body))) : httpPut<ModeloDispositivo>(`${url}/${id}`, corpo(body));
  },
  ativar(id: string) {
    return useMock ? Promise.resolve(mockModelosDispositivoApi.definirAtivo(id, true)) : httpPatchBody<ModeloDispositivo>(`${url}/${id}/ativar`, {});
  },
  inativar(id: string) {
    return useMock ? Promise.resolve(mockModelosDispositivoApi.definirAtivo(id, false)) : httpPatchBody<ModeloDispositivo>(`${url}/${id}/inativar`, {});
  },
};
