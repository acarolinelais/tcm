import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { casosTesteApi, formFactorApi, modelosDispositivoApi, projetosApi } from "./projetos.api";

vi.mock("@/core/config", () => ({ useMock: false }));
vi.mock("@/core/mock/database", () => ({
  mockCasosTesteApi: {}, mockFormFactorApi: {}, mockModelosDispositivoApi: {}, mockProjetosApi: {},
}));

describe("APIs de projetos", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
  });

  afterEach(() => vi.unstubAllGlobals());

  it("lista projetos com paginação", async () => {
    await projetosApi.listar(2, 10);
    expect(fetch).toHaveBeenCalledWith("/api/projetos?page=2&page_size=10", expect.any(Object));
  });

  it("cria projeto enviando time, App, One UI e modelos", async () => {
    const body = { time_id: "time-1", app: "Clock", one_ui: "9.5", modelos_ids: ["model-1"] };
    await projetosApi.criar(body);
    expect(fetch).toHaveBeenCalledWith("/api/projetos", expect.objectContaining({ method: "POST", body: JSON.stringify(body) }));
  });

  it("consulta projeto e atualiza seu status", async () => {
    await projetosApi.obter("project-1");
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1", expect.any(Object));
    await projetosApi.atualizarStatus("project-1", "InProgress");
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1/status", expect.objectContaining({ method: "PATCH", body: JSON.stringify({ status: "InProgress" }) }));
  });

  it("envia a planilha inicial como multipart com time e modelos", async () => {
    const file = new File(["planilha"], "casos.xlsx");
    await projetosApi.importar(file, "time-1", ["model-1", "model-2"]);
    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/projetos/importar");
    expect(init?.method).toBe("POST");
    expect(init?.body).toBeInstanceOf(FormData);
    expect((init?.body as FormData).get("arquivo")).toBe(file);
    expect((init?.body as FormData).get("time_id")).toBe("time-1");
    expect((init?.body as FormData).getAll("modelos_ids")).toEqual(["model-1", "model-2"]);
  });

  it("cria e atualiza Test Cases nos endpoints do projeto", async () => {
    const body = { tc_id: "Clock_001", category: "A" as const, difficulty: "Low" as const, situation: "New" as const, responsavel_id: "user-1", backup_id: "user-2" };
    await casosTesteApi.criar("project-1", body);
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1/test-cases", expect.objectContaining({ method: "POST", body: JSON.stringify(body) }));
    await casosTesteApi.atualizar("case-1", { situation: "New Step", status: "InProgress" });
    expect(fetch).toHaveBeenLastCalledWith("/api/test-cases/case-1", expect.objectContaining({ method: "PUT", body: JSON.stringify({ situation: "New Step", status: "InProgress" }) }));
  });

  it("consulta Test Cases e transfere o responsável para o backup", async () => {
    await casosTesteApi.listar("project-1", 3, 5);
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1/test-cases?page=3&page_size=5", expect.any(Object));
    await casosTesteApi.listar("project-1", 1, 10, { responsavelId: "user-2" });
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1/test-cases?page=1&page_size=10&responsavel_id=user-2", expect.any(Object));
    await casosTesteApi.obter("case-1");
    expect(fetch).toHaveBeenLastCalledWith("/api/test-cases/case-1", expect.any(Object));
    await casosTesteApi.transferirParaBackup("case-1");
    expect(fetch).toHaveBeenLastCalledWith("/api/test-cases/case-1/transferir-para-backup", expect.objectContaining({ method: "PATCH", body: "{}" }));
  });

  it("cria, edita e altera o estado de modelos de dispositivo", async () => {
    await modelosDispositivoApi.criar("S27 Ultra");
    expect(fetch).toHaveBeenLastCalledWith("/api/modelos-dispositivo", expect.objectContaining({ method: "POST", body: JSON.stringify({ nome: "S27 Ultra" }) }));
    await modelosDispositivoApi.atualizar("model-1", { nome: "S27 Ultra Rev B" });
    expect(fetch).toHaveBeenLastCalledWith("/api/modelos-dispositivo/model-1", expect.objectContaining({ method: "PUT", body: JSON.stringify({ nome: "S27 Ultra Rev B" }) }));
    await modelosDispositivoApi.definirAtivo("model-1", false);
    expect(fetch).toHaveBeenLastCalledWith("/api/modelos-dispositivo/model-1/inativar", expect.objectContaining({ method: "PATCH", body: "{}" }));
  });

  it("envia filtros de modelo e Form Factor e o relatório SDF", async () => {
    await modelosDispositivoApi.listar(1, 50, true, "S27");
    expect(fetch).toHaveBeenLastCalledWith("/api/modelos-dispositivo?page=1&page_size=50&ativo=true&busca=S27", expect.any(Object));
    await formFactorApi.listar("project-1", { page: 2, pageSize: 10, semana: "2026-W13", oneUi: "9.5" });
    expect(fetch).toHaveBeenLastCalledWith("/api/projetos/project-1/form-factor?page=2&page_size=10&semana=2026-W13&one_ui=9.5", expect.any(Object));
    const report = new File(["resultado"], "sdf.xlsx");
    await formFactorApi.importar("project-1", report);
    const [url, init] = vi.mocked(fetch).mock.calls[2];
    expect(url).toBe("/api/projetos/project-1/relatorios-sdf");
    expect((init?.body as FormData).get("arquivo")).toBe(report);
  });
});
