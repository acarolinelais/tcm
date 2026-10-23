import { httpDelete, httpGet, httpPatchBody, httpPost } from "@/core/api/http-client";
import type { PagedResult } from "@/shared/types/paged-result";

export interface Setor { id: string; unidade_id: string; nome: string; ativo: boolean }
export interface SetorGerente { setor_id: string; usuario_id: string; ativo: boolean }

export const setoresApi = {
  listar: (page = 1, pageSize = 100, ativo?: boolean, busca?: string) => httpGet<PagedResult<Setor>>("/api/setores", {
    page, page_size: pageSize, ...(ativo === undefined ? {} : { ativo: String(ativo) }), ...(busca ? { busca } : {}),
  }),
  criar: (nome: string) => httpPost<Setor>("/api/setores", { nome }),
  atualizar: (id: string, body: { nome?: string; ativo?: boolean }) => httpPatchBody<Setor>(`/api/setores/${id}`, body),
  gerentes: (id: string) => httpGet<SetorGerente[]>(`/api/setores/${id}/gerentes`),
  associar: (id: string, usuario_id: string) => httpPost<SetorGerente>(`/api/setores/${id}/gerentes`, { usuario_id }),
  desassociar: (setorId: string, usuarioId: string) => httpDelete<void>(`/api/setores/${setorId}/gerentes/${usuarioId}`),
};
