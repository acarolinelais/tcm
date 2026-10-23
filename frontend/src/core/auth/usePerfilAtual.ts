import { useQuery } from "@tanstack/react-query";

import { getAccessToken } from "./session";
import { obterPerfilAtual } from "./api";

export function usePerfilAtual(enabled = true) {
  const accessToken = getAccessToken();
  return useQuery({
    queryKey: ["auth", "me", accessToken],
    queryFn: obterPerfilAtual,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}
