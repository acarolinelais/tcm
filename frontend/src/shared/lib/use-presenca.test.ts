import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { DURACAO_SAIDA_POPOVER_MS, usePresenca } from "./use-presenca";

describe("usePresenca", () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it("monta ao abrir e mantém montado durante a saída, desmontando depois", () => {
    const { result, rerender } = renderHook(({ aberto }) => usePresenca(aberto), { initialProps: { aberto: false } });
    expect(result.current).toEqual({ montado: false, saindo: false });

    rerender({ aberto: true });
    expect(result.current).toEqual({ montado: true, saindo: false });

    rerender({ aberto: false });
    expect(result.current).toEqual({ montado: true, saindo: true });
    act(() => vi.advanceTimersByTime(DURACAO_SAIDA_POPOVER_MS));
    expect(result.current).toEqual({ montado: false, saindo: false });
  });

  it("reabrir durante a saída cancela a desmontagem", () => {
    const { result, rerender } = renderHook(({ aberto }) => usePresenca(aberto), { initialProps: { aberto: true } });
    rerender({ aberto: false });
    rerender({ aberto: true });
    act(() => vi.advanceTimersByTime(DURACAO_SAIDA_POPOVER_MS * 2));

    expect(result.current).toEqual({ montado: true, saindo: false });
  });
});
