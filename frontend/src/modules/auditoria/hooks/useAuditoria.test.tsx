import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { auditoriaApi } from "../api/auditoria.api";
import { useAuditoria } from "./useAuditoria";

vi.mock("../api/auditoria.api", () => ({ auditoriaApi: { listar: vi.fn() } }));

function montar(enabled = true) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(() => useAuditoria(3, 20, { origem: "form_factor" }, enabled), { wrapper }).result;
}

describe("useAuditoria", () => {
  afterEach(() => vi.clearAllMocks());

  it("busca a página com os filtros", async () => {
    vi.mocked(auditoriaApi.listar).mockResolvedValue({ items: [], page: 3, page_size: 20, total_count: 45 });

    const result = montar();

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(auditoriaApi.listar).toHaveBeenCalledWith(3, 20, { origem: "form_factor" });
    expect(result.current.data?.total_count).toBe(45);
  });

  it("falha: desligado (quem não é admin), não chama a API", () => {
    montar(false);

    expect(auditoriaApi.listar).not.toHaveBeenCalled();
  });
});
