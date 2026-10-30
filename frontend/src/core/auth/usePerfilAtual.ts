import { useQuery } from "@tanstack/react-query";

import { getAccessToken } from "./session";
import { obterPerfilAtual } from "./api";

/** Chave do perfil da sessão atual no cache, para quem atualiza o perfil de forma otimista. */
export const perfilAtualQueryKey = () => ["auth", "me", getAccessToken()];

export function usePerfilAtual(enabled = true) {
  return useQuery({
    queryKey: perfilAtualQueryKey(),
    queryFn: obterPerfilAtual,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}
