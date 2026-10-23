import { httpGet, httpPatch, httpPatchBody, httpPost, httpPut } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockUsuarioApi } from "@/core/mock/database";
import type { PagedResult } from "@/shared/types/paged-result";

import type { Usuario, UsuarioFormValues } from "../model/usuario";

const url = "/api/usuarios";

export interface UsuarioFiltros {
  nome?: string;
  email?: string;
  ativo?: boolean;
  perfil_id?: string;
}

export const usuarioApi = {
  listar: (page: number, pageSize: number, filtros: UsuarioFiltros = {}) => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filtros.nome) params.nome = filtros.nome;
    if (filtros.email) params.email = filtros.email;
    if (filtros.ativo !== undefined) params.ativo = String(filtros.ativo);
    if (filtros.perfil_id) params.perfil_id = filtros.perfil_id;
    return useMock ? Promise.resolve(mockUsuarioApi.listar(page, pageSize, filtros)) : httpGet<PagedResult<Usuario>>(url, params);
  },
  obter: (id: string) => useMock ? Promise.resolve(mockUsuarioApi.obter(id)) : httpGet<Usuario>(`${url}/${id}`),
  criar: (body: UsuarioFormValues) => useMock ? Promise.resolve(mockUsuarioApi.criar(body)) : httpPost<Usuario>(url, body),
  atualizar: (id: string, body: UsuarioFormValues) => useMock ? Promise.resolve(mockUsuarioApi.atualizar(id, body)) : httpPut<Usuario>(`${url}/${id}`, body),
  ativar: (id: string) => useMock ? Promise.resolve(mockUsuarioApi.setActive(id, true)) : httpPatch<void>(`${url}/${id}/ativar`),
  inativar: (id: string) => useMock ? Promise.resolve(mockUsuarioApi.setActive(id, false)) : httpPatch<void>(`${url}/${id}/inativar`),
  atribuirResponsavel: (id: string, responsavelId: string | null) => useMock ? Promise.resolve(mockUsuarioApi.setManager(id, responsavelId)) : httpPatchBody<Usuario>(`${url}/${id}/responsavel`, { responsavel_id: responsavelId }),
};
