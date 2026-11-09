import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { timelineApi } from "./timeline.api";

const config = vi.hoisted(() => ({ useMock: false }));
vi.mock("@/core/config", () => ({ get useMock() { return config.useMock; } }));

const vazio = { pessoas: [], casos: [], cards: [] };

describe("timelineApi", () => {
  beforeEach(() => {
    config.useMock = false;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(vazio), { status: 200 })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("envia o período, o fuso e as duas listas como parâmetros repetidos", async () => {
    await timelineApi.obter("p1", "2026-12-28", "2027-01-03", { responsavelIds: ["ana", "bia"], casoIds: ["c1"] });

    const url = new URL(vi.mocked(fetch).mock.calls[0][0] as string, "http://x");
    expect(url.pathname).toBe("/api/projetos/p1/timeline");
    expect(url.searchParams.get("inicio")).toBe("2026-12-28");
    expect(url.searchParams.get("fim")).toBe("2027-01-03");
    expect(url.searchParams.get("fuso_horario")).toBe(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(url.searchParams.getAll("responsavel_ids")).toEqual(["ana", "bia"]);
    expect(url.searchParams.getAll("caso_teste_ids")).toEqual(["c1"]);
  });

  it("no modo de demonstração gera cards nos dias úteis e aplica os filtros, sem chamar a API", async () => {
    config.useMock = true;

    const tudo = await timelineApi.obter("p1", "2026-12-28", "2027-01-03", { responsavelIds: [], casoIds: [] });
    const daAna = await timelineApi.obter("p1", "2026-12-28", "2027-01-03", { responsavelIds: ["mock-ana"], casoIds: [] });

    expect(fetch).not.toHaveBeenCalled();
    expect(new Set(tudo.cards.map((card) => card.dia)).size).toBe(5);
    expect(daAna.cards.length).toBeGreaterThan(0);
    expect(daAna.cards.every((card) => card.responsavel_id === "mock-ana")).toBe(true);
    expect(daAna.pessoas).toEqual(tudo.pessoas);
  });

  it("propaga o erro da API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Projeto não encontrado.", status: 404 }), { status: 404 })));

    await expect(timelineApi.obter("p1", "2026-12-28", "2027-01-03", { responsavelIds: [], casoIds: [] })).rejects.toThrow();
  });
});
