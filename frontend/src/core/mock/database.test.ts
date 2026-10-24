import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "@e965/xlsx";

import { ApiError } from "@/shared/api/problem-details";
import { mockAuth, mockCasosTesteApi, mockFormFactorApi, mockProjetosApi, resetMockDatabase } from "./database";

const STORAGE_KEY = "sdf.mock.database.v1";

function planilhaFile(rows: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet(rows), "Cases");
  return new File([XLSX.write(workbook, { type: "array", bookType: "xlsx" }) as BlobPart], "cases.xlsx");
}

function entrar(email: string) {
  const tokens = mockAuth.login(email, "qualquer senha");
  sessionStorage.setItem("sdf.access", tokens.access_token);
}

describe("base mock de projetos", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
    entrar("admin@sdfmanager.com");
  });

  it("cria projetos com nome derivado e mantém o time e modelos informados", () => {
    const project = mockProjetosApi.criar({
      time_id: "mock-team-platform",
      app: " Clock ",
      one_ui: " 9.5 ",
      modelos_ids: ["mock-model-s27-ultra"],
    });

    expect(project).toMatchObject({ nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created" });
    expect(mockProjetosApi.listar(1, 10).items.map((item) => item.id)).toContain(project.id);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").projetoModelos).toContainEqual({
      projeto_id: project.id,
      modelo_dispositivo_id: "mock-model-s27-ultra",
    });
  });

  it("importa casos, resolve responsáveis pelo nome/e-mail e mantém o primeiro App e One UI", async () => {
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Daniel Oliveira", "kaique.pereira@example.com"],
      ["Weather", "Clock_002", "High", "C", "New Step", "10.0", "daniel.oliveira@example.com", "Kaique Pereira"],
    ]);

    const result = await mockProjetosApi.importar(file, "mock-team-platform", ["mock-model-s27-ultra"]);

    expect(result).toMatchObject({ quantidade_casos: 2, projeto: { nome: "Clock 9.5", app: "Clock", one_ui: "9.5" } });
    expect(mockCasosTesteApi.listar(result.projeto.id, 1, 10).items).toEqual(expect.arrayContaining([
      expect.objectContaining({ tc_id: "Clock_001", situation: "New", status: "To-Do", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" }),
      expect.objectContaining({ tc_id: "Clock_002", situation: "New Step", status: "To-Do", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" }),
    ]));
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(database.projetoModelos).toContainEqual({ projeto_id: result.projeto.id, modelo_dispositivo_id: "mock-model-s27-ultra" });
  });

  it("coleta os problemas de pessoas de todas as linhas sem criar o projeto", async () => {
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Rafael Lima", "Kaique Pereira"],
      ["Clock", "Clock_002", "Low", "A", "New", "9.5", "Daniel Oliveira", "Daniel Oliveira"],
    ]);

    const erro = await mockProjetosApi.importar(file, "mock-team-platform", []).catch((error: unknown) => error);
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).problem).toMatchObject({
      status: 422,
      total_linhas: 2,
      errors: [
        { codigo: "pessoa_nao_encontrada", linha: 2, coluna: "Assignees", valor: "Rafael Lima" },
        { codigo: "responsavel_igual_backup", linha: 3, coluna: "Backup", valor: "Daniel Oliveira" },
      ],
    });
    expect(mockProjetosApi.listar(1, 10).items).toHaveLength(0);
  });

  it("rejeita Test Case duplicado no mesmo projeto ignorando maiúsculas", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const input = { tc_id: "Clock_001", category: "A" as const, difficulty: "Low" as const, situation: "New" as const, responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" };

    mockCasosTesteApi.criar(project.id, input);
    expect(() => mockCasosTesteApi.criar(project.id, { ...input, tc_id: "clock_001" })).toThrow(/já foi cadastrado para este projeto/);
  });

  it("permite ao responsável editar os campos próprios e transferir para o backup", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const testCase = mockCasosTesteApi.criar(project.id, {
      tc_id: "Clock_002", category: "A", difficulty: "Low", situation: "Without Changes", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp",
    });
    expect(testCase).toMatchObject({ situation: "Without Changes", status: "To-Do" });

    entrar("daniel.oliveira@example.com");
    expect(mockCasosTesteApi.atualizar(testCase.id, { status: "InProgress", difficulty: "Medium" })).toMatchObject({ status: "InProgress", difficulty: "Medium" });
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { situation: "New Step" })).toThrow(/só pode editar/);
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { responsavel_id: "mock-user-kp" })).toThrow(/só pode editar/);
    expect(mockCasosTesteApi.transferirParaBackup(testCase.id)).toMatchObject({ responsavel_id: "mock-user-kp", backup_id: null });
  });

  it("preserva lotes anteriores ao importar novos relatórios SDF", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const file1 = new File(["sdf-1"], "resultado-1.xlsx");
    const file2 = new File(["sdf-2"], "resultado-2.xlsx");

    mockFormFactorApi.importar(project.id, file1);
    mockFormFactorApi.importar(project.id, file2);

    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(database.importacoesSdf).toHaveLength(2);
    expect(database.importacoesSdf.every((batch: { projeto_id: string }) => batch.projeto_id === project.id)).toBe(true);
  });

  it("migra casos antigos: o progresso vai para status e TC Situation vira New", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.schemaVersion = 8;
    database.casosTeste = [{ id: "legado", unidade_id: database.unidade.id, projeto_id: "p", tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "InReview", responsavel_id: "mock-user-dev", backup_id: null, ativo: true, created_at: null, updated_at: null }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10); // qualquer leitura aplica a migração
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(migrado.schemaVersion).toBe(9);
    expect(migrado.casosTeste[0]).toMatchObject({ situation: "New", status: "InReview" });
  });
});
