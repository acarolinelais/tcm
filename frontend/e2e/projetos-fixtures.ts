import type { Page } from "@playwright/test";

export const managerId = "manager-1";
export const teamId = "team-1";
export const projectId = "project-1";
export const modelId = "model-1";

export const project = {
  id: projectId,
  unidade_id: "unit-1",
  time_id: teamId,
  nome: "Clock 9.5",
  modelos_dispositivo: ["S27 Ultra"],
  app: "Clock",
  one_ui: "9.5",
  status: "Created",
  ativo: true,
  created_at: "2026-03-23T10:00:00Z",
  updated_at: "2026-03-23T10:00:00Z",
};

export const caseItem = {
  id: "case-1",
  unidade_id: "unit-1",
  projeto_id: projectId,
  tc_id: "Clock_001",
  category: "A",
  difficulty: "Low",
  situation: "New",
  status: "To-Do",
  responsavel_id: managerId,
  backup_id: "backup-1",
  ativo: true,
  created_at: "2026-03-23T10:00:00Z",
  updated_at: "2026-03-23T10:00:00Z",
};

/** Sessão autenticada; `perfil` sobrescreve campos do perfil padrão (administrador). */
export async function setupProjectSession(page: Page, perfil: Record<string, unknown> = {}) {
  await page.addInitScript(() => sessionStorage.setItem("sdf.access", "e2e-project-token"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: {
    id: managerId,
    nome: "Gerente Ana",
    email: "ana@example.com",
    unidade_id: "unit-1",
    unidade_nome: "Unidade de teste",
    perfil_codigo: "ADMIN_UNIDADE",
    perfil: "Administrador",
    permissoes: ["projetos.consultar", "projetos.gerenciar", "test_cases.consultar", "test_cases.gerenciar", "form_factor.consultar", "form_factor.importar"],
    times: [],
    setores_gerenciados: [],
    time_atual_id: null,
    tem_multiplos_times: false,
    senha_alteracao_obrigatoria: false,
    idioma_preferido: "pt-BR",
    ...perfil,
  } }));
}

export async function setupTeams(page: Page) {
  await page.route("**/api/times?*", (route) => route.fulfill({ json: {
    items: [{ id: teamId, setor_id: "sector-1", nome: "Plataforma", ativo: true }], page: 1, page_size: 100, total_count: 1,
  } }));
}

export async function setupTeamsAndModels(page: Page) {
  await setupTeams(page);
  await page.route("**/api/modelos-dispositivo/opcoes?*", (route) => route.fulfill({ json: {
    items: [{ id: modelId, nome: "S27 Ultra", descricao: null }], page: 1, page_size: 100, total_count: 1,
  } }));
}
