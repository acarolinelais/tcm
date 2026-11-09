import { afterEach, describe, expect, it, vi } from "vitest";

import { getAccessToken } from "@/core/auth/session";
import { httpGet, httpPut, renovarSessao } from "./http-client";

function respostaJson(corpo: unknown, status = 200) {
  return new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } });
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  window.sessionStorage.clear();
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

describe("http-client: renovação da sessão pelo cookie (spec 061)", () => {
  it("renova dentro do lock sdf.refresh, sem mandar token no corpo", async () => {
    const request = vi.fn((_nome: string, callback: () => Promise<boolean>) => callback());
    vi.stubGlobal("navigator", { locks: { request } });
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaJson({ access_token: "novo" }));

    await expect(renovarSessao()).resolves.toBe(true);

    expect(request).toHaveBeenCalledWith("sdf.refresh", expect.any(Function));
    expect(fetchSpy).toHaveBeenCalledWith("/api/auth/refresh", { method: "POST" });
    expect(getAccessToken()).toBe("novo");
  });

  it("renova do mesmo jeito sem navigator.locks", async () => {
    vi.stubGlobal("navigator", { locks: undefined });
    vi.spyOn(globalThis, "fetch").mockResolvedValue(respostaJson({ access_token: "novo" }));

    await expect(renovarSessao()).resolves.toBe(true);
    expect(getAccessToken()).toBe("novo");
  });

  it("no 401 renova e repete a requisição com o access novo", async () => {
    window.sessionStorage.setItem("sdf.access", "vencido");
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(respostaJson({ title: "Expirado", status: 401 }, 401))
      .mockResolvedValueOnce(respostaJson({ access_token: "novo" }))
      .mockResolvedValueOnce(respostaJson({ ok: true }));

    await expect(httpGet("/api/projetos")).resolves.toEqual({ ok: true });

    const cabecalhos = fetchSpy.mock.calls[2][1]?.headers as Record<string, string>;
    expect(cabecalhos.Authorization).toBe("Bearer novo");
  });

  it("refresh recusado limpa o access token e propaga o 401", async () => {
    window.sessionStorage.setItem("sdf.access", "vencido");
    vi.spyOn(globalThis, "fetch")
      .mockResolvedValueOnce(respostaJson({ title: "Expirado", status: 401 }, 401))
      .mockResolvedValueOnce(respostaJson({ title: "Credenciais inválidas.", status: 401 }, 401));

    await expect(httpGet("/api/projetos")).rejects.toMatchObject({ problem: { status: 401 } });
    expect(getAccessToken()).toBeNull();
  });
});
