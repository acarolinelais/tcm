import { expect, test } from "@playwright/test";
import * as XLSX from "@e965/xlsx";

import { project, setupProjectSession, setupTeamsAndModels } from "./projetos-fixtures";

function planilhaValida() {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([
    ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"],
    ["Clock", "Clock_001", "Low", "A", "To-Do", "9.5", "Gerente Ana", "Kaique Pereira"],
    ["", "Clock_002", "Medium", "B", "InProgress", "", "Gerente Ana", "Kaique Pereira"],
  ]), "Cases");
  return Buffer.from(XLSX.write(workbook, { type: "array", bookType: "xlsx" }));
}

test.beforeEach(async ({ page }) => {
  await setupProjectSession(page);
  await setupTeamsAndModels(page);
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 10, total_count: 0 } }));
});

test("importa planilha e informa o número de Test Cases criados", async ({ page }) => {
  await page.route("**/api/projetos/importar", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
    await route.fulfill({ json: { projeto: project, quantidade_casos: 2 } });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "clock.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: planilhaValida() });
  await expect(page.getByRole("region", { name: "Prévia dos Test Cases" })).toContainText("Clock_002");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page.getByText("Clock 9.5 importado com 2 casos de teste.")).toBeVisible();
});

test("mostra erro por linha e não cria projeto quando a planilha é inválida", async ({ page }) => {
  let submitted = false;
  await page.route("**/api/projetos/importar", async (route) => {
    submitted = true;
    await route.fulfill({
      status: 422,
      contentType: "application/problem+json",
      body: JSON.stringify({ title: "Planilha inválida", status: 422, errors: [{ campo: "linha.3.tc_id", mensagem: "TC ID já cadastrado no projeto." }] }),
    });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles({ name: "invalid.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: planilhaValida() });
  await expect(page.getByRole("region", { name: "Prévia dos Test Cases" })).toContainText("Clock_002");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await expect(page.getByRole("button", { name: "Criar projeto" })).toBeEnabled();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page.getByRole("alert")).toContainText("linha.3.tc_id: TC ID já cadastrado no projeto.");
  expect(submitted).toBe(true);
  await expect(page.getByRole("heading", { name: "Meus projetos" })).toHaveCount(0);
});
