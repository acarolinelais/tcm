import { beforeEach, describe, expect, it } from "vitest";

import { mockAuth, mockBugReportsApi, resetMockDatabase } from "./database";

const STORAGE_KEY = "sdf.mock.database.v1";

function entrar(email: string) {
  sessionStorage.setItem("sdf.access", mockAuth.login(email, "qualquer senha").access_token);
}

function semear() {
  const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  const caso = (id: string, status: string, responsavel_id: string, dev_fix_id: string | null = null) => ({ id, unidade_id: database.unidade.id, projeto_id: "p-clock", tc_id: id, category: "A", difficulty: "Low", automation_level: null, situation: "New", status, responsavel_id, backup_id: null, dev_fix_id, ativo: true });
  const resultado = (caso_teste_id: string, modelo: string, valor: string, data: string) => ({ tc_id: caso_teste_id, caso_teste_id, sdf_id: `SDF-${data}`, modelo_dispositivo_id: modelo, resultado: valor, data_reportada: data });
  database.projetos.push({ id: "p-clock", unidade_id: database.unidade.id, time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", nome: "Clock 9.5", status: "InProgress", modelos_dispositivo: [], modelos_ids: [], ativo: true, created_at: null, updated_at: null });
  database.projetoModelos.push({ projeto_id: "p-clock", modelo_dispositivo_id: "mock-model-s27-ultra" }, { projeto_id: "p-clock", modelo_dispositivo_id: "mock-model-s26-ultra" });
  database.casosTeste.push(
    caso("Clock_1", "To-Do", "mock-user-dev"),
    caso("Clock_2", "Done", "mock-user-kp", "mock-user-dev"),
    caso("Clock_3", "Cancelled", "mock-user-dev"),
    caso("Clock_4", "InValidation", "mock-user-kp"),
  );
  database.formFactor.push(
    resultado("Clock_1", "mock-model-s27-ultra", "FAIL", "2026-11-05T09:00:00Z"),
    resultado("Clock_1", "mock-model-s26-ultra", "EXCEPTION", "2026-11-06T09:00:00Z"),
    resultado("Clock_1", "mock-model-s27-ultra", "PASS", "2026-11-07T09:00:00Z"),
    resultado("Clock_2", "mock-model-s27-ultra", "None", "2026-11-04T09:00:00Z"),
    resultado("Clock_3", "mock-model-s27-ultra", "FAIL", "2026-11-05T09:00:00Z"),
    resultado("Clock_4", "mock-model-s27-ultra", "N/A", "2026-11-05T09:00:00Z"),
    resultado("Clock_4", "mock-model-s26-ultra", " check ", "2026-11-05T09:00:00Z"),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

describe("mockBugReportsApi (spec 072)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
    semear();
  });

  it("lista um item por caso com as falhas da mais recente para a mais antiga, mesmo com PASS depois", () => {
    entrar("admin@sdfmanager.com");

    const casos = mockBugReportsApi.listar("p-clock", 1, 20);

    expect(casos.items.map((item) => item.tc_id)).toEqual(["Clock_1", "Clock_2"]);
    expect(casos.items[0].falhas.map((falha) => [falha.modelo_nome, falha.resultado])).toEqual([["S26 Ultra", "EXCEPTION"], ["S27 Ultra", "FAIL"]]);
    expect(mockBugReportsApi.listar("p-clock", 1, 20, { modelo_dispositivo_id: "mock-model-s26-ultra" }).total_count).toBe(1);
  });

  it("falha: N/A, Check e Cancelled ficam fora, e projeto desconhecido ou filtro sem par zera a lista", () => {
    entrar("admin@sdfmanager.com");

    expect(mockBugReportsApi.listar("p-clock", 1, 20).items.some((item) => ["Clock_3", "Clock_4"].includes(item.tc_id))).toBe(false);
    expect(mockBugReportsApi.listar("outro", 1, 20).total_count).toBe(0);
    expect(mockBugReportsApi.listar("p-clock", 1, 20, { responsavel: "ninguem" }).total_count).toBe(0);
    expect(mockBugReportsApi.listar("p-clock", 1, 20, { periodo: "2026-11-04" }).items.map((item) => item.tc_id)).toEqual(["Clock_2"]);
  });
});
