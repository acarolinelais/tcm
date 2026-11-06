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

// Spec 063.
describe("overviewApi, gráficos do KP e do dev", () => {
  beforeEach(() => { config.useMock = false; });
  afterEach(() => vi.unstubAllGlobals());

  const responder = (corpo: unknown) => vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify(corpo), { status: 200 })));

  it("converte os gráficos do time para o modelo da tela", async () => {
    responder({
      projetos: [{ id: "p1", nome: "Clock 9.5", app: "Clock" }],
      criacao_por_dia: [{ projeto_id: "p1", projeto: "Clock 9.5", media: 0.5 }],
      concluidos_por_dev: [{ usuario_id: "u1", nome: "Ana", concluidos: 3 }],
      concluidos_por_semana: [{ semana: "2026-11-02", concluidos: 2 }],
      done_por_projeto: [{ projeto_id: "p1", projeto: "Clock 9.5", concluidos: 4, total: 9 }],
    });

    const dados = await overviewApi.obterTime();

    expect(vi.mocked(fetch).mock.calls[0][0]).toMatch(/^\/api\/overview\/time\?fuso_horario=/);
    expect(dados.criacaoPorDia).toEqual([{ projetoId: "p1", projeto: "Clock 9.5", media: 0.5 }]);
    expect(dados.concluidosPorDev).toEqual([{ usuarioId: "u1", nome: "Ana", concluidos: 3 }]);
    expect(dados.donePorProjeto).toEqual([{ projetoId: "p1", projeto: "Clock 9.5", concluidos: 4, total: 9 }]);
  });

  it("um projeto sem rodada chega com o Pass Rate nulo", async () => {
    responder({ burndown: [{ dia: "2026-11-05", planejado: 2, executado: 3 }], pass_rate: null });

    const dados = await overviewApi.obterProjeto("p1");

    expect(vi.mocked(fetch).mock.calls[0][0]).toMatch(/^\/api\/overview\/projetos\/p1\?fuso_horario=/);
    expect(dados).toEqual({ burndown: [{ dia: "2026-11-05", planejado: 2, executado: 3 }], passRate: null });
  });

  it("converte a visão pessoal", async () => {
    responder({ concluidos: 5, atribuidos: 12, por_dificuldade: { Low: 2, Medium: 0, High: 1 }, entregas_por_dia: [], entregas_por_semana: [] });

    expect(await overviewApi.obterPessoal()).toEqual({
      concluidos: 5, atribuidos: 12, porDificuldade: { Low: 2, Medium: 0, High: 1 }, entregasPorDia: [], entregasPorSemana: [],
    });
  });

  it("falha: propaga o 404 de um projeto fora do escopo", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Projeto não encontrado.", status: 404 }), { status: 404 })));

    await expect(overviewApi.obterProjeto("outro")).rejects.toThrow();
  });

  it("no modo de demonstração devolve os exemplos, com 30 dias e 12 semanas", async () => {
    config.useMock = true;
    vi.stubGlobal("fetch", vi.fn());

    expect((await overviewApi.obterProjeto("p1")).burndown).toHaveLength(30);
    expect((await overviewApi.obterTime()).concluidosPorSemana).toHaveLength(12);
    expect((await overviewApi.obterPessoal()).entregasPorDia).toHaveLength(30);
    expect(fetch).not.toHaveBeenCalled();
  });
});
