import { useNavigate } from "react-router";
import { useQueryClient } from "@tanstack/react-query";

import { httpPost } from "@/core/api/http-client";
import { clearTokens } from "./session";

/** Encerra a sessão no backend e volta ao login. Se a chamada falhar, a sessão local é encerrada do mesmo jeito. */
export function useSair() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return async function sair() {
    try {
      await httpPost<void>("/api/auth/logout", {});
    } catch {
      // O token expira sozinho; o importante é limpar a sessão local.
    } finally {
      clearTokens();
      queryClient.clear();
      navigate("/login", { replace: true });
    }
  };
}
