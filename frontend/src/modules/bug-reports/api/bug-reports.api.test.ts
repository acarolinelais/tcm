import { beforeEach, describe, expect, it, vi } from "vitest";

import { bugReportsApi } from "./bug-reports.api";

describe("bugReportsApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 20, total_count: 0 }), { status: 200 })));
  });

  it("listar manda o projeto, a página e só os filtros preenchidos", async () => {
    await bugReportsApi.listar("clock", 2, 20, { responsavel: "ana", dev_fix: "bia", modelo_dispositivo_id: "" });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]), "http://local");
    expect(url.pathname).toBe("/api/bug-reports");
    expect(url.searchParams.get("projeto_id")).toBe("clock");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("20");
    expect(url.searchParams.get("responsavel")).toBe("ana");
    expect(url.searchParams.get("dev_fix")).toBe("bia");
    expect(url.searchParams.has("modelo_dispositivo_id")).toBe(false);
    expect(url.searchParams.has("dia")).toBe(false);
  });

  it("o período vai como dia ou semana, com o fuso do navegador", async () => {
    await bugReportsApi.listar("clock", 1, 20, { periodo: "2026-11-06" });
    await bugReportsApi.listar("clock", 1, 20, { periodo: "2026-W45" });

    const [dia, semana] = vi.mocked(fetch).mock.calls.map(([url]) => new URL(String(url), "http://local").searchParams);
    expect(dia.get("dia")).toBe("2026-11-06");
    expect(dia.get("fuso_horario")).toBeTruthy();
    expect(semana.get("semana")).toBe("2026-W45");
    expect(semana.has("dia")).toBe(false);
  });

  it("falha: um 403 da API vira ApiError com o status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ type: "about:blank", title: "Proibido", status: 403 }), { status: 403 }));

    await expect(bugReportsApi.listar("clock", 1, 20)).rejects.toMatchObject({ problem: { status: 403 } });
  });
});
