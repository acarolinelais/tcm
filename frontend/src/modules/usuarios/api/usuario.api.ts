import { httpGet, httpPatch, httpPost, httpPut } from "@/core/api/http-client";
import type { PagedResult } from "@/shared/types/paged-result";

import type { Usuario, UsuarioFormValues } from "../model/usuario";

const url = "/api/usuarios";

export const usuarioApi = {
  listar: (page: number, pageSize: number) =>
    httpGet<PagedResult<Usuario>>(url, { page, page_size: pageSize }),
  obter: (id: string) => httpGet<Usuario>(`${url}/${id}`),
  criar: (body: UsuarioFormValues) => httpPost<Usuario>(url, body),
  atualizar: (id: string, body: UsuarioFormValues) => httpPut<Usuario>(`${url}/${id}`, body),
  ativar: (id: string) => httpPatch<void>(`${url}/${id}/ativar`),
  inativar: (id: string) => httpPatch<void>(`${url}/${id}/inativar`),
};
