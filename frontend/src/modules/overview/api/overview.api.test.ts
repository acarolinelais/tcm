import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { overviewApi } from "./overview.api";
import { overviewMock } from "./overview.mock";

const config = vi.hoisted(() => ({ useMock: false }));
vi.mock("@/core/config", () => ({ get useMock() { return config.useMock; } }));

const resposta = {
  total: 10, concluidos: 4, em_andamento: 3, a_fazer: 3, atribuidos: 2,
  desempenho: [{ mes: "2026-10", concluidos: 1 }],
};

describe("overviewApi", () => {
  beforeEach(() => {
    config.useMock = false;
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(resposta), { status: 200 })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("consulta a Overview no fuso do navegador e converte os campos", async () => {
    const dados = await overviewApi.obter();

    const fuso = encodeURIComponent(Intl.DateTimeFormat().resolvedOptions().timeZone);
    expect(fetch).toHaveBeenCalledWith(`/api/overview?fuso_horario=${fuso}`, expect.any(Object));
    expect(dados).toEqual({
      total: 10, concluidos: 4, emAndamento: 3, aFazer: 3, atribuidos: 2,
      desempenho: [{ mes: "2026-10", concluidos: 1 }],
    });
  });

  it("no modo de demonstração devolve os dados de exemplo sem chamar a API", async () => {
    config.useMock = true;

    expect(await overviewApi.obter()).toBe(overviewMock);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("propaga o erro da API", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Falhou", status: 500 }), { status: 500 })));

    await expect(overviewApi.obter()).rejects.toThrow();
  });
});
