import { useQuery } from "@tanstack/react-query";

import { obterPerfilAtual } from "./api";

export function usePerfilAtual(enabled = true) {
  return useQuery({
    queryKey: ["auth", "me"],
    queryFn: obterPerfilAtual,
    enabled,
    retry: false,
    staleTime: 30_000,
  });
}
