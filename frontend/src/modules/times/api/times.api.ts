import { httpDelete, httpGet, httpPost, httpPatchBody } from "@/core/api/http-client";
import type { PagedResult } from "@/shared/types/paged-result";
import type { Usuario } from "@/modules/usuarios/model/usuario";

export interface Time { id: string; setor_id: string; nome: string; gerente_id: string | null; ativo: boolean }
export interface TimeMembro { id: string; time_id: string; usuario_id: string; usuario_nome?: string | null; usuario_perfil?: string | null; usuario_perfil_codigo?: string | null; ativo: boolean }
export const timesApi = {
  listar: (page = 1, pageSize = 100, filtros: { setor_id?: string; ativo?: boolean; busca?: string } = {}) => httpGet<PagedResult<Time>>("/api/times", {
    page, page_size: pageSize,
    ...(filtros.setor_id ? { setor_id: filtros.setor_id } : {}),
    ...(filtros.ativo === undefined ? {} : { ativo: String(filtros.ativo) }),
    ...(filtros.busca ? { busca: filtros.busca } : {}),
  }),
  criar: (body: { nome: string; setor_id: string }) => httpPost<Time>("/api/times", body),
  definirAtivo: (id: string, ativo: boolean) => httpPatchBody<Time>(`/api/times/${id}/${ativo ? "ativar" : "inativar"}`, {}),
  membros: (id: string) => httpGet<TimeMembro[]>(`/api/times/${id}/membros`),
  usuariosDisponiveis: () => httpGet<Usuario[]>("/api/times/usuarios-disponiveis"),
  adicionar: (id: string, usuario_id: string) => httpPost<TimeMembro>(`/api/times/${id}/membros`, { usuario_id }),
  remover: (id: string, usuarioId: string) => httpDelete<void>(`/api/times/${id}/membros/${usuarioId}`),
};
