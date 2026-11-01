import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { timelineApi } from "../api/timeline.api";
import type { FiltrosTimeline } from "../model/timeline";
import { useTimeline } from "./useTimeline";

vi.mock("../api/timeline.api", () => ({ timelineApi: { obter: vi.fn() } }));

const perfil = { id: "kp", unidade_id: "u" } as PerfilAtual;
const semFiltro: FiltrosTimeline = { responsavelIds: [], casoIds: [] };

function montar(projetoId: string | null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  return renderHook(({ projeto, inicio, filtros }) => useTimeline(projeto, inicio, "2027-01-03", filtros, perfil), {
    wrapper,
    initialProps: { projeto: projetoId, inicio: "2026-12-28", filtros: semFiltro },
  });
}

describe("useTimeline", () => {
  afterEach(() => vi.clearAllMocks());

  it("não consulta sem projeto escolhido", () => {
    montar(null);

    expect(timelineApi.obter).not.toHaveBeenCalled();
  });

  it("mantém a grade anterior enquanto um novo filtro carrega", async () => {
    const anterior = { pessoas: [], casos: [], cards: [] };
    vi.mocked(timelineApi.obter).mockResolvedValueOnce(anterior).mockReturnValueOnce(new Promise(() => {}));
    const { result, rerender } = montar("p1");
    await waitFor(() => expect(result.current.data).toBe(anterior));

    rerender({ projeto: "p1", inicio: "2026-12-28", filtros: { responsavelIds: ["ana"], casoIds: [] } });

    await waitFor(() => expect(timelineApi.obter).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBe(anterior);
  });

  it("falha: ao trocar de período ou de projeto, os cards anteriores não ficam na tela", async () => {
    vi.mocked(timelineApi.obter).mockResolvedValueOnce({ pessoas: [], casos: [], cards: [] }).mockReturnValue(new Promise(() => {}));
    const { result, rerender } = montar("p1");
    await waitFor(() => expect(result.current.data).toBeDefined());

    rerender({ projeto: "p1", inicio: "2026-12-21", filtros: semFiltro });
    await waitFor(() => expect(timelineApi.obter).toHaveBeenCalledTimes(2));
    expect(result.current.data).toBeUndefined();

    rerender({ projeto: "p2", inicio: "2026-12-21", filtros: semFiltro });
    await waitFor(() => expect(timelineApi.obter).toHaveBeenCalledTimes(3));
    expect(result.current.data).toBeUndefined();
  });
});
