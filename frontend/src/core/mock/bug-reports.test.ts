import { beforeEach, describe, expect, it } from "vitest";

import { mockAuth, mockBugReportsApi, resetMockDatabase } from "./database";

const STORAGE_KEY = "sdf.mock.database.v1";

function entrar(email: string) {
  sessionStorage.setItem("sdf.access", mockAuth.login(email, "qualquer senha").access_token);
}

function semear() {
  const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
  const caso = (id: string, status: string, responsavel_id: string) => ({ id, unidade_id: database.unidade.id, projeto_id: "p-clock", tc_id: id, category: "A", difficulty: "Low", automation_level: null, situation: "New", status, responsavel_id, backup_id: null, ativo: true });
  const resultado = (caso_teste_id: string, modelo: string, valor: string, data: string) => ({ tc_id: caso_teste_id, caso_teste_id, sdf_id: `SDF-${data}`, modelo_dispositivo_id: modelo, resultado: valor, data_reportada: data });
  database.projetos.push({ id: "p-clock", unidade_id: database.unidade.id, time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", nome: "Clock 9.5", status: "InProgress", modelos_dispositivo: [], modelos_ids: [], ativo: true, created_at: null, updated_at: null });
  database.projetoModelos.push({ projeto_id: "p-clock", modelo_dispositivo_id: "mock-model-s27-ultra" }, { projeto_id: "p-clock", modelo_dispositivo_id: "mock-model-s26-ultra" });
  database.casosTeste.push(caso("Clock_1", "InFixes", "mock-user-dev"), caso("Clock_2", "InValidation", "mock-user-kp"), caso("Clock_3", "Done", "mock-user-dev"));
  database.formFactor.push(
    resultado("Clock_1", "mock-model-s27-ultra", "FAIL", "2026-11-05T09:00:00Z"),
    resultado("Clock_1", "mock-model-s26-ultra", "FAIL", "2026-11-06T09:00:00Z"),
    resultado("Clock_2", "mock-model-s27-ultra", "FAIL", "2026-11-05T09:00:00Z"),
    resultado("Clock_2", "mock-model-s27-ultra", "PASS", "2026-11-07T09:00:00Z"),
    resultado("Clock_3", "mock-model-s27-ultra", "FAIL", "2026-11-05T09:00:00Z"),
  );
  localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
}

describe("mockBugReportsApi (spec 070)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
    semear();
  });

  it("lista uma linha por device cujo último resultado é FAIL, da execução mais recente para a mais antiga", () => {
    entrar("admin@sdfmanager.com");

    const falhas = mockBugReportsApi.listar(1, 20);

    expect(falhas.items.map((item) => [item.tc_id, item.modelo_nome])).toEqual([["Clock_1", "S26 Ultra"], ["Clock_1", "S27 Ultra"]]);
    expect(mockBugReportsApi.listar(1, 20, { modelo_dispositivo_id: "mock-model-s26-ultra" }).total_count).toBe(1);
  });

  it("falha: fora do time não vê nada, e o filtro de responsável sem par zera a lista", () => {
    entrar("ana.souza@example.com");
    expect(mockBugReportsApi.listar(1, 20).total_count).toBe(0);

    entrar("daniel.oliveira@example.com");
    expect(mockBugReportsApi.listar(1, 20).total_count).toBe(2);
    expect(mockBugReportsApi.listar(1, 20, { responsavel: "ninguem" }).total_count).toBe(0);
  });
});
