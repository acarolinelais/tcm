import { beforeEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "@e965/xlsx";

import { ApiError } from "@/shared/api/problem-details";
import { ORDEM_KANBAN, STATUS_CASO_TESTE } from "@/modules/projetos/model/projeto";
import { mockAuditoriaApi, mockAuth, mockCasosTesteApi, mockFormFactorApi, mockModelosDispositivoApi, mockProjetosApi, mockTimesApi, mockUsuarioApi, resetMockDatabase } from "./database";

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

  it("atribui o Gerente Ivan como responsável pelos usuários seed Developer e KP", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const usuariosSeed = database.usuarios.filter((user: { id: string }) =>
      ["mock-user-kp", "mock-user-dev", "mock-user-standard", "mock-user-inactive"].includes(user.id),
    );
    database.schemaVersion = 14;
    const gerente = database.usuarios.find((user: { id: string }) => user.id === "mock-user-manager");
    gerente.nome = "Mariana Costa";
    gerente.email = "mariana.costa@example.com";
    usuariosSeed.forEach((user: { responsavel_id?: string }) => { delete user.responsavel_id; });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    const usuariosMigrados = migrado.usuarios.filter((user: { id: string }) =>
      ["mock-user-kp", "mock-user-dev", "mock-user-standard", "mock-user-inactive"].includes(user.id),
    );

    expect(migrado.schemaVersion).toBe(16);
    expect(migrado.usuarios.find((user: { id: string }) => user.id === "mock-user-manager")).toMatchObject({
      nome: "Ivan Moreira",
      email: "ivan.moreira@sidia.com",
    });
    expect(usuariosMigrados).toHaveLength(4);
    expect(usuariosMigrados.every((user: { responsavel_id: string }) => user.responsavel_id === "mock-user-manager")).toBe(true);
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
    expect(() => mockCasosTesteApi.atualizar(mockCasosTesteApi.listar(projects[1].id, 1, 20).items[0].id, { status: "Done" })).toThrow();
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
      item.status = item.tc_id === "Pendente" ? "To-Do" : "Done";
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
    expect(mockCasosTesteApi.atualizar(testCase.id, { situation: "New Step" })).toMatchObject({ situation: "New Step" });
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { responsavel_id: "mock-user-kp" })).toThrow(/só pode editar/);
    expect(mockCasosTesteApi.transferirParaBackup(testCase.id)).toMatchObject({ responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
  });

  it("importa o Automation Level de cada caso e deixa vazio quando a coluna ou a célula faltam", async () => {
    const cabecalho = ["App", "TC ID", "Difficulty", "Category", "Automation Level", "TC Situation", "One UI", "Assignees", "Backup"];
    const linha = (tcId: string, nivel: unknown) => ["Clock", tcId, "Low", "A", nivel, "New", "9.5", "Daniel Oliveira", "Kaique Pereira"];

    const comColuna = await mockProjetosApi.importar(planilhaFile([cabecalho, linha("Clock_001", 1), linha("Clock_002", ""), linha("Clock_003", "3.0")]), "mock-team-platform", []);
    const semColuna = await mockProjetosApi.importar(planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Weather", "Weather_001", "Low", "A", "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
    ]), "mock-team-platform", []);

    const niveis = (projetoId: string) => Object.fromEntries(mockCasosTesteApi.listar(projetoId, 1, 10).items.map((caso) => [caso.tc_id, caso.automation_level]));
    expect(niveis(comColuna.projeto.id)).toEqual({ Clock_001: 1, Clock_002: null, Clock_003: 3 });
    expect(niveis(semColuna.projeto.id)).toEqual({ Weather_001: null });
  });

  it("guarda os textos da planilha na importação e só os devolve no detalhe do caso", async () => {
    const cabecalho = ["App", "TC ID", "Title(English)", "Test Procedure(English)", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];
    const importacao = await mockProjetosApi.importar(planilhaFile([
      cabecalho,
      ["Clock", "Clock_001", "Check Writing style", "1. Messages\n2-1. Select Shorten", "Low", "A", "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
    ]), "mock-team-platform", []);

    const [listado] = mockCasosTesteApi.listar(importacao.projeto.id, 1, 10).items;
    const detalhe = mockCasosTesteApi.obter(listado.id);

    expect(listado).not.toHaveProperty("title");
    expect(listado).not.toHaveProperty("procedure");
    expect(detalhe).toMatchObject({ tc_id: "Clock_001", title: "Check Writing style", procedure: "1. Messages\n2-1. Select Shorten", precondition: null, expected_result: null });
  });

  it("devolve os textos vazios no detalhe de um caso criado manualmente", () => {
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const criado = mockCasosTesteApi.criar(projeto.id, { tc_id: "Manual_028", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });

    expect(mockCasosTesteApi.obter(criado.id)).toMatchObject({ title: null, precondition: null, procedure: null, expected_result: null });
  });

  describe("links de PR (spec 030)", () => {
    const URL_PR = "https://github.sec.samsung.net/org/repo/pull/12";

    function criarCaso() {
      const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
      return mockCasosTesteApi.criar(projeto.id, { tc_id: "clock_000001", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    }

    function statusDoErro(acao: () => unknown) {
      try { acao(); } catch (erro) { return erro instanceof ApiError ? erro.problem.status : "outro"; }
      return null;
    }

    it("o dev adiciona com ele como autor, vê a lista do mais recente ao mais antigo e não pode remover", () => {
      const caso = criarCaso();
      entrar("daniel.oliveira@example.com");
      vi.useFakeTimers();
      vi.setSystemTime(new Date("2026-10-28T12:00:00Z"));
      const primeiro = mockCasosTesteApi.adicionarPullRequest(caso.id, `  ${URL_PR}  `);
      vi.setSystemTime(new Date("2026-10-28T13:00:00Z"));
      const segundo = mockCasosTesteApi.adicionarPullRequest(caso.id, `${URL_PR}/files`);
      vi.useRealTimers();

      const lista = mockCasosTesteApi.listarPullRequests(caso.id);

      expect(primeiro).toMatchObject({ url: URL_PR, created_by: "mock-user-dev", created_by_nome: "Daniel Oliveira" });
      expect(lista.itens.map((link) => link.id)).toEqual([segundo.id, primeiro.id]);
      expect(lista.pode_remover).toBe(false);
      expect(statusDoErro(() => mockCasosTesteApi.removerPullRequest(caso.id, primeiro.id))).toBe(403);
      expect(mockCasosTesteApi.listarPullRequests(caso.id).itens).toHaveLength(2);
    });

    it("recusa URL inválida, de outro domínio e repetida entre os ativos", () => {
      const caso = criarCaso();
      mockCasosTesteApi.adicionarPullRequest(caso.id, URL_PR);

      expect(statusDoErro(() => mockCasosTesteApi.adicionarPullRequest(caso.id, "http://github.sec.samsung.net/x"))).toBe(422);
      expect(statusDoErro(() => mockCasosTesteApi.adicionarPullRequest(caso.id, "https://github.com/org/repo/pull/1"))).toBe(422);
      expect(statusDoErro(() => mockCasosTesteApi.adicionarPullRequest(caso.id, ` ${URL_PR} `))).toBe(409);
      expect(mockCasosTesteApi.listarPullRequests(caso.id).itens).toHaveLength(1);
    });

    it("a gestão remove de forma lógica, a URL volta a ser aceita e um link já removido não é encontrado", () => {
      const caso = criarCaso();
      entrar("daniel.oliveira@example.com");
      const link = mockCasosTesteApi.adicionarPullRequest(caso.id, URL_PR);
      entrar("kaique.pereira@example.com");

      expect(mockCasosTesteApi.listarPullRequests(caso.id).pode_remover).toBe(true);
      mockCasosTesteApi.removerPullRequest(caso.id, link.id);

      expect(mockCasosTesteApi.listarPullRequests(caso.id).itens).toEqual([]);
      expect(statusDoErro(() => mockCasosTesteApi.removerPullRequest(caso.id, link.id))).toBe(404);
      expect(mockCasosTesteApi.adicionarPullRequest(caso.id, URL_PR).id).not.toBe(link.id);
    });

    it("não lista links de um caso inexistente", () => {
      expect(() => mockCasosTesteApi.listarPullRequests("nao-existe")).toThrow("Test Case não encontrado.");
    });
  });

  it("não encontra o detalhe de um caso inexistente", () => {
    expect(() => mockCasosTesteApi.obter("nao-existe")).toThrow("Test Case não encontrado.");
  });

  it("recusa a importação com Automation Level inválido, apontando linha e coluna, sem criar o projeto", async () => {
    const total = mockProjetosApi.listar(1, 100).total_count;
    const arquivo = planilhaFile([
      ["App", "TC ID", "Difficulty", "Category", "Automation Level", "TC Situation", "One UI", "Assignees", "Backup"],
      ["Clock", "Clock_001", "Low", "A", 4, "New", "9.5", "Daniel Oliveira", "Kaique Pereira"],
    ]);

    await expect(mockProjetosApi.importar(arquivo, "mock-team-platform", [])).rejects.toMatchObject({
      problem: { errors: [expect.objectContaining({ codigo: "valor_invalido", linha: 2, coluna: "Automation Level", valor: "4" })] },
    });
    expect(mockProjetosApi.listar(1, 100).total_count).toBe(total);
  });

  it("cria Test Case com ou sem Automation Level e recusa nível fora de 1, 2 e 3", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const base = { category: "A" as const, difficulty: "Low" as const, situation: "New" as const, responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" };

    expect(mockCasosTesteApi.criar(project.id, { ...base, tc_id: "Clock_010", automation_level: 2 })).toMatchObject({ automation_level: 2 });
    expect(mockCasosTesteApi.criar(project.id, { ...base, tc_id: "Clock_011" })).toMatchObject({ automation_level: null });
    expect(() => mockCasosTesteApi.criar(project.id, { ...base, tc_id: "Clock_012", automation_level: 4 as never })).toThrow(/Automation Level deve ser 1, 2 ou 3/);
    expect(mockCasosTesteApi.listar(project.id, 1, 10).items.map((caso) => caso.tc_id)).not.toContain("Clock_012");
  });

  it("deixa a gestão e o responsável do caso definirem o Automation Level, e só eles", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: [] });
    const base = { category: "A" as const, difficulty: "Low" as const, situation: "New" as const };
    const doDev = mockCasosTesteApi.criar(project.id, { ...base, tc_id: "Clock_020", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    const doKp = mockCasosTesteApi.criar(project.id, { ...base, tc_id: "Clock_021", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });

    expect(mockCasosTesteApi.atualizar(doKp.id, { automation_level: 3 })).toMatchObject({ automation_level: 3 });

    entrar("daniel.oliveira@example.com");
    expect(mockCasosTesteApi.atualizar(doDev.id, { automation_level: 1 })).toMatchObject({ automation_level: 1 });
    expect(mockCasosTesteApi.atualizar(doDev.id, { status: "InProgress" })).toMatchObject({ automation_level: 1, status: "InProgress" });
    expect(() => mockCasosTesteApi.atualizar(doDev.id, { automation_level: 9 as never })).toThrow(/Automation Level deve ser 1, 2 ou 3/);
    // Daniel é só o backup do segundo caso: o backup apenas cancela.
    expect(() => mockCasosTesteApi.atualizar(doKp.id, { automation_level: 1 })).toThrow(/só pode cancelar/);
    expect(mockCasosTesteApi.listar(project.id, 1, 10).items.find((caso) => caso.id === doKp.id)).toMatchObject({ automation_level: 3 });
  });

  it("schema 19 deixa os Test Cases anteriores sem Automation Level", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const antigo = { id: "antigo", unidade_id: database.unidade.id, projeto_id: "p", tc_id: "TC-A", category: "A", difficulty: "Low", situation: "New", status: "To-Do", responsavel_id: "mock-user-dev", backup_id: null, ativo: true, created_at: null, updated_at: null };
    database.casosTeste = [antigo];
    database.schemaVersion = 18;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

    expect(migrado.schemaVersion).toBeGreaterThanOrEqual(19);
    expect(migrado.casosTeste[0]).toHaveProperty("automation_level", null);
  });

  it("schema 20 cria a coleção de links de PR sem mexer nos Test Cases", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    delete database.linksPullRequest;
    database.schemaVersion = 19;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

    expect(migrado.schemaVersion).toBeGreaterThanOrEqual(20);
    expect(migrado.linksPullRequest).toEqual([]);
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

  it("gerente que participa de um time de outro setor vê e gerencia os projetos desse time", () => {
    const outroTime = "mock-team-operations";
    ["mock-user-manager", "mock-user-dev", "mock-user-standard"].forEach((userId) => mockTimesApi.adicionar(outroTime, userId));
    const existente = mockProjetosApi.criar({ time_id: outroTime, app: "Clock", one_ui: "9.5", modelos_ids: [] });

    entrar("ivan.moreira@sidia.com");
    expect(mockTimesApi.listar(1, 100).items.map((team) => team.id)).toEqual(expect.arrayContaining(["mock-team-platform", outroTime]));
    expect(mockProjetosApi.listar(1, 100).items.map((project) => project.id)).toContain(existente.id);
    const novo = mockProjetosApi.criar({ time_id: outroTime, app: "Gallery", one_ui: "9.5", modelos_ids: [] });
    const caso = mockCasosTesteApi.criar(novo.id, { tc_id: "TC-001", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: "mock-user-standard" });
    expect(caso.responsavel_id).toBe("mock-user-dev");

    // Sem participação nem setor, o time sai do escopo.
    entrar("admin@sdfmanager.com");
    mockTimesApi.remover(outroTime, "mock-user-manager");
    entrar("ivan.moreira@sidia.com");
    expect(mockProjetosApi.listar(1, 100).items.map((project) => project.id)).not.toContain(existente.id);
    expect(() => mockProjetosApi.criar({ time_id: outroTime, app: "Notes", one_ui: "9.5", modelos_ids: [] })).toThrow(/fora do seu escopo/);
  });

  it("monta a matriz do Form Factor com o resultado mais recente por modelo e aplica os filtros", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra", "mock-model-s26-ultra"] });
    const base = { category: "A" as const, difficulty: "Low" as const, situation: "New" as const };
    mockCasosTesteApi.criar(project.id, { ...base, tc_id: "TC-002", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.criar(project.id, { ...base, tc_id: "TC-001", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    for (const testCase of mockCasosTesteApi.listar(project.id, 1, 20).items) {
      mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
    }
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.formFactor = [
      { tc_id: "TC-001", sdf_id: "SDF-1", modelo_dispositivo_id: "mock-model-s27-ultra", resultado: "Fail", data_reportada: "2026-03-17T00:00:00Z" },
      { tc_id: "TC-001", sdf_id: "SDF-2", modelo_dispositivo_id: "mock-model-s27-ultra", resultado: "Pass", data_reportada: "2026-03-30T00:00:00Z" },
      { tc_id: "TC-001", sdf_id: "SDF-1", modelo_dispositivo_id: "mock-model-s26-ultra", resultado: "Fail", data_reportada: "2026-03-17T00:00:00Z" },
      { tc_id: "TC-001", sdf_id: "SDF-1", modelo_dispositivo_id: "mock-model-tab-s11", resultado: "Pass", data_reportada: "2026-03-17T00:00:00Z" },
      { tc_id: "TC-002", sdf_id: "SDF-A", modelo_dispositivo_id: "mock-model-s26-ultra", resultado: "Blocked", data_reportada: "2026-04-08T12:00:00Z" },
      { tc_id: "TC-002", sdf_id: "SDF-B", modelo_dispositivo_id: "mock-model-s26-ultra", resultado: "Pass", data_reportada: "2026-04-08T12:00:00Z" },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    const matriz = mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20 });
    expect(matriz.modelos.map((model) => model.nome)).toEqual(["S26 Ultra", "S27 Ultra"]);
    expect(matriz.casos_elegiveis?.map((testCase) => testCase.tc_id)).toEqual(["TC-001", "TC-002"]);
    expect(matriz.items.map((row) => row.tc_id)).toEqual(["TC-001", "TC-002"]);
    expect(matriz.items[0]).toMatchObject({ sdf_id: "SDF-2", resultados: { "mock-model-s27-ultra": "Pass", "mock-model-s26-ultra": "Fail" } });
    // Mesma data: vence a importação mais recente (a última gravada).
    expect(matriz.items[1]).toMatchObject({ sdf_id: "SDF-B", resultados: { "mock-model-s26-ultra": "Pass" } });

    const semana = mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20, semana: "2026-W12" });
    expect(semana.items).toHaveLength(1);
    expect(semana.items[0]).toMatchObject({ sdf_id: "SDF-1", resultados: { "mock-model-s27-ultra": "Fail" } });
    expect(mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20, responsavelIds: ["mock-user-kp"] }).items.map((row) => row.tc_id)).toEqual(["TC-002"]);
    // Seleção múltipla: entram os casos de qualquer um dos responsáveis escolhidos.
    expect(mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20, responsavelIds: ["mock-user-kp", "mock-user-dev"] }).total_count).toBe(mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20 }).total_count);
    const semCasoNaSemana = mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20, semana: "2026-W15" });
    expect(semCasoNaSemana.items.map((row) => row.tc_id)).toEqual(["TC-002"]);
    expect(mockFormFactorApi.listar(project.id, { page: 1, pageSize: 20, responsavelIds: ["ninguem"] }).total_count).toBe(0);
  });

  it("preserva rodadas Form Factor no histórico", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra", "mock-model-s26-ultra"] });
    const testCase = mockCasosTesteApi.criar(project.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-ROUNDS", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.atualizar(testCase.id, { status: "InProgress" });
    mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
    // Datas fixas: com o rel�gio real, as duas rodadas podem sair no mesmo milissegundo e a "mais recente" fica ao acaso.
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      const primeira = mockFormFactorApi.criarRodada(project.id, { sdf_id: "SDF-1" });
      mockFormFactorApi.registrarResultadosRodada(project.id, primeira.id, testCase.id, { resultados: { "mock-model-s27-ultra": "FAIL" } });
      mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
      vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
      const segunda = mockFormFactorApi.criarRodada(project.id, { sdf_id: "SDF-2" });
      mockFormFactorApi.registrarResultadosRodada(project.id, segunda.id, testCase.id, { resultados: { "mock-model-s27-ultra": "FAIL", "mock-model-s26-ultra": "PASS" } });

      const historico = mockFormFactorApi.listarResultados(project.id, { tcId: "TC-ROUNDS" });
      expect(historico.items).toHaveLength(2);
      expect(historico.items.map((item) => item.rodada_id)).toContain(primeira.id);
      expect(historico.items.map((item) => item.rodada_id)).toContain(segunda.id);
      expect(historico.items.every((item) => item.origem === "MANUAL")).toBe(true);
      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-ROUNDS" }).items).toHaveLength(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it("Resumo mostra só a rodada mais recente do TC e o histórico preserva as anteriores", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra", "mock-model-s26-ultra"] });
    const testCase = mockCasosTesteApi.criar(project.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-RESUMO", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
    vi.useFakeTimers();
    try {
      vi.setSystemTime(new Date("2026-10-20T12:00:00Z"));
      const primeira = mockFormFactorApi.criarRodada(project.id, { sdf_id: "SDF-002" });
      mockFormFactorApi.registrarResultadosRodada(project.id, primeira.id, testCase.id, { resultados: { "mock-model-s27-ultra": "PASS" } });
      vi.setSystemTime(new Date("2026-10-26T12:00:00Z"));
      const segunda = mockFormFactorApi.criarRodada(project.id, { sdf_id: "SDF-003" });

      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-RESUMO" }).items[0]).toMatchObject({ sdf_id: "SDF-003", resultados: {}, data_reportada: null });
      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-RESUMO", modeloDispositivoId: "mock-model-s27-ultra", resultado: "PASS" }).total_count).toBe(0);

      mockFormFactorApi.registrarResultadosRodada(project.id, segunda.id, testCase.id, { resultados: { "mock-model-s26-ultra": "PASS" } });
      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-RESUMO" }).items[0]).toMatchObject({ sdf_id: "SDF-003", resultados: { "mock-model-s26-ultra": "PASS" } });
      expect(mockFormFactorApi.listarResultados(project.id, { tcId: "TC-RESUMO" }).items.map((item) => [item.sdf_id, item.resultados])).toEqual(expect.arrayContaining([
        ["SDF-002", { "mock-model-s27-ultra": "PASS" }],
        ["SDF-003", { "mock-model-s26-ultra": "PASS" }],
      ]));
    } finally {
      vi.useRealTimers();
    }
  });

  it("exige justificativa ao excluir o TC e a apaga ao reativar", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra"] });
    const testCase = mockCasosTesteApi.criar(project.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-EXCLUIR", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });

    expect(() => mockCasosTesteApi.atualizar(testCase.id, { status: "Cancelled" })).toThrow("justificativa");
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { status: "Cancelled", justificativa_exclusao: "   " })).toThrow("justificativa");
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { status: "Cancelled", justificativa_exclusao: "x".repeat(501) })).toThrow("500");
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { status: "To-Do", justificativa_exclusao: "Fora do escopo" })).toThrow("justificativa");
    expect(mockCasosTesteApi.obter(testCase.id).status).toBe("To-Do");

    expect(mockCasosTesteApi.atualizar(testCase.id, { status: "Cancelled", justificativa_exclusao: " Depende de hardware " }).justificativa_exclusao).toBe("Depende de hardware");
    expect(mockCasosTesteApi.atualizar(testCase.id, { category: "B" }).justificativa_exclusao).toBe("Depende de hardware");
    expect(mockCasosTesteApi.atualizar(testCase.id, { status: "To-Do" }).justificativa_exclusao).toBeNull();
  });

  it("recusa SDF ID repetido no mesmo projeto, sem diferenciar maiúsculas e espaços", () => {
    const criarProjeto = () => mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra"] });
    const [project, outro] = [criarProjeto(), criarProjeto()];
    [project, outro].forEach((projeto) => mockCasosTesteApi.atualizar(mockCasosTesteApi.criar(projeto.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-SDF", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" }).id, { status: "InValidation" }));
    mockFormFactorApi.criarRodada(project.id, { sdf_id: "SDF-001" });

    let erro: unknown;
    try { mockFormFactorApi.criarRodada(project.id, { sdf_id: " sdf-001 " }); } catch (error) { erro = error; }
    expect(erro).toBeInstanceOf(ApiError);
    expect((erro as ApiError).problem).toMatchObject({ status: 409, errors: [{ campo: "sdf_id" }] });
    expect(mockFormFactorApi.criarRodada(outro.id, { sdf_id: "SDF-001" }).sdf_id).toBe("SDF-001");
    expect(mockFormFactorApi.criarRodada(project.id, { sdf_id: "" }).sdf_id).toBeNull();
    expect(mockFormFactorApi.criarRodada(project.id, { sdf_id: "  " }).sdf_id).toBeNull();
  });

  it("só a rodada atual do TC recebe resultados e as anteriores ficam encerradas", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra", "mock-model-s26-ultra"] });
    const testCase = mockCasosTesteApi.criar(project.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-ATUAL", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
    vi.useFakeTimers();
    try {
      const [anterior, , atual] = ["SDF-002", "SDF-003", "SDF-005"].map((sdf_id, dia) => {
        vi.setSystemTime(new Date(Date.UTC(2026, 9, 20 + dia)));
        return mockFormFactorApi.criarRodada(project.id, { sdf_id });
      });

      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-ATUAL" }).items[0]).toMatchObject({ rodada_pendente_id: atual.id, sdf_id: "SDF-005" });
      expect(() => mockFormFactorApi.registrarResultadosRodada(project.id, anterior.id, testCase.id, { resultados: { "mock-model-s27-ultra": "PASS" } })).toThrow("rodada mais recente");

      mockFormFactorApi.registrarResultadosRodada(project.id, atual.id, testCase.id, { resultados: { "mock-model-s27-ultra": "PASS" } });
      expect(mockFormFactorApi.listar(project.id, { tcId: "TC-ATUAL" }).items[0].rodada_pendente_id).toBeNull();
    } finally {
      vi.useRealTimers();
    }
  });

  it("deixa o DEV mudar o Status livremente e FAIL leva a In Fixes", () => {
    const project = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s27-ultra"] });
    const testCase = mockCasosTesteApi.criar(project.id, { category: "A", difficulty: "Low", situation: "New", tc_id: "TC-CICLO", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    entrar("daniel.oliveira@example.com");

    mockCasosTesteApi.atualizar(testCase.id, { status: "InProgress" });
    expect(mockCasosTesteApi.atualizar(testCase.id, { status: "To-Do" }).status).toBe("To-Do");
    mockCasosTesteApi.atualizar(testCase.id, { status: "InValidation" });
    entrar("admin@sdfmanager.com");
    const rodada = mockFormFactorApi.criarRodada(project.id, { sdf_id: null });
    mockFormFactorApi.registrarResultadosRodada(project.id, rodada.id, testCase.id, { resultados: { "mock-model-s27-ultra": "FAIL" } });
    entrar("daniel.oliveira@example.com");

    expect(mockCasosTesteApi.obter(testCase.id).status).toBe("InFixes");
    expect(mockCasosTesteApi.atualizar(testCase.id, { status: "Done" }).status).toBe("Done");
    expect(() => mockCasosTesteApi.atualizar(testCase.id, { status: "InReview", responsavel_id: "mock-user-kp" })).toThrow();
  });

  it("schema 18 move para In Fixes o TC em revisão com FAIL na execução mais recente", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const base = { unidade_id: database.unidade.id, projeto_id: "p", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: null, ativo: true, created_at: null, updated_at: null };
    database.casosTeste = [{ ...base, id: "falhou", tc_id: "TC-F", status: "InReview" }, { ...base, id: "corrigido", tc_id: "TC-C", status: "InReview" }];
    const resultado = (execucao_id: string, caso_teste_id: string, resultado: string, data_reportada: string) => ({ execucao_id, caso_teste_id, tc_id: caso_teste_id, sdf_id: null, modelo_dispositivo_id: "m", resultado, data_reportada });
    database.formFactor = [
      resultado("e1", "falhou", "PASS", "2026-10-01T00:00:00Z"), resultado("e2", "falhou", "Fail", "2026-10-20T00:00:00Z"),
      resultado("e3", "corrigido", "FAIL", "2026-10-01T00:00:00Z"), resultado("e4", "corrigido", "PASS", "2026-10-20T00:00:00Z"),
    ];
    database.schemaVersion = 17;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY)!);

    expect(migrado.schemaVersion).toBeGreaterThanOrEqual(18);
    expect(migrado.casosTeste.map((testCase: { status: string }) => testCase.status)).toEqual(["InFixes", "InReview"]);
  });

  it("Resultados Gerais por projeto: 5 datas mais recentes, filtros, último SDF por device e resumo do dia (specs 032 e 059)", () => {
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s26-ultra", "mock-model-s27-ultra"] });
    const caso = mockCasosTesteApi.criar(projeto.id, { tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    const semExecucao = mockCasosTesteApi.criar(projeto.id, { tc_id: "Clock_002", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const resultado = (execucao_id: string, dia: number, modelo: string, valor: string, hora = 12, origem: "SDF" | "MANUAL" = "SDF") => ({
      execucao_id, caso_teste_id: caso.id, tc_id: caso.tc_id, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, modelo_dispositivo_id: modelo, resultado: valor,
      data_reportada: new Date(2026, 9, dia, hora).toISOString(), origem,
    });
    for (let dia = 1; dia <= 10; dia++) database.formFactor.push(resultado(`e${dia}`, dia, "mock-model-s26-ultra", "PASS"));
    database.formFactor.push(resultado("manual", 10, "mock-model-s26-ultra", "FAIL", 15, "MANUAL"), resultado("ultima", 10, "mock-model-s27-ultra", "PASS", 16));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    mockTimesApi.adicionar("mock-team-platform", "mock-user-kp");
    entrar("kaique.pereira@example.com");

    const historico = mockFormFactorApi.historicoProjeto(projeto.id);
    const daSemana = mockFormFactorApi.historicoProjeto(projeto.id, { periodo: "2026-W40" });
    const porSdf = mockFormFactorApi.historicoProjeto(projeto.id, { sdfId: "sdf-e3" });
    const semSdf = mockFormFactorApi.historicoProjeto(projeto.id, { sdfId: "nada" });
    const resumo = mockFormFactorApi.resumoExecucoes(caso.id);

    expect(historico.datas).toEqual(["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06"]);
    expect(historico.items[0].ultimo_sdf_por_modelo).toEqual({ "mock-model-s26-ultra": null, "mock-model-s27-ultra": "SDF-ultima" });
    expect(historico.items[1].ultimo_sdf_por_modelo).toEqual({});
    expect(historico.items[0].resultados["2026-10-10"]["mock-model-s26-ultra"]).toMatchObject({ execucao_id: "manual", origem: "MANUAL", sdf_id: null });
    expect(historico.items[1].caso_teste_id).toBe(semExecucao.id);
    expect(daSemana.datas).toEqual(["2026-10-04", "2026-10-03", "2026-10-02", "2026-10-01"]);
    expect(daSemana.items.map((item) => item.tc_id)).toEqual(["Clock_001"]);
    expect(porSdf.items.map((item) => item.tc_id)).toEqual(["Clock_001"]);
    expect(semSdf.items).toEqual([]);
    expect(resumo.datas[0]).toBe("2026-10-01");
    expect(resumo.resultados["2026-10-10"]["mock-model-s26-ultra"].map((item) => item.execucao_id)).toEqual(["e10", "manual"]);
    // Spec 059: o dev do time também consulta; sem a permissão, não.
    entrar("daniel.oliveira@example.com");
    expect(mockFormFactorApi.historicoProjeto(projeto.id).items).toHaveLength(2);
    const semPermissao = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    const developer = semPermissao.perfis.find((perfil: { codigo: string }) => perfil.codigo === "USUARIO_PADRAO");
    developer.permissoes = developer.permissoes.filter((permissao: string) => permissao !== "form_factor.consultar");
    localStorage.setItem(STORAGE_KEY, JSON.stringify(semPermissao));
    expect(() => mockFormFactorApi.historicoProjeto(projeto.id)).toThrow("permissão");
  });

  it("Resultados Gerais filtram pelo Assignee (spec 059)", () => {
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s26-ultra"] });
    mockCasosTesteApi.criar(projeto.id, { tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.criar(projeto.id, { tc_id: "Clock_002", category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    mockTimesApi.adicionar("mock-team-platform", "mock-user-kp");
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    database.usuarios.find((usuario: { id: string }) => usuario.id === "mock-user-dev").user_id = "daniel.oliveira";
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    entrar("kaique.pereira@example.com");

    const doDev = mockFormFactorApi.historicoProjeto(projeto.id, { responsavel: " DANIEL " });
    const ninguem = mockFormFactorApi.historicoProjeto(projeto.id, { responsavel: "ninguem-tem-esse-id" });

    expect(doDev.items.map((item) => item.tc_id)).toEqual(["Clock_002"]);
    expect(doDev.items[0].responsavel_identificador).toBe("daniel.oliveira");
    expect(ninguem.items).toEqual([]);
  });

  it("Resultados Gerais paginam os casos e mantêm as datas de todos os filtrados (spec 033)", () => {
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Clock", one_ui: "9.5", modelos_ids: ["mock-model-s26-ultra"] });
    const casos = Array.from({ length: 45 }, (_, indice) => mockCasosTesteApi.criar(projeto.id, { tc_id: `Clock_${String(45 - indice).padStart(3, "0")}`, category: "A", difficulty: "Low", situation: "New", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" }));
    const ultimo = casos[0]; // Clock_045, que cai na última página
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY)!);
    database.formFactor.push({ execucao_id: "e1", caso_teste_id: ultimo.id, tc_id: ultimo.tc_id, sdf_id: "SDF-1", modelo_dispositivo_id: "mock-model-s26-ultra", resultado: "PASS", data_reportada: new Date(2026, 9, 10, 12).toISOString(), origem: "SDF" });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));
    mockTimesApi.adicionar("mock-team-platform", "mock-user-kp");
    entrar("kaique.pereira@example.com");

    const primeira = mockFormFactorApi.historicoProjeto(projeto.id);
    const ultima = mockFormFactorApi.historicoProjeto(projeto.id, { page: 3 });
    const alem = mockFormFactorApi.historicoProjeto(projeto.id, { page: 4 });
    const de50 = mockFormFactorApi.historicoProjeto(projeto.id, { pageSize: 50 });

    expect(primeira.items.map((item) => item.tc_id)).toEqual(Array.from({ length: 20 }, (_, indice) => `Clock_${String(indice + 1).padStart(3, "0")}`));
    expect([primeira.page, primeira.page_size, primeira.total_count]).toEqual([1, 20, 45]);
    // A data só existe num caso da página 3, mas vale para todas (RN-03).
    expect(primeira.datas).toEqual(["2026-10-10"]);
    expect(ultima.items.map((item) => item.tc_id)).toEqual(["Clock_041", "Clock_042", "Clock_043", "Clock_044", "Clock_045"]);
    expect(ultima.items.at(-1)!.resultados["2026-10-10"]["mock-model-s26-ultra"].resultado).toBe("PASS");
    expect([alem.items, alem.total_count, alem.datas]).toEqual([[], 45, ["2026-10-10"]]);
    expect(de50.items).toHaveLength(45);
  });

  it("migra casos antigos: o progresso vai para status e TC Situation vira New", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.schemaVersion = 8;
    database.casosTeste = [{ id: "legado", unidade_id: database.unidade.id, projeto_id: "p", tc_id: "Clock_001", category: "A", difficulty: "Low", situation: "InReview", responsavel_id: "mock-user-dev", backup_id: null, ativo: true, created_at: null, updated_at: null }];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10); // qualquer leitura aplica a migração
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(migrado.schemaVersion).toBe(16);
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
    expect(migrado.schemaVersion).toBe(16);
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
    entrar("ivan.moreira@sidia.com");

    expect(() => mockModelosDispositivoApi.listar(1, 20)).toThrow("permissão");
    expect(() => mockModelosDispositivoApi.criar({ nome: "S28", descricao: null })).toThrow("permissão");
    const opcoes = mockModelosDispositivoApi.listarOpcoes(1, 100).items;
    expect(opcoes).not.toContainEqual(expect.objectContaining({ id: "mock-model-tab-s11" }));
    expect(opcoes).toContainEqual({ id: "mock-model-s27-ultra", nome: "S27 Ultra", descricao: "Flagship 2027" });
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
    expect(migrado.schemaVersion).toBe(16);
    const kp = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "KP");
    const gerente = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "GERENTE");
    expect(kp.permissoes).toContain("modelos_dispositivo.gerenciar");
    expect(gerente.permissoes).not.toContain("modelos_dispositivo.gerenciar");
    const admin = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "ADMIN_UNIDADE");
    expect(admin.permissoes).not.toContain("modelos_dispositivo.gerenciar");
    expect(migrado.modelosDispositivo.every((model: { descricao: unknown }) => model.descricao === null)).toBe(true);
  });

  it("migra o schema 12: libera a consulta Form Factor global para gerente e KP", () => {
    const database = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    database.schemaVersion = 12;
    database.perfis.filter((profile: { codigo: string }) => profile.codigo === "GERENTE" || profile.codigo === "KP")
      .forEach((profile: { permissoes: string[] }) => { profile.permissoes = profile.permissoes.filter((item) => item !== "form_factor.consultar"); });
    localStorage.setItem(STORAGE_KEY, JSON.stringify(database));

    mockProjetosApi.listar(1, 10);
    const migrado = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    expect(migrado.schemaVersion).toBe(16);
    const kp = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "KP");
    const gerente = migrado.perfis.find((profile: { codigo: string }) => profile.codigo === "GERENTE");
    expect(kp.permissoes).toContain("form_factor.consultar");
    expect(gerente.permissoes).toContain("form_factor.consultar");
  });
});

describe("mock do Kanban e da navegação do Board", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
    entrar("admin@sdfmanager.com");
  });

  it("agrupa os casos nas sete colunas e calcula os destinos pela posse", () => {
    mockTimesApi.adicionar("mock-team-platform", "mock-user-manager");
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Kanban", one_ui: "9.5", modelos_ids: [] });
    const base = { category: "A" as const, difficulty: "Low" as const, situation: "New" as const };
    const proprio = mockCasosTesteApi.criar(projeto.id, { ...base, tc_id: "Kanban_001", responsavel_id: "mock-user-dev", backup_id: "mock-user-kp" });
    mockCasosTesteApi.criar(projeto.id, { ...base, tc_id: "Kanban_002", responsavel_id: "mock-user-kp", backup_id: "mock-user-dev" });
    mockCasosTesteApi.criar(projeto.id, { ...base, tc_id: "Kanban_003", responsavel_id: "mock-user-kp", backup_id: "mock-user-manager" });
    mockCasosTesteApi.atualizar(proprio.id, { status: "InReview" });

    const doAdmin = mockCasosTesteApi.kanban(projeto.id);
    expect(doAdmin.colunas.map((coluna) => coluna.status)).toEqual(["To-Do", "InProgress", "InReview", "InValidation", "InFixes", "Done", "Cancelled"]);
    expect(doAdmin.colunas.map((coluna) => coluna.total)).toEqual([2, 0, 1, 0, 0, 0, 0]);
    expect(doAdmin.colunas[2].casos[0].destinos).toHaveLength(6);

    entrar("daniel.oliveira@example.com");
    const destinos = Object.fromEntries(mockCasosTesteApi.kanban(projeto.id).colunas.flatMap((coluna) => coluna.casos).map((card) => [card.tc_id, card.destinos]));
    expect(destinos.Kanban_001).toHaveLength(6);
    expect(destinos.Kanban_002).toEqual(["Cancelled"]);
    expect(destinos.Kanban_003).toEqual([]);
  });

  it("tem uma coluna para cada Status do catálogo", () => {
    expect([...ORDEM_KANBAN].sort()).toEqual([...STATUS_CASO_TESTE].sort());
  });

  it("recusa o Kanban de projeto fora do escopo", () => {
    const projeto = mockProjetosApi.criar({ time_id: "mock-team-operations", app: "Fora", one_ui: "9.5", modelos_ids: [] });
    entrar("daniel.oliveira@example.com");
    expect(() => mockCasosTesteApi.kanban(projeto.id)).toThrow();
  });

  it("monta a navegação do escopo com os projetos encerrados por último", () => {
    const ativo = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Zeta", one_ui: "9.5", modelos_ids: [] });
    const encerrado = mockProjetosApi.criar({ time_id: "mock-team-platform", app: "Alpha", one_ui: "9.5", modelos_ids: [] });
    mockProjetosApi.atualizarStatus(encerrado.id, "Completed");

    const admin = mockProjetosApi.navegacao();
    const plataforma = admin.setores.flatMap((setor) => setor.times).find((time) => time.id === "mock-team-platform");
    const ids = plataforma?.projetos.map((projeto) => projeto.id) ?? [];
    expect(ids.indexOf(ativo.id)).toBeLessThan(ids.indexOf(encerrado.id));
    expect(admin.setores.flatMap((setor) => setor.times).some((time) => time.id === "mock-team-inactive")).toBe(false);

    entrar("daniel.oliveira@example.com");
    const times = mockProjetosApi.navegacao().setores.flatMap((setor) => setor.times).map((time) => time.id);
    expect(times).toContain("mock-team-platform");
    expect(times).not.toContain("mock-team-operations");
  });
});

describe("cor do avatar no modo mock (spec 036)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
  });

  it("começa em azul e a cor salva volta no próximo login, sem mexer em outra conta", () => {
    entrar("admin@sdfmanager.com");
    expect(mockAuth.currentUser(sessionStorage.getItem("sdf.access")).cor_avatar).toBe("azul");

    expect(mockAuth.updateAvatarColor("verde")).toEqual({ idioma_preferido: "en", cor_avatar: "verde" });

    entrar("ana.souza@example.com");
    expect(mockAuth.currentUser(sessionStorage.getItem("sdf.access")).cor_avatar).toBe("azul");
    entrar("admin@sdfmanager.com");
    expect(mockAuth.currentUser(sessionStorage.getItem("sdf.access")).cor_avatar).toBe("verde");
  });

  it("numa base anterior à v20, a primeira leitura já devolve o perfil em azul e aceita a troca", () => {
    entrar("admin@sdfmanager.com");
    const antiga = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    delete antiga.corAvatarPorUsuario;
    antiga.schemaVersion = 19;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(antiga));

    expect(mockAuth.currentUser(sessionStorage.getItem("sdf.access")).cor_avatar).toBe("azul");
    expect(mockAuth.updateAvatarColor("cinza-claro").cor_avatar).toBe("cinza-claro");
  });

  it("migra uma base salva antes da spec 036 sem perder dados", () => {
    entrar("admin@sdfmanager.com");
    const antiga = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}");
    delete antiga.corAvatarPorUsuario;
    antiga.schemaVersion = 20;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(antiga));

    expect(mockAuth.currentUser(sessionStorage.getItem("sdf.access")).cor_avatar).toBe("azul");
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "{}").schemaVersion).toBe(21);
  });
});

describe("auditoria mock (spec 052)", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
  });

  it("lista só os registros da unidade, do mais recente ao mais antigo, com filtros", () => {
    entrar("admin@sdfmanager.com");

    const todos = mockAuditoriaApi.listar(1, 20);
    const formFactor = mockAuditoriaApi.listar(1, 20, { origem: "form_factor" });

    expect(todos.items.every((registro) => registro.projeto_id === "mock-project-clock")).toBe(true);
    expect(todos.items.map((registro) => registro.id)).toEqual([6, 5, 4, 3, 2]);
    expect(formFactor.items.map((registro) => registro.tc_id)).toEqual(["Clock_002"]);
  });

  it("falha: quem não é admin recebe 403", () => {
    entrar("kaique.pereira@example.com");

    expect(() => mockAuditoriaApi.listar(1, 20)).toThrow(ApiError);
  });
});

describe("mock de senha", () => {
  beforeEach(() => {
    localStorage.clear();
    sessionStorage.clear();
    resetMockDatabase();
  });

  it("admin redefine a senha de outra pessoa e recebe a senha padr�o", () => {
    entrar("admin@sdfmanager.com");

    expect(mockUsuarioApi.resetPassword("mock-user-dev")).toEqual({ senha_padrao: "tcm@123" });
  });

  it("recusa redefinir a pr�pria senha ou sem ser admin", () => {
    entrar("admin@sdfmanager.com");
    expect(() => mockUsuarioApi.resetPassword("mock-user-admin")).toThrow(ApiError);

    entrar("ivan.moreira@sidia.com");
    expect(() => mockUsuarioApi.resetPassword("mock-user-dev")).toThrow(ApiError);
  });

  it("troca da pr�pria senha mant�m a sess�o de quem est� logado", () => {
    entrar("daniel.oliveira@example.com");

    expect(mockAuth.changeOwnPassword().access_token).toBe("mock.mock-user-dev");
  });
});
