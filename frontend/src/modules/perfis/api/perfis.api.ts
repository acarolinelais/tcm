import { httpGet, httpPatchBody, httpPost, httpPut } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockPerfilApi } from "@/core/mock/database";

export interface Permissao {
  id: string;
  descricao: string;
  modulo: {
    codigo: string;
    nome: string;
    ordem: number;
  };
  ordem: number;
}

export interface Perfil {
  id: string;
  nome: string;
  descricao: string | null;
  permissoes: string[];
  codigo: string | null;
}

export const listarPerfis = () => useMock ? Promise.resolve(mockPerfilApi.listar()) : httpGet<Perfil[]>("/api/perfis");
export const listarPermissoes = () => useMock ? Promise.resolve(mockPerfilApi.listarPermissoes()) : httpGet<Permissao[]>("/api/perfis/permissoes");
export const criarPerfil = (nome: string, descricao: string, permissoes: string[]) =>
  useMock ? Promise.resolve(mockPerfilApi.criar(nome, descricao || null, permissoes)) : httpPost<Perfil>("/api/perfis", { nome, descricao: descricao || null, permissoes });
export const salvarPermissoes = (id: string, permissoes: string[]) =>
  useMock ? Promise.resolve(mockPerfilApi.salvarPermissoes(id, permissoes)) : httpPut<Perfil>(`/api/perfis/${id}/permissoes`, { permissoes });
export const atribuirPerfil = (usuarioId: string, perfilId: string) =>
  useMock ? Promise.resolve(mockPerfilApi.atribuir(usuarioId, perfilId)) : httpPatchBody<void>(`/api/perfis/usuarios/${usuarioId}`, { perfil_id: perfilId });
