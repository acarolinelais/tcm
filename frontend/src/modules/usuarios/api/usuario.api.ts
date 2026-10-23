import { httpGet, httpPatch, httpPost, httpPut } from "@/core/api/http-client";
import type { PagedResult } from "@/shared/types/paged-result";

import type { Usuario, UsuarioFormValues } from "../model/usuario";

const url = "/api/usuarios";

export interface UsuarioFiltros {
  nome?: string;
  email?: string;
  ativo?: boolean;
  perfil_id?: string;
  sem_perfil?: boolean;
}

export const usuarioApi = {
  listar: (page: number, pageSize: number, filtros: UsuarioFiltros = {}) => {
    const params: Record<string, string | number> = { page, page_size: pageSize };
    if (filtros.nome) params.nome = filtros.nome;
    if (filtros.email) params.email = filtros.email;
    if (filtros.ativo !== undefined) params.ativo = String(filtros.ativo);
    if (filtros.perfil_id) params.perfil_id = filtros.perfil_id;
    if (filtros.sem_perfil) params.sem_perfil = "true";
    return httpGet<PagedResult<Usuario>>(url, params);
  },
  obter: (id: string) => httpGet<Usuario>(`${url}/${id}`),
  criar: (body: UsuarioFormValues) => httpPost<Usuario>(url, body),
  atualizar: (id: string, body: UsuarioFormValues) => httpPut<Usuario>(`${url}/${id}`, body),
  ativar: (id: string) => httpPatch<void>(`${url}/${id}/ativar`),
  inativar: (id: string) => httpPatch<void>(`${url}/${id}/inativar`),
};
