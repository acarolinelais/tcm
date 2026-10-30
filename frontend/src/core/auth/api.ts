import { httpGet, httpPatchBody, httpPost } from "@/core/api/http-client";
import { useMock } from "@/core/config";
import { mockAuth } from "@/core/mock/database";
import { saveTokens, type TokenResponse } from "./session";

// Paleta fixa da cor do avatar (ADR 0043), na mesma ordem do `CorAvatar` do backend.
export const CORES_AVATAR = ["azul", "indigo", "roxo", "rosa", "vermelho", "laranja", "verde", "cinza"] as const;
export type CorAvatar = (typeof CORES_AVATAR)[number];

export interface PerfilAtual {
  id: string;
  nome: string;
  email: string;
  unidade_id: string;
  unidade_nome: string;
  perfil_codigo: string | null;
  perfil: string | null;
  permissoes: string[];
  times: { id: string; nome: string }[];
  setores_gerenciados: string[];
  time_atual_id: string | null;
  tem_multiplos_times: boolean;
  senha_alteracao_obrigatoria: boolean;
  idioma_preferido: "en" | "pt-BR" | "ko";
  cor_avatar: CorAvatar;
}

export interface Preferencias {
  idioma_preferido: PerfilAtual["idioma_preferido"];
  cor_avatar: CorAvatar;
}

export async function login(email: string, senha: string) {
  const tokens = useMock
    ? mockAuth.login(email, senha)
    : await httpPost<TokenResponse>("/api/auth/login", { email, senha });
  saveTokens(tokens);
}

export const obterPerfilAtual = () => useMock
  ? Promise.resolve(mockAuth.currentUser(sessionStorage.getItem("sdf.access")))
  : httpGet<PerfilAtual>("/api/auth/me");

export async function alterarSenhaInicial(novaSenha: string) {
  const tokens = useMock
    ? mockAuth.changePassword(novaSenha)
    : await httpPost<TokenResponse>("/api/auth/trocar-senha", { nova_senha: novaSenha });
  saveTokens(tokens);
}

export async function atualizarIdiomaPreferido(idioma_preferido: PerfilAtual["idioma_preferido"]) {
  return useMock
    ? Promise.resolve(mockAuth.updateLanguage(idioma_preferido))
    : httpPatchBody<Preferencias>("/api/auth/preferencias", { idioma_preferido });
}

export async function atualizarCorAvatar(cor_avatar: CorAvatar) {
  return useMock
    ? Promise.resolve(mockAuth.updateAvatarColor(cor_avatar))
    : httpPatchBody<Preferencias>("/api/auth/preferencias", { cor_avatar });
}
