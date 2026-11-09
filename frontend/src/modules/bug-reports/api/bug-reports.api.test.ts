import { beforeEach, describe, expect, it, vi } from "vitest";

import { bugReportsApi } from "./bug-reports.api";

describe("bugReportsApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 20, total_count: 0 }), { status: 200 })));
  });

  it("listar manda a página e só os filtros preenchidos", async () => {
    await bugReportsApi.listar(2, 20, { projeto_id: "clock", responsavel: "ana", modelo_dispositivo_id: "" });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]), "http://local");
    expect(url.pathname).toBe("/api/bug-reports");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("20");
    expect(url.searchParams.get("projeto_id")).toBe("clock");
    expect(url.searchParams.get("responsavel")).toBe("ana");
    expect(url.searchParams.has("modelo_dispositivo_id")).toBe(false);
  });

  it("falha: um 403 da API vira ApiError com o status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ type: "about:blank", title: "Proibido", status: 403 }), { status: 403 }));

    await expect(bugReportsApi.listar(1, 20)).rejects.toMatchObject({ problem: { status: 403 } });
  });
});
