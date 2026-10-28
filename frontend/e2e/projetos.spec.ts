import { expect, test } from "@playwright/test";

import { caseItem, project, projectId, setupMembrosDoTime, setupProjectSession, setupTeamsAndModels } from "./projetos-fixtures";

test("cria projeto manualmente, atribui casos e transfere um caso ao backup", async ({ page }) => {
  await setupProjectSession(page);
  await setupTeamsAndModels(page);
  let projects = [] as typeof project[];
  let cases = [] as typeof caseItem[];

  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: projects, page: 1, page_size: 10, total_count: projects.length } }));
  await page.route("**/api/projetos", async (route) => {
    if (route.request().method() === "POST") {
      projects = [project];
      await route.fulfill({ json: project });
      return;
    }
    await route.fulfill({ json: { items: projects, page: 1, page_size: 10, total_count: projects.length } });
  });
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: cases, page: 1, page_size: 10, total_count: cases.length } }));
  let createdBody: Record<string, string> = {};
  await page.route(`**/api/projetos/${projectId}/test-cases`, async (route) => {
    const body = route.request().postDataJSON();
    createdBody = body;
    cases = [{ ...caseItem, tc_id: body.tc_id, situation: body.situation, responsavel_id: body.responsavel_id, backup_id: body.backup_id }];
    await route.fulfill({ json: cases[0] });
  });
  await setupMembrosDoTime(page);
  await page.route("**/api/test-cases/case-1/transferir-para-backup", async (route) => {
    // Troca de papéis: quem transferiu vira o backup.
    cases = [{ ...cases[0], responsavel_id: "backup-1", backup_id: cases[0].responsavel_id }];
    await route.fulfill({ json: cases[0] });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByRole("tab", { name: "Manual", exact: true }).click();
  await page.getByLabel("App").fill("Clock");
  await page.getByLabel(/One UI/).fill("9.5");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Modelos de dispositivo" }).click();
  await page.getByRole("option", { name: "S27 Ultra" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await page.getByRole("link", { name: "Clock 9.5" }).click();

  await page.getByRole("button", { name: "Novo caso de teste" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ID do TC").fill("Clock_001");
  await dialog.getByLabel("Situação do TC").click();
  await page.getByRole("option", { name: "Novo passo" }).click();
  await dialog.getByLabel("Responsável", { exact: true }).click();
  await page.getByRole("option", { name: "Gerente Ana" }).click();
  await dialog.getByLabel("Backup", { exact: true }).click();
  await page.getByRole("option", { name: "Kaique Pereira" }).click();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  expect(createdBody).toMatchObject({ situation: "New Step" });
  expect(createdBody).not.toHaveProperty("status");
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("A fazer");
  await expect(page.getByRole("button", { name: /Situação do TC Clock_001/ })).toContainText("Novo passo");
  await page.getByRole("button", { name: "Transferir ao backup Clock_001" }).click();
  await page.getByRole("alertdialog", { name: "Transferir ao backup?" }).getByRole("button", { name: "Transferir ao backup" }).click();
  await expect(page.getByText("Test Case transferido para o backup.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("KP-002");
});

test("edita o Automation Level na tabela e mantém o nível depois de recarregar", async ({ page }) => {
  await setupProjectSession(page);
  let cases = [{ ...caseItem }];
  let atualizacao: Record<string, unknown> = {};

  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: cases, page: 1, page_size: 10, total_count: cases.length } }));
  await setupMembrosDoTime(page);
  await page.route("**/api/test-cases/case-1", async (route) => {
    atualizacao = route.request().postDataJSON();
    cases = [{ ...cases[0], ...atualizacao }];
    await route.fulfill({ json: cases[0] });
  });

  await page.goto(`/projetos/${projectId}`);
  const linha = page.getByRole("row", { name: /Clock_001/ });
  const nivel = linha.getByRole("button", { name: /Automation Level Clock_001/ });
  await expect(linha).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Automation Level/ })).toBeVisible();
  await expect(nivel).toContainText("—");

  await nivel.click();
  await expect(page.getByRole("option")).toHaveText(["1 – Não automatizável", "2 – Automatizável até certo ponto", "3 – 100% automatizável"]);
  await page.getByRole("option", { name: "2 – Automatizável até certo ponto" }).click();

  await expect(nivel).toContainText("2 – Automatizável até certo ponto");
  expect(atualizacao).toEqual({ automation_level: 2 });

  await page.reload();
  await expect(linha).toContainText("2 – Automatizável até certo ponto");
});
