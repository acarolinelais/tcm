import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { casosTesteApi, projetosApi } from "../api/projetos.api";
import { useCasosTeste, useCriarProjeto } from "./useProjetos";

vi.mock("../api/projetos.api", () => ({
  casosTesteApi: { listar: vi.fn() },
  projetosApi: { criar: vi.fn() },
  formFactorApi: {}, modelosDispositivoApi: {},
}));

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("hooks de projetos", () => {
  afterEach(() => vi.clearAllMocks());

  it("cria projeto usando o cliente de API", async () => {
    vi.mocked(projetosApi.criar).mockResolvedValue({ id: "project-1" } as never);
    const { result } = renderHook(() => useCriarProjeto(), { wrapper: criarWrapper() });

    await result.current.mutateAsync({ time_id: "team-1", app: "Clock", one_ui: "9.5", modelos_ids: [] });

    expect(projetosApi.criar).toHaveBeenCalledWith({ time_id: "team-1", app: "Clock", one_ui: "9.5", modelos_ids: [] });
  });

  it("não consulta casos sem um projeto selecionado", async () => {
    const { result } = renderHook(() => useCasosTeste("", 1, 10), { wrapper: criarWrapper() });

    await waitFor(() => expect(result.current.fetchStatus).toBe("idle"));
    expect(casosTesteApi.listar).not.toHaveBeenCalled();
  });

  it("consulta os casos do projeto e a página solicitada", async () => {
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [], total_count: 0, page: 2, page_size: 5 });
    const { result } = renderHook(() => useCasosTeste("project-1", 2, 5), { wrapper: criarWrapper() });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(casosTesteApi.listar).toHaveBeenCalledWith("project-1", 2, 5);
  });
});
