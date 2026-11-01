import { beforeEach, describe, expect, it, vi } from "vitest";

import { auditoriaApi } from "./auditoria.api";

describe("auditoriaApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ items: [], page: 1, page_size: 20, total_count: 0 }), { status: 200 })));
  });

  it("listar manda a página, o fuso, os filtros preenchidos e repete usuario_id", async () => {
    await auditoriaApi.listar(2, 20, { data_inicio: "2026-10-01", usuario_id: ["ana", "bia"], acao: "alteracao", tc_id: "", perfil: undefined });

    const url = new URL(String(vi.mocked(fetch).mock.calls[0][0]), "http://local");
    expect(url.pathname).toBe("/api/auditoria");
    expect(url.searchParams.get("page")).toBe("2");
    expect(url.searchParams.get("page_size")).toBe("20");
    expect(url.searchParams.get("fuso_horario")).toBeTruthy();
    expect(url.searchParams.getAll("usuario_id")).toEqual(["ana", "bia"]);
    expect(url.searchParams.get("acao")).toBe("alteracao");
    expect(url.searchParams.get("data_inicio")).toBe("2026-10-01");
    expect(url.searchParams.has("tc_id")).toBe(false);
    expect(url.searchParams.has("perfil")).toBe(false);
  });

  it("falha: um 403 da API vira ApiError com o status", async () => {
    vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify({ type: "about:blank", title: "Proibido", status: 403 }), { status: 403 }));

    await expect(auditoriaApi.listar(1, 20)).rejects.toMatchObject({ problem: { status: 403 } });
  });
});
