import { afterEach, describe, expect, it, vi } from "vitest";

import { httpGet, httpPut } from "./http-client";

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.restoreAllMocks();
  window.history.pushState({}, "", "/");
});

describe("http-client: tela de origem (spec 038)", () => {
  it("manda o caminho da tela atual no cabeçalho X-Tela", async () => {
    window.history.pushState({}, "", "/board/7f3a?status=InReview");
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaJson({ ok: true }));

    await httpPut("/api/test-cases/1", { status: "InReview" });

    const cabecalhos = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(cabecalhos["X-Tela"]).toBe("/board/7f3a");
  });

  it("manda o cabeçalho mesmo quando a requisição falha", async () => {
    window.history.pushState({}, "", "/configuracoes");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(respostaJson({ title: "Erro", status: 500 }, 500));

    await expect(httpGet("/api/qualquer")).rejects.toThrow();

    const cabecalhos = fetchSpy.mock.calls[0][1]?.headers as Record<string, string>;
    expect(cabecalhos["X-Tela"]).toBe("/configuracoes");
  });
});
