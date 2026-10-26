import { expect, test, type Page } from "@playwright/test";

import { caseItem, managerId, modelId, project, projectId, setupProjectSession } from "./projetos-fixtures";

const s26Id = "model-2";
const modelos = [{ id: s26Id, nome: "S26 Ultra" }, { id: modelId, nome: "S27 Ultra" }];
const membros = [
  { id: "m1", time_id: "team-1", usuario_id: managerId, usuario_nome: "Gerente Ana", usuario_user_id: "ana.id", usuario_perfil: "Gerente", usuario_perfil_codigo: "GERENTE", ativo: true },
  { id: "m2", time_id: "team-1", usuario_id: "dev-1", usuario_nome: "Bia Dev", usuario_user_id: "bia.id", usuario_perfil: "Developer", usuario_perfil_codigo: "USUARIO_PADRAO", ativo: true },
];

/** Rotas comuns da tela de projeto; `formFactor` recebe os query params para responder como a API. */
async function rotasDoProjeto(page: Page, formFactor: (params: URLSearchParams) => unknown) {
  await page.route(`**/api/projetos?*`, (route) => route.fulfill({ json: { items: [project], page: 1, page_size: 10, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [], page: 1, page_size: 10, total_count: 0 } }));
  await page.route("**/api/times/team-1/membros", (route) => route.fulfill({ json: membros }));
  await page.route(`**/api/projetos/${projectId}/form-factor?*`, (route) => route.fulfill({ json: formFactor(new URL(route.request().url()).searchParams) }));
}

async function abrirFormFactor(page: Page) {
  await page.goto("/projetos");
  await page.getByRole("link", { name: "Clock 9.5" }).click();
  await page.getByRole("tab", { name: "Form Factor" }).click();
}

test("mostra a matriz por modelo, troca pelo resultado mais recente após importar e filtra por responsável", async ({ page }) => {
  await setupProjectSession(page);
  const casoAna = { caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: managerId, sdf_id: "SDF-OLD", data_reportada: "2026-03-22T00:00:00Z", resultados: { [modelId]: "Pass", [s26Id]: "Fail" } };
  const casoBia = { caso_teste_id: "case-2", tc_id: "Clock_002", responsavel_id: "dev-1", sdf_id: null, data_reportada: null, resultados: {} };
  let linhas = [casoAna, casoBia];
  await rotasDoProjeto(page, (params) => {
    const items = linhas.filter((linha) => !params.get("responsavel_id") || linha.responsavel_id === params.get("responsavel_id"));
    return { modelos, items, page: 1, page_size: 20, total_count: items.length };
  });
  await page.route(`**/api/projetos/${projectId}/relatorios-sdf`, async (route) => {
    expect(route.request().method()).toBe("POST");
    linhas = [{ ...casoAna, sdf_id: "SDF-NEW", data_reportada: "2026-03-23T00:00:00Z", resultados: { [modelId]: "Fail", [s26Id]: "Fail" } }, casoBia];
    await route.fulfill({ json: { importacao_id: "import-2", quantidade_execucoes: 1, quantidade_resultados: 2 } });
  });

  await abrirFormFactor(page);
  await expect(page.getByRole("columnheader", { name: "S26 Ultra" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "S27 Ultra" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /One UI/ })).toHaveCount(0);
  await expect(page.getByRole("row", { name: /Clock_001/ })).toHaveCount(1);
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("SDF-OLD");
  await expect(page.getByRole("row", { name: /Clock_001/ }).getByRole("cell").nth(4)).toHaveText("Fail");
  await expect(page.getByRole("row", { name: /Clock_001/ }).getByRole("cell").nth(5)).toHaveText("Pass");
  await expect(page.getByRole("row", { name: /Clock_002/ })).toContainText("bia.id");

  await page.locator('input[type="file"]').setInputFiles({ name: "sdf-report.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("report") });
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.getByText("Relatório importado: 1 execuções e 2 resultados.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("SDF-NEW");
  await expect(page.getByRole("row", { name: /Clock_001/ }).getByRole("cell").nth(5)).toHaveText("Fail");

  await page.getByRole("button", { name: /Filtrar por Responsável/ }).click();
  await page.getByRole("menuitemradio", { name: "bia.id" }).click();
  await expect(page.getByRole("row", { name: /Clock_002/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toHaveCount(0);
});

test("recusa relatório fora do escopo e mantém o resultado exibido", async ({ page }) => {
  await setupProjectSession(page);
  const existente = { caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_id: managerId, sdf_id: "SDF-KEEP", data_reportada: "2026-03-22T00:00:00Z", resultados: { [modelId]: "Pass" } };
  await rotasDoProjeto(page, () => ({ modelos, items: [existente], page: 1, page_size: 20, total_count: 1 }));
  await page.route(`**/api/projetos/${projectId}/relatorios-sdf`, (route) => route.fulfill({
    status: 403,
    contentType: "application/problem+json",
    body: JSON.stringify({ title: "Acesso negado", detail: "O projeto está fora do escopo permitido.", status: 403 }),
  }));

  await abrirFormFactor(page);
  await expect(page.getByText("SDF-KEEP")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "out-of-scope.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("report") });
  await page.getByRole("button", { name: "Importar", exact: true }).click();

  await expect(page.getByText("O projeto está fora do escopo permitido.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("SDF-KEEP");
});

test("cria rodada com SDF ID e registra o resultado pela linha do Resumo", async ({ page }) => {
  await setupProjectSession(page, { permissoes: ["projetos.consultar", "test_cases.consultar", "form_factor.consultar", "form_factor.registrar"] });
  const elegivel = { ...caseItem, status: "InValidation" };
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [elegivel], page: 1, page_size: 10, total_count: 1 } }));
  const roundId = "round-1";
  const linhaResumo = { caso_teste_id: elegivel.id, tc_id: elegivel.tc_id, responsavel_id: elegivel.responsavel_id, backup_id: elegivel.backup_id, sdf_id: null, data_reportada: null, resultados: {} };
  let rodadaPendente: string | null = null;
  let emValidacao = true;
  await rotasDoProjeto(page, () => {
    const items = emValidacao ? [{ ...linhaResumo, rodada_pendente_id: rodadaPendente }] : [];
    return { modelos: [modelos[0]], items, page: 1, page_size: 20, total_count: items.length };
  });
  await page.route(`**/api/projetos/${projectId}/form-factor/rodadas`, async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().postDataJSON()).toEqual({ sdf_id: "SDF-ROUND-1" });
    rodadaPendente = roundId;
    await route.fulfill({ json: { id: roundId, projeto_id: projectId, sdf_id: "SDF-ROUND-1", created_at: "2026-10-25T10:00:00Z", total_test_cases: 1 } });
  });
  await page.route(`**/api/projetos/${projectId}/form-factor/rodadas/${roundId}/test-cases/${elegivel.id}/resultados`, async (route) => {
    expect(route.request().postDataJSON()).toEqual({ resultados: { [s26Id]: "FAIL" } });
    // FAIL leva o TC para In Fixes: ele sai do Resumo, que só lista In Validation.
    emValidacao = false;
    await route.fulfill({ json: { execucao_id: "execution-1", caso_teste_id: elegivel.id, tc_id: elegivel.tc_id, responsavel_id: elegivel.responsavel_id, sdf_id: "SDF-ROUND-1", data_reportada: "2026-10-25T10:00:00Z", origem: "MANUAL", resultados: { [s26Id]: "FAIL" }, rodada_id: roundId, resultados_registrados: true } });
  });

  await abrirFormFactor(page);
  await expect(page.getByText("Test Cases elegíveis")).toHaveCount(0);
  const linha = page.getByRole("row", { name: /Clock_001/ });
  await expect(linha).toBeVisible();
  await expect(linha.getByRole("button", { name: "Ações para Clock_001" })).toHaveCount(0);
  await page.getByRole("button", { name: "Criar rodada de testes" }).click();
  await page.getByRole("textbox", { name: "ID do SDF" }).fill("SDF-ROUND-1");
  await page.getByRole("button", { name: "Criar rodada de testes" }).last().click();
  const acoes = linha.getByRole("button", { name: "Ações para Clock_001" });
  await acoes.focus();
  await acoes.press("Enter");
  await page.getByRole("menuitem", { name: "Registrar resultado" }).click();
  await page.getByRole("combobox", { name: "Resultado para S26 Ultra" }).click();
  await page.getByRole("option", { name: "FAIL" }).click();
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Resultados registrados.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toHaveCount(0);
});
