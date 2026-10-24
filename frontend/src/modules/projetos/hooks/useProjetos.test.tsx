import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { casosTesteApi, projetosApi } from "../api/projetos.api";
import { useCasosTeste, useCriarProjeto, useProjetosPessoais, useTransferirCasoTeste } from "./useProjetos";
import type { PerfilAtual } from "@/core/auth/api";

vi.mock("../api/projetos.api", () => ({
  casosTesteApi: { listar: vi.fn(), transferirParaBackup: vi.fn() },
  projetosApi: { criar: vi.fn(), listar: vi.fn() },
  formFactorApi: {}, modelosDispositivoApi: {},
}));

function criarWrapper() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  return ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

describe("hooks de projetos", () => {
  afterEach(() => vi.clearAllMocks());

  it("separa cache pessoal ao trocar usuário e unidade", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    vi.mocked(projetosApi.listar).mockResolvedValue({ items: [], page: 1, page_size: 1, total_count: 0 });
    const { result, rerender } = renderHook(({ id, unidade_id }) => useProjetosPessoais({ id, unidade_id } as PerfilAtual), { initialProps: { id: "a", unidade_id: "u1" }, wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ id: "b", unidade_id: "u1" });
    await waitFor(() => expect(projetosApi.listar).toHaveBeenCalledTimes(2));
    rerender({ id: "b", unidade_id: "u2" });
    await waitFor(() => expect(projetosApi.listar).toHaveBeenCalledTimes(3));
    expect(client.getQueryCache().getAll().map((q) => q.queryKey)).toEqual([
      ["projetos", "pessoais", "u1", "a"], ["projetos", "pessoais", "u1", "b"], ["projetos", "pessoais", "u2", "b"],
    ]);
  });

  it("mantém filtro pessoal ao mudar responsável e paginação", async () => {
    vi.mocked(casosTesteApi.listar).mockResolvedValue({ items: [], total_count: 0, page: 1, page_size: 20 });
    const perfil = { id: "dev", unidade_id: "u" } as PerfilAtual;
    const { result, rerender } = renderHook(({ page, responsavelId }) => useCasosTeste("p", page, 20, { associadosAMim: true, responsavelId }, perfil), { initialProps: { page: 1, responsavelId: "a" }, wrapper: criarWrapper() });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ page: 2, responsavelId: "b" });
    await waitFor(() => expect(casosTesteApi.listar).toHaveBeenLastCalledWith("p", 2, 20, { associadosAMim: true, responsavelId: "b" }));
  });

  it("invalida consultas de casos, entrada e seletor após transferência", async () => {
    const client = new QueryClient();
    client.setQueryData(["projetos", "pessoais", "u", "dev"], { items: [] });
    client.setQueryData(["projetos", "seletor", "u", "dev", true], { pages: [] });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    const { result } = renderHook(() => useTransferirCasoTeste("p"), { wrapper });
    await result.current.mutateAsync("caso");
    expect(client.getQueryCache().getAll().every((q) => q.state.isInvalidated)).toBe(true);
  });

  it("consulta projeto pessoal com identidade no cache e propaga erro", async () => {
    vi.mocked(projetosApi.listar).mockRejectedValue(new Error("sem conexão"));
    const perfil = { id: "dev", unidade_id: "u" } as PerfilAtual;
    const { result } = renderHook(() => useProjetosPessoais(perfil), { wrapper: criarWrapper() });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(projetosApi.listar).toHaveBeenCalledWith(1, 1, true);
    expect(result.current.data).toBeUndefined();
  });

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
