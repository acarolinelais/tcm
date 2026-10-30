import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { baixarPlanilha, buscarTodasAsPaginas, montarPlanilha, type BuscarPagina, type ColunaExportacao } from "./exportar-planilha";
import { useExportarTabela } from "./use-exportar-tabela";

vi.mock("./exportar-planilha");
const toastMock = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
vi.mock("@/shared/lib/toast", () => ({ toast: toastMock }));

interface Item { id: string; nome: string }

const nome: ColunaExportacao<Item> = { titulo: "Name", valor: (item) => item.nome };
const colunas = [{ exportar: nome }, {}];
const pagina = [{ id: "1", nome: "Alfa" }, { id: "2", nome: "Beta" }];

function pagedResult(items: Item[], total: number) {
  return { items, page: 1, page_size: 100, total_count: total };
}

beforeEach(() => vi.clearAllMocks());

describe("useExportarTabela", () => {
  it("exporta a página atual só com as colunas exportáveis", async () => {
    const { result } = renderHook(() => useExportarTabela({ listagem: "usuarios", colunas, itensPagina: pagina, todosOsItens: vi.fn() }));

    await act(() => result.current.exportarPagina());

    expect(montarPlanilha).toHaveBeenCalledWith([nome], pagina);
    expect(baixarPlanilha).toHaveBeenCalledWith(expect.any(ArrayBuffer), expect.stringMatching(/^usuarios_\d{4}-\d{2}-\d{2}\.xlsx$/));
  });

  it("exporta todos com a busca da tela, que já leva os filtros", async () => {
    const todosOsItens = [...pagina, { id: "3", nome: "Gama" }];
    const buscarPagina = vi.fn(async () => pagedResult(todosOsItens, 3));
    const { result } = renderHook(() => useExportarTabela({ listagem: "usuarios", colunas, itensPagina: pagina, todosOsItens: () => buscarTodasAsPaginas(buscarPagina) }));

    await act(() => result.current.exportarTodos());

    expect(buscarPagina).toHaveBeenCalledWith(1, 100);
    expect(montarPlanilha).toHaveBeenCalledWith([nome], todosOsItens);
  });

  it("exporta todos a partir da lista em memória sem buscar nada", async () => {
    const filtrados = [{ id: "9", nome: "Zeta" }];
    const { result } = renderHook(() => useExportarTabela({ listagem: "perfis", colunas, itensPagina: filtrados, todosOsItens: filtrados }));

    await act(() => result.current.exportarTodos());

    expect(montarPlanilha).toHaveBeenCalledWith([nome], filtrados);
  });

  it("falha numa página não baixa nada e avisa o erro", async () => {
    const buscarPagina = vi.fn<BuscarPagina<Item>>().mockResolvedValueOnce(pagedResult(pagina, 250)).mockRejectedValueOnce(new Error("500"));
    const { result } = renderHook(() => useExportarTabela({ listagem: "usuarios", colunas, itensPagina: pagina, todosOsItens: () => buscarTodasAsPaginas(buscarPagina) }));

    await act(() => result.current.exportarTodos());

    expect(montarPlanilha).not.toHaveBeenCalled();
    expect(baixarPlanilha).not.toHaveBeenCalled();
    expect(toastMock.error).toHaveBeenCalledTimes(1);
    expect(result.current.exportando).toBe(false);
  });

  it("ignora um segundo pedido enquanto o primeiro está em andamento", async () => {
    let liberar!: (valor: ReturnType<typeof pagedResult>) => void;
    const buscarPagina = vi.fn(() => new Promise<ReturnType<typeof pagedResult>>((resolve) => { liberar = resolve; }));
    const { result } = renderHook(() => useExportarTabela({ listagem: "usuarios", colunas, itensPagina: pagina, todosOsItens: () => buscarTodasAsPaginas(buscarPagina) }));

    let primeiro!: Promise<void>;
    act(() => { primeiro = result.current.exportarTodos(); });
    expect(result.current.exportando).toBe(true);
    await act(() => result.current.exportarTodos());
    await act(async () => { liberar(pagedResult(pagina, 2)); await primeiro; });

    expect(buscarPagina).toHaveBeenCalledTimes(1);
    expect(baixarPlanilha).toHaveBeenCalledTimes(1);
    expect(result.current.exportando).toBe(false);
  });

  it("sem itens na página, a exportação fica indisponível", () => {
    const { result } = renderHook(() => useExportarTabela({ listagem: "usuarios", colunas, itensPagina: [], todosOsItens: [] }));

    expect(result.current.disponivel).toBe(false);
  });
});
