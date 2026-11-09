import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { casosTesteApi } from "../api/projetos.api";
import { ORDEM_KANBAN, type CasoTeste, type KanbanProjeto } from "../model/projeto";
import { useKanban, useMoverCasoKanban } from "./useKanban";

vi.mock("../api/projetos.api", () => ({ casosTesteApi: { kanban: vi.fn(), atualizar: vi.fn() } }));

const perfil = { id: "kp", unidade_id: "u" } as PerfilAtual;

function kanban(): KanbanProjeto {
  const card = { id: "c1", tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "New", responsavel_id: "kp", responsavel_nome: "KP", responsavel_cor_avatar: "azul", destinos: ["InValidation"] } as const;
  return {
    projeto_id: "p1",
    total: 1,
    colunas: ORDEM_KANBAN.map((status) => ({ status, total: status === "InReview" ? 1 : 0, casos: status === "InReview" ? [{ ...card, destinos: [...card.destinos] }] : [] })),
  };
}

const novoClient = () => new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } } });

function montar(client = novoClient()) {
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  const { result } = renderHook(() => ({ kanban: useKanban("p1", perfil), mover: useMoverCasoKanban("p1", perfil) }), { wrapper });
  return result;
}

const totais = (dados: KanbanProjeto | undefined) => dados?.colunas.map((coluna) => coluna.total);

describe("useMoverCasoKanban", () => {
  afterEach(() => vi.clearAllMocks());

  it("move o card na hora e envia só o Status", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban());
    let liberar: (caso: CasoTeste) => void = () => {};
    vi.mocked(casosTesteApi.atualizar).mockReturnValue(new Promise((resolve) => { liberar = resolve; }));
    const result = montar();
    await waitFor(() => expect(result.current.kanban.isSuccess).toBe(true));

    act(() => result.current.mover.mutate({ casoId: "c1", destino: "InValidation" }));

    await waitFor(() => expect(totais(result.current.kanban.data)).toEqual([0, 0, 0, 1, 0, 0, 0]));
    expect(result.current.kanban.data?.colunas[3].casos[0].destinos).toEqual([]);
    expect(casosTesteApi.atualizar).toHaveBeenCalledWith("c1", { status: "InValidation" });
    act(() => liberar({} as CasoTeste));
    await waitFor(() => expect(result.current.mover.isSuccess).toBe(true));
    // Ao terminar, o Kanban é recarregado da API.
    await waitFor(() => expect(casosTesteApi.kanban).toHaveBeenCalledTimes(2));
  });

  it("envia a justificativa ao excluir", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban());
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as CasoTeste);
    const result = montar();
    await waitFor(() => expect(result.current.kanban.isSuccess).toBe(true));

    await act(() => result.current.mover.mutateAsync({ casoId: "c1", destino: "Cancelled", justificativa: "Sem hardware" }));

    expect(casosTesteApi.atualizar).toHaveBeenCalledWith("c1", { status: "Cancelled", justificativa_exclusao: "Sem hardware" });
  });

  it("ao terminar, marca a lista de Test Cases do projeto para recarregar", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban());
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as CasoTeste);
    const client = novoClient();
    const chaveCasos = ["projetos", "p1", "test-cases", 1, 20];
    client.setQueryData(chaveCasos, { items: [] });
    const result = montar(client);
    await waitFor(() => expect(result.current.kanban.isSuccess).toBe(true));
    expect(client.getQueryState(chaveCasos)?.isInvalidated).toBe(false);

    await act(() => result.current.mover.mutateAsync({ casoId: "c1", destino: "InValidation" }));

    await waitFor(() => expect(client.getQueryState(chaveCasos)?.isInvalidated).toBe(true));
  });

  it("devolve o card à coluna original quando a API recusa", async () => {
    // A recarga depois do erro fica pendente: quem devolve o card é o rollback, não a API.
    vi.mocked(casosTesteApi.kanban).mockResolvedValueOnce(kanban()).mockReturnValue(new Promise(() => {}));
    vi.mocked(casosTesteApi.atualizar).mockRejectedValue(new Error("403"));
    const result = montar();
    await waitFor(() => expect(result.current.kanban.isSuccess).toBe(true));

    await act(() => result.current.mover.mutateAsync({ casoId: "c1", destino: "Done" }).catch(() => undefined));

    await waitFor(() => expect(result.current.mover.isError).toBe(true));
    expect(totais(result.current.kanban.data)).toEqual([0, 0, 1, 0, 0, 0, 0]);
    expect(result.current.kanban.data?.colunas[2].casos[0].destinos).toEqual(["InValidation"]);
  });
});
