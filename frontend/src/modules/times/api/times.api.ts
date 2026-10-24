import { httpDelete, httpGet, httpPost, httpPatchBody } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockTimesApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";
import type { Usuario } from "@/modules/usuarios/model/usuario";

export interface Time { id: string; setor_id: string; setor_nome?: string | null; nome: string; gerente_id: string | null; ativo: boolean }
export interface TimeMembro { id: string; time_id: string; usuario_id: string; usuario_nome?: string | null; usuario_user_id?: string | null; usuario_perfil?: string | null; usuario_perfil_codigo?: string | null; ativo: boolean }
export const timesApi = {
  listar: (page = 1, pageSize = 100, filtros: { setor_id?: string; ativo?: boolean; busca?: string } = {}) => useMock ? Promise.resolve(mockTimesApi.listar(page, pageSize, filtros)) : httpGet<PagedResult<Time>>("/api/times", {
    page, page_size: pageSize,
    ...(filtros.setor_id ? { setor_id: filtros.setor_id } : {}),
    ...(filtros.ativo === undefined ? {} : { ativo: String(filtros.ativo) }),
    ...(filtros.busca ? { busca: filtros.busca } : {}),
  }),
  criar: (body: { nome: string; setor_id: string }) => useMock ? Promise.resolve(mockTimesApi.criar(body)) : httpPost<Time>("/api/times", body),
  atualizar: (id: string, body: { nome: string }) => useMock ? Promise.resolve(mockTimesApi.atualizar(id, body)) : httpPatchBody<Time>(`/api/times/${id}`, body),
  definirAtivo: (id: string, ativo: boolean) => useMock ? Promise.resolve(mockTimesApi.definirAtivo(id, ativo)) : httpPatchBody<Time>(`/api/times/${id}/${ativo ? "ativar" : "inativar"}`, {}),
  membros: (id: string) => useMock ? Promise.resolve(mockTimesApi.membros(id)) : httpGet<TimeMembro[]>(`/api/times/${id}/membros`),
  usuariosDisponiveis: () => useMock ? Promise.resolve(mockTimesApi.usuariosDisponiveis()) : httpGet<Usuario[]>("/api/times/usuarios-disponiveis"),
  adicionar: (id: string, usuario_id: string) => useMock ? Promise.resolve(mockTimesApi.adicionar(id, usuario_id)) : httpPost<TimeMembro>(`/api/times/${id}/membros`, { usuario_id }),
  remover: (id: string, usuarioId: string) => useMock ? Promise.resolve(mockTimesApi.remover(id, usuarioId)) : httpDelete<void>(`/api/times/${id}/membros/${usuarioId}`),
};
