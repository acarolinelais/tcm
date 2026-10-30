import { renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { MemoryRouter, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { httpPost } from "@/core/api/http-client";
import { getAccessToken, saveTokens } from "./session";
import { useSair } from "./useSair";

vi.mock("@/core/api/http-client", () => ({ httpPost: vi.fn() }));

let caminho = "";
let queryClient: QueryClient;
function Rastreador() {
  caminho = useLocation().pathname;
  return null;
}

function wrapper({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={["/trocar-senha"]}>
        {children}
        <Rastreador />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("useSair", () => {
  beforeEach(() => {
    caminho = "";
    queryClient = new QueryClient();
    queryClient.setQueryData(["auth", "me"], { nome: "Ana" });
    vi.mocked(httpPost).mockReset();
    saveTokens({ access_token: "a", refresh_token: "r", expires_in: 60, token_type: "bearer" });
  });

  it("encerra a sessão, limpa os tokens e vai para o login", async () => {
    vi.mocked(httpPost).mockResolvedValue(undefined);
    const { result } = renderHook(() => useSair(), { wrapper });

    await result.current();

    expect(httpPost).toHaveBeenCalledWith("/api/auth/logout", {});
    expect(getAccessToken()).toBeNull();
    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
    await waitFor(() => expect(caminho).toBe("/login"));
  });

  it("limpa os tokens e vai para o login mesmo se o logout falhar", async () => {
    vi.mocked(httpPost).mockRejectedValue(new Error("offline"));
    const { result } = renderHook(() => useSair(), { wrapper });

    await result.current();

    expect(getAccessToken()).toBeNull();
    await waitFor(() => expect(caminho).toBe("/login"));
  });
});
