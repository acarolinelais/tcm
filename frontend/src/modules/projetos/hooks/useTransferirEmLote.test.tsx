import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { casosTesteApi } from "../api/projetos.api";
import { useTransferirEmLote } from "./useTransferirEmLote";

vi.mock("../api/projetos.api", () => ({ casosTesteApi: { transferirParaBackup: vi.fn() } }));

function renderizar() {
  const client = new QueryClient({ defaultOptions: { mutations: { retry: false } } });
  const invalidar = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return { ...renderHook(() => useTransferirEmLote("projeto-1"), { wrapper }), invalidar };
}

const casos = [{ id: "a", tc_id: "Clock_000001" }, { id: "b", tc_id: "Clock_000002" }];

describe("useTransferirEmLote", () => {
  afterEach(() => vi.clearAllMocks());

  it("transfere todos e invalida a lista uma vez", async () => {
    vi.mocked(casosTesteApi.transferirParaBackup).mockResolvedValue({} as never);
    const { result, invalidar } = renderizar();

    let resultado;
    await act(async () => { resultado = await result.current.mutateAsync(casos); });

    expect(resultado).toEqual({ transferidos: 2, falhas: [] });
    expect(casosTesteApi.transferirParaBackup).toHaveBeenCalledWith("a");
    expect(casosTesteApi.transferirParaBackup).toHaveBeenCalledWith("b");
    expect(invalidar).toHaveBeenCalledTimes(1);
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["projetos"] });
  });

  it("uma falha não interrompe as demais e volta com o TC ID", async () => {
    vi.mocked(casosTesteApi.transferirParaBackup)
      .mockResolvedValueOnce({} as never)
      .mockRejectedValueOnce(new Error("O Test Case não possui backup para receber a transferência."));
    const { result, invalidar } = renderizar();

    let resultado;
    await act(async () => { resultado = await result.current.mutateAsync(casos); });

    expect(resultado).toEqual({ transferidos: 1, falhas: [{ tcId: "Clock_000002", motivo: "O Test Case não possui backup para receber a transferência." }] });
    expect(invalidar).toHaveBeenCalledTimes(1);
  });
});
