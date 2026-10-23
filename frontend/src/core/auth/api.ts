import { httpGet, httpPost } from "@/core/api/http-client";
import { saveTokens, type TokenResponse } from "./session";

export interface PerfilAtual {
  id: string;
  nome: string;
  email: string;
  unidade_id: string;
  unidade_nome: string;
  perfil_codigo: string | null;
  perfil: string | null;
  permissoes: string[];
  times: { id: string; nome: string; papel: string }[];
  time_atual_id: string | null;
  tem_multiplos_times: boolean;
  senha_alteracao_obrigatoria: boolean;
}

export async function login(email: string, senha: string) {
  const tokens = await httpPost<TokenResponse>("/api/auth/login", { email, senha });
  saveTokens(tokens);
}

export const obterPerfilAtual = () => httpGet<PerfilAtual>("/api/auth/me");

export async function alterarSenhaInicial(novaSenha: string) {
  const tokens = await httpPost<TokenResponse>("/api/auth/trocar-senha", { nova_senha: novaSenha });
  saveTokens(tokens);
}
