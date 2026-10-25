import { beforeEach, describe, expect, it } from "vitest";
import * as XLSX from "@e965/xlsx";

import { ApiError } from "@/shared/api/problem-details";
import { mockAuth, mockCasosTesteApi, mockFormFactorApi, mockModelosDispositivoApi, mockProjetosApi, mockTimesApi, mockUsuarioApi, resetMockDatabase } from "./database";

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

  it("filtra projetos e casos pessoais incluindo backup antes de paginar", () => {
    mockTimesApi.adicionar("mock-team-platform", "mock-user-manager");
    const projects = ["Clock", "Gallery", "Weather"].map((app) => mockProjetosApi.criar({ time_id: "mock-team-platform", app, one_ui: "9.5", modelos_ids: [] }));
    const base = { category: "A" as const, difficulty: "Low" as const, situation: "New" as const };
    mockCasosTesteApi.criar(projects[0].id, { ...base, tc_id: "Principal", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    mockCasosTesteApi.criar(projects[0].id, { ...base, tc_id: "Colega", responsavel_id: "mock-user-kp", backup_id: "mock-user-manager" });
    mockCasosTesteApi.criar(projects[1].id, { ...base, tc_id: "Backup", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    entrar("daniel.oliveira@example.com");
    const first = mockProjetosApi.listar(1, 1, true);
    const second = mockProjetosApi.listar(2, 1, true);
    expect(first.total_count).toBe(2);
    expect(new Set([first.items[0].id, second.items[0].id])).toEqual(new Set([projects[0].id, projects[1].id]));
    expect(mockCasosTesteApi.listar(projects[0].id, 1, 20, { associadosAMim: true }).items.map((c) => c.tc_id)).toEqual(["Principal"]);
    expect(mockCasosTesteApi.listar(projects[1].id, 1, 20, { associadosAMim: true }).items.map((c) => c.tc_id)).toEqual(["Backup"]);
    expect(() => mockCasosTesteApi.atualizar(mockCasosTesteApi.listar(projects[1].id, 1, 20).items[0].id, { status: "Pass" })).toThrow();
  });

  it("filtra a semana pela data final antes de paginar e exclui TCs sem data final", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    for (const tc_id of ["Principal", "Backup", "Anterior", "Pendente"]) {
      mockCasosTesteApi.criar(project.id, { tc_id, category: "A", difficulty: "Low", situation: "New", responsavel_id: tc_id === "Backup" ? "mock-user-kp" : "mock-user-dev", backup_id: tc_id === "Backup" ? "mock-user-dev" : "mock-user-kp" });
    }
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    for (const item of db.casosTeste) {
      item.created_at = "2026-03-24T12:00:00Z";
      item.updated_at = item.tc_id === "Anterior" ? "2026-03-16T12:00:00Z" : null;
      item.status = item.tc_id === "Pendente" ? "To-Do" : "Pass";
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    entrar("daniel.oliveira@example.com");
    const first = mockCasosTesteApi.listar(project.id, 1, 1, { associadosAMim: true, semana: "2026-W13" });
    const second = mockCasosTesteApi.listar(project.id, 2, 1, { associadosAMim: true, semana: "2026-W13" });
    expect(first.total_count).toBe(2);
    expect(second.total_count).toBe(2);
    expect([first.items[0].tc_id, second.items[0].tc_id]).toEqual(["Principal", "Backup"]);
    expect(mockCasosTesteApi.listar(project.id, 1, 20).total_count).toBe(4);
  });

  it("cria projetos com nome derivado e mantém o time e modelos informados", () => {
    const project = mockProjetosApi.criar({
      time_id: "mock-team-platform",
      app: " Clock ",
      one_ui: " 9.5 ",
      modelos_ids: ["mock-model-s27-ultra"],
    });

    expect(project).toMatchObject({ nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created" });
    expect(mockProjetosApi.listar(1, 10, true).total_count).toBe(0);
    expect(mockProjetosApi.listar(1, 10).items.map((item) => item.id)).toContain(project.id);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").projetoModelos).toContainEqual({
      projeto_id: project.id,
      modelo_dispositivo_id: "mock-model-s27-ultra",
    });
  });

  it("não oferece associação de outra unidade nem de time sem participação ativa", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    mockCasosTesteApi.criar(project.id, { tc_id: "Principal", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    const db = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    db.projetos.push({ ...db.projetos[0], id: "outra-unidade", unidade_id: "outra" });
    db.casosTeste.push({ ...db.casosTeste[0], id: "caso-outra", projeto_id: "outra-unidade", unidade_id: "outra" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
    entrar("daniel.oliveira@example.com");
    expect(mockProjetosApi.listar(1, 20, true).items.map((p) => p.id)).toEqual([project.id]);
    entrar("admin@sdfmanager.com");
    mockTimesApi.remover("mock-team-platform", "mock-user-dev");
    entrar("daniel.oliveira@example.com");
    expect(mockProjetosApi.listar(1, 20, true).total_count).toBe(0);
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

  it("importa responsável e backup pelo user_id", async () => {
    for (const [userId, externalId] of [["mock-user-dev", "DEV-001"], ["mock-user-kp", "KP-002"]]) {
      const user = mockUsuarioApi.obter(userId);
      mockUsuarioApi.atualizar(userId, { nome: user.nome, email: user.email, user_id: externalId });
    }
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "New", "9.5", "dev-001", "kp-002"],
    ]);

    const result = await mockProjetosApi.importar(file, "mock-team-platform", []);

    expect(mockCasosTesteApi.listar(result.projeto.id, 1, 10).items[0]).toMatchObject({
      responsavel_id: "mock-user-dev",
      backup_id: "mock-user-kp",
    });
  });

  it("reporta ambiguidade entre user_id e email sem criar projeto", async () => {
    const daniel = mockUsuarioApi.obter("mock-user-dev");
    mockUsuarioApi.atualizar(daniel.id, {
      nome: daniel.nome,
      email: daniel.email,
      user_id: "kaique.pereira@example.com",
    });
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "New", "9.5", "kaique.pereira@example.com", "Daniel Oliveira"],
    ]);

    const erro = await mockProjetosApi.importar(file, "mock-team-platform", []).catch((error: unknown) => error);

    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).problem.errors).toContainEqual(expect.objectContaining({
      codigo: "pessoa_ambigua",
      coluna: "Assignees",
      valor: "kaique.pereira@example.com",
    }));
    expect(mockProjetosApi.listar(1, 10).items).toHaveLength(0);
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

  it("não resolve homônimo fora do time quando o valor corresponde a mais de uma pessoa", async () => {
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
    ]);
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.usuarios.push({
      ...database.usuarios.find((user: { id: string }) => user.id === "mock-user-dev"),
      id: "mock-user-riley",
      nome: "Daniel Oliveira",
      email: "riley@example.com",
    });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    const erro = await mockProjetosApi.importar(file, "mock-team-platform", []).catch((error: unknown) => error);

    expect((erro as ApiError).problem.errors).toContainEqual(expect.objectContaining({
      codigo: "pessoa_ambigua",
      valor: "Daniel Oliveira",
    }));
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
    expect(migrado.schemaVersion).toBe(11);
    expect(migrado.casosTeste[0]).toMatchObject({ situation: "New", status: "InReview" });
    expect(migrado.usuarios.every((user: { user_id?: string | null }) => user.user_id === null)).toBe(true);
  });

  it("adiciona user_id nulo aos usuários do schema anterior", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.schemaVersion = 10;
    database.usuarios.forEach((user: { user_id?: string | null }) => { delete user.user_id; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(migrado.schemaVersion).toBe(12);
    expect(migrado.usuarios.every((user: { user_id?: string | null }) => user.user_id === null)).toBe(true);
  });

  it("normaliza e garante a unicidade do user_id ao criar e editar usuários", () => {
    const original = mockUsuarioApi.obter("mock-user-dev");
    const atualizado = mockUsuarioApi.atualizar(original.id, {
      nome: original.nome,
      email: original.email,
      user_id: "  DEV-001  ",
    });

    expect(atualizado.user_id).toBe("DEV-001");
    expect(() => mockUsuarioApi.criar({
      nome: "Duplicado",
      email: "duplicado@example.com",
      user_id: "dev-001",
    })).toThrow(ApiError);
    expect(mockUsuarioApi.atualizar(original.id, {
      nome: original.nome,
      email: original.email,
      user_id: "   ",
    }).user_id).toBeNull();
  });

  it("com problemas de célula, ainda confere as pessoas e devolve tudo junto", async () => {
    const file = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "D", "New", "9.5", "Rafael Lima", "Kaique Pereira"],
    ]);

    const erro = await mockProjetosApi.importar(file, "mock-team-platform", []).catch((error: unknown) => error);

    expect((erro as ApiError).problem.errors?.map(({ linha, coluna, codigo }) => [linha, coluna, codigo])).toEqual([
      [2, "Category", "valor_invalido"],
      [2, "Assignees", "pessoa_nao_encontrada"],
    ]);
    expect(mockProjetosApi.listar(1, 10).items).toHaveLength(0);
  });

  it("KP gerencia o catálogo de modelos com descrição e datas", () => {
    entrar("kaique.pereira@example.com");
    const criado = mockModelosDispositivoApi.criar({ nome: " S28 Ultra ", descricao: " Flagship " });
    expect(criado).toMatchObject({ nome: "S28 Ultra", descricao: "Flagship", ativo: true });
    expect(criado.updated_at).toBe(criado.created_at);

    const editado = mockModelosDispositivoApi.atualizar(criado.id, { nome: "S28 Ultra", descricao: null });
    expect(editado.descricao).toBeNull();
    expect(() => mockModelosDispositivoApi.criar({ nome: "S28 Ultra", descricao: null })).toThrow("Já existe");
  });

  it("gerente só lista as opções ativas e não gerencia o catálogo", () => {
    entrar("kaique.pereira@example.com");
    mockModelosDispositivoApi.definirAtivo("mock-model-tab-s11", false);
    entrar("mariana.costa@example.com");

    expect(() => mockModelosDispositivoApi.listar(1, 20)).toThrow("permissão");
    expect(() => mockModelosDispositivoApi.criar({ nome: "S28", descricao: null })).toThrow("permissão");
    const opcoes = mockModelosDispositivoApi.listarOpcoes(1, 100).items;
    expect(opcoes).not.toContainEqual(expect.objectContaining({ id: "mock-model-tab-s11" }));
    expect(opcoes[0]).toEqual({ id: expect.any(String), nome: expect.any(String) });
  });

  it("dev não lista as opções de modelos", () => {
    entrar("daniel.oliveira@example.com");

    expect(() => mockModelosDispositivoApi.listarOpcoes(1, 100)).toThrow("permissão");
  });

  it("migra o schema 11: concede a gestão de modelos ao KP e preenche a descrição", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.schemaVersion = 11;
    database.perfis.forEach((profile: { permissoes: string[] }) => { profile.permissoes = profile.permissoes.filter((item) => item !== "modelos_dispositivo.gerenciar"); });
    database.modelosDispositivo.forEach((model: Record<string, unknown>) => { delete model.descricao; delete model.updated_at; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(migrado.schemaVersion).toBe(12);
    const kp = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "KP");
    const gerente = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "GERENTE");
    expect(kp.permissoes).toContain("modelos_dispositivo.gerenciar");
    expect(gerente.permissoes).not.toContain("modelos_dispositivo.gerenciar");
    expect(migrado.modelosDispositivo.every((model: { descricao: unknown }) => model.descricao === null)).toBe(true);
  });
});
