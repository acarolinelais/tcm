import { httpDelete, httpGet, httpPatchBody, httpPost } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockSetoresApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

export interface Setor { id: string; unidade_id: string; nome: string; ativo: boolean }
export interface SetorGerente { setor_id: string; usuario_id: string; ativo: boolean }

export const setoresApi = {
  listar: (page = 1, pageSize = 100, ativo?: boolean, busca?: string) => useMock ? Promise.resolve(mockSetoresApi.listar(page, pageSize, ativo, busca)) : httpGet<PagedResult<Setor>>("/api/setores", {
    page, page_size: pageSize, ...(ativo === undefined ? {} : { ativo: String(ativo) }), ...(busca ? { busca } : {}),
  }),
  criar: (nome: string) => useMock ? Promise.resolve(mockSetoresApi.criar(nome)) : httpPost<Setor>("/api/setores", { nome }),
  atualizar: (id: string, body: { nome?: string; ativo?: boolean }) => useMock ? Promise.resolve(mockSetoresApi.atualizar(id, body)) : httpPatchBody<Setor>(`/api/setores/${id}`, body),
  gerentes: (id: string) => useMock ? Promise.resolve(mockSetoresApi.gerentes(id)) : httpGet<SetorGerente[]>(`/api/setores/${id}/gerentes`),
  associar: (id: string, usuario_id: string) => useMock ? Promise.resolve(mockSetoresApi.associar(id, usuario_id)) : httpPost<SetorGerente>(`/api/setores/${id}/gerentes`, { usuario_id }),
  desassociar: (setorId: string, usuarioId: string) => useMock ? Promise.resolve(mockSetoresApi.desassociar(setorId, usuarioId)) : httpDelete<void>(`/api/setores/${setorId}/gerentes/${usuarioId}`),
};
