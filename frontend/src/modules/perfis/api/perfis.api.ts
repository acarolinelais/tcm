import { httpGet, httpPatchBody, httpPost, httpPut } from "@/core/api/http-client";

export interface Permissao {
  id: string;
  descricao: string;
}

export interface Perfil {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: string[];
  codigo: string | null;
}

export const listarPerfis = () => httpGet<Perfil[]>("/api/perfis");
export const listarPermissoes = () => httpGet<Permissao[]>("/api/perfis/permissoes");
export const criarPerfil = (nome: string, descricao: string) =>
  httpPost<Perfil>("/api/perfis", { nome, descricao: descricao || null });
export const salvarPermissoes = (id: string, permissoes: string[]) =>
  httpPut<Perfil>(`/api/perfis/${id}/permissoes`, { permissoes });
export const atribuirPerfil = (usuarioId: string, perfilId: string) =>
  httpPatchBody<void>(`/api/perfis/usuarios/${usuarioId}`, { perfil_id: perfilId });
