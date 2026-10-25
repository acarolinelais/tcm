import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { casosTesteApi, formFactorApi, projetosApi } from "../api/projetos.api";
import { useCasosTeste, useCriarProjeto, useCriarRodadaFormFactor, useFormFactor, useFormFactorResultados, useFormFactorGlobal, useFormFactorResultadosGlobais, useProjetosPessoais, useTransferirCasoTeste } from "./useProjetos";
import type { PerfilAtual } from "@/core/auth/api";

vi.mock("../api/projetos.api", () => ({
  casosTesteApi: { listar: vi.fn(), transferirParaBackup: vi.fn() },
  projetosApi: { criar: vi.fn(), listar: vi.fn() },
  formFactorApi: { listar: vi.fn(), listarResultados: vi.fn(), listarGlobal: vi.fn(), listarResultadosGlobais: vi.fn(), criarRodadaManual: vi.fn() }, modelosDispositivoApi: {},
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

  it("refaz o Form Factor ao mudar o responsável e não consulta quando desabilitado", async () => {
    vi.mocked(formFactorApi.listar).mockResolvedValue({ modelos: [], items: [], total_count: 0, page: 1, page_size: 20 });
    const perfil = { id: "kp", unidade_id: "u" } as PerfilAtual;
    const { result, rerender } = renderHook(({ responsavelId, enabled }) => useFormFactor("p", { page: 1, pageSize: 20, responsavelId }, perfil, enabled), { initialProps: { responsavelId: undefined as string | undefined, enabled: false }, wrapper: criarWrapper() });
    expect(formFactorApi.listar).not.toHaveBeenCalled();
    rerender({ responsavelId: undefined, enabled: true });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ responsavelId: "ana", enabled: true });
    await waitFor(() => expect(formFactorApi.listar).toHaveBeenLastCalledWith("p", { page: 1, pageSize: 20, responsavelId: "ana" }));
    expect(formFactorApi.listar).toHaveBeenCalledTimes(2);
  });

  it("isola o cache de Results pelos filtros e recarrega após criar rodada", async () => {
    const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
    client.setQueryData(["projetos", "p", "form-factor", { page: 1 }], { items: [] });
    vi.mocked(formFactorApi.listarResultados).mockResolvedValue({ modelos: [], items: [], total_count: 0, page: 1, page_size: 20 });
    vi.mocked(formFactorApi.criarRodadaManual).mockResolvedValue({} as never);
    const perfil = { id: "kp", unidade_id: "u" } as PerfilAtual;
    const { result, rerender } = renderHook(({ tcId }) => useFormFactorResultados("p", { page: 1, pageSize: 20, tcId }, perfil), { initialProps: { tcId: "TC-1" }, wrapper });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    rerender({ tcId: "TC-2" });
    await waitFor(() => expect(formFactorApi.listarResultados).toHaveBeenLastCalledWith("p", { page: 1, pageSize: 20, tcId: "TC-2" }));
    const chamadasAntesDaCriacao = vi.mocked(formFactorApi.listarResultados).mock.calls.length;
    const criar = renderHook(() => useCriarRodadaFormFactor("p"), { wrapper });
    await criar.result.current.mutateAsync({ caso_teste_id: "case-1", resultados: { "model-1": "PASS" } });
    expect(client.getQueryCache().find({ queryKey: ["projetos", "p", "form-factor", { page: 1 }] })?.state.isInvalidated).toBe(true);
    await waitFor(() => expect(formFactorApi.listarResultados).toHaveBeenCalledTimes(chamadasAntesDaCriacao + 1));
  });

  it("separa as consultas globais de resumo e histórico por filtros e perfil", async () => {
    vi.mocked(formFactorApi.listarGlobal).mockResolvedValue({ modelos: [], responsaveis: [], items: [], total_count: 0, page: 1, page_size: 20 });
    vi.mocked(formFactorApi.listarResultadosGlobais).mockResolvedValue({ modelos: [], responsaveis: [], items: [], total_count: 0, page: 1, page_size: 20 });
    const perfil = { id: "manager", unidade_id: "u" } as PerfilAtual;
    const wrapper = criarWrapper();
    const filtros = { page: 1, pageSize: 20, projetoId: "p1" };
    const resumo = renderHook(() => useFormFactorGlobal(filtros, perfil), { wrapper });
    await waitFor(() => expect(resumo.result.current.isSuccess).toBe(true));
    const historico = renderHook(() => useFormFactorResultadosGlobais(filtros, perfil), { wrapper });
    await waitFor(() => expect(historico.result.current.isSuccess).toBe(true));
    expect(formFactorApi.listarGlobal).toHaveBeenCalledWith(filtros);
    expect(formFactorApi.listarResultadosGlobais).toHaveBeenCalledWith(filtros);
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
