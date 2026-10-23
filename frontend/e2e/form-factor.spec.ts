import { expect, test } from "@playwright/test";

import { project, projectId, setupProjectSession } from "./projetos-fixtures";

test("importa novo relatório SDF e mantém disponíveis os resultados anteriores", async ({ page }) => {
  await setupProjectSession(page);
  const olderResult = { tc_id: "Clock_001", sdf_id: "SDF-OLD", modelo_dispositivo_id: "model-1", modelo_nome: "S27 Ultra", resultado: "PASS", data_reportada: "2026-03-22T00:00:00Z", one_ui: "9.5" };
  const newResult = { ...olderResult, sdf_id: "SDF-NEW", resultado: "FAIL", data_reportada: "2026-03-23T00:00:00Z" };
  let results = [olderResult];

  await page.route(`**/api/projetos?*`, (route) => route.fulfill({ json: { items: [project], page: 1, page_size: 10, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [], page: 1, page_size: 10, total_count: 0 } }));
  await page.route("**/api/times/team-1/membros", (route) => route.fulfill({ json: [] }));
  await page.route(`**/api/projetos/${projectId}/form-factor?*`, (route) => route.fulfill({ json: { items: results, page: 1, page_size: 10, total_count: results.length } }));
  await page.route(`**/api/projetos/${projectId}/relatorios-sdf`, async (route) => {
    expect(route.request().method()).toBe("POST");
    results = [...results, newResult];
    await route.fulfill({ json: { importacao_id: "import-2", quantidade_execucoes: 1, quantidade_resultados: 4 } });
  });

  await page.goto("/projetos");
  await page.getByRole("link", { name: "Clock 9.5" }).click();
  await page.getByRole("tab", { name: "Form Factor" }).click();
  await expect(page.getByText("SDF-OLD")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "sdf-report.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("report") });
  await page.getByRole("button", { name: "import" }).click();

  await expect(page.getByText("Relatório importado: 1 execuções e 4 resultados.")).toBeVisible();
  await expect(page.getByText("SDF-OLD")).toBeVisible();
  await expect(page.getByText("SDF-NEW")).toBeVisible();
  await expect(page.getByRole("row", { name: /SDF-NEW/ })).toContainText("FAIL");
});

test("recusa relatório fora do escopo e mantém o resultado salvo", async ({ page }) => {
  await setupProjectSession(page);
  const existing = { tc_id: "Clock_001", sdf_id: "SDF-KEEP", modelo_dispositivo_id: "model-1", modelo_nome: "S27 Ultra", resultado: "PASS", data_reportada: "2026-03-22T00:00:00Z", one_ui: "9.5" };
  await page.route(`**/api/projetos?*`, (route) => route.fulfill({ json: { items: [project], page: 1, page_size: 10, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [], page: 1, page_size: 10, total_count: 0 } }));
  await page.route("**/api/times/team-1/membros", (route) => route.fulfill({ json: [] }));
  await page.route(`**/api/projetos/${projectId}/form-factor?*`, (route) => route.fulfill({ json: { items: [existing], page: 1, page_size: 10, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}/relatorios-sdf`, (route) => route.fulfill({
    status: 403,
    contentType: "application/problem+json",
    body: JSON.stringify({ title: "Acesso negado", detail: "O projeto está fora do escopo permitido.", status: 403 }),
  }));

  await page.goto("/projetos");
  await page.getByRole("link", { name: "Clock 9.5" }).click();
  await page.getByRole("tab", { name: "Form Factor" }).click();
  await expect(page.getByText("SDF-KEEP")).toBeVisible();
  await page.locator('input[type="file"]').setInputFiles({ name: "out-of-scope.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("report") });
  await page.getByRole("button", { name: "import" }).click();

  await expect(page.getByText("O projeto está fora do escopo permitido.")).toBeVisible();
  await expect(page.getByText("SDF-KEEP")).toBeVisible();
  await expect(page.getByText("SDF-NEW")).toHaveCount(0);
});
