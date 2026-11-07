import { expect, test } from "@playwright/test";

import { setupProjectSession } from "./projetos-fixtures";

// Spec 048, com a API simulada: os guias são estáticos, só a sessão vem da API.
test("o dev vê Ciclo de Status em destaque e abre o guia pela lista", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", permissoes: [], idioma_preferido: "en" });
  await page.goto("/overview");
  await page.getByRole("link", { name: "Documentation" }).click();

  const destaques = page.getByRole("region", { name: "For your role" });
  await expect(destaques.getByRole("link").first()).toContainText("Test Case status cycle", { timeout: 15_000 });
  await destaques.getByRole("link", { name: /Test Case status cycle/ }).click();
  await expect(page).toHaveURL(/\/documentation\/status-cycle$/);
  await expect(page.getByRole("heading", { level: 1, name: "Test Case status cycle" })).toBeVisible();
});

test("o endereço de um guia abre o guia direto, e um endereço inexistente leva de volta à lista", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "KP", perfil: "Key Person", permissoes: [], idioma_preferido: "en" });
  await page.goto("/documentation/import-spreadsheet");
  await expect(page.getByRole("heading", { level: 1, name: "Import a project from a spreadsheet" })).toBeVisible({ timeout: 15_000 });

  await page.goto("/documentation/nao-existe");
  await expect(page.getByRole("heading", { level: 1, name: "Guide not found" })).toBeVisible();
  await page.getByRole("link", { name: "See all guides" }).click();
  await expect(page).toHaveURL(/\/documentation$/);
});

test("o guia com slides baixa o PDF", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: [], idioma_preferido: "en" });
  await page.goto("/documentation/status-cycle");
  const download = page.waitForEvent("download");
  await page.getByRole("link", { name: "Download slides (PDF)" }).click({ timeout: 15_000 });
  expect((await download).suggestedFilename()).toBe("status-cycle.pdf");
});
