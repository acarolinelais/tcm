import { expect, test } from "@playwright/test";

import { prepararTimeComDev } from "./api-fixtures";

test.setTimeout(60_000);

test("dev vê o próprio time e abre a visão geral pelo botão de ação", async ({ request, page }) => {
  const { time, setor, usuarios: [devUsuario, colega] } = await prepararTimeComDev(request, page, 2);
  await page.goto("/times");

  const linha = page.getByRole("row", { name: new RegExp(time.nome) });
  await expect(linha).toContainText(setor.nome);
  await expect(linha).toContainText("Active");
  // O dev só visualiza: sem gerenciar membros nem inativar.
  await expect(page.getByRole("button", { name: `Manage members ${time.nome}` })).toHaveCount(0);
  await expect(page.getByRole("button", { name: `Deactivate ${time.nome}` })).toHaveCount(0);
  await page.getByRole("button", { name: `View team ${time.nome}` }).click();

  await expect(page).toHaveURL(new RegExp(`/times/${time.id}$`));
  await expect(page.getByText("Team overview")).toBeVisible();
  await expect(page.getByRole("heading", { name: time.nome })).toBeVisible();
  await expect(page.getByText("2 team members")).toBeVisible();
  await expect(page.getByRole("row", { name: devUsuario.nome })).toBeVisible();
  await expect(page.getByRole("row", { name: colega.nome })).toBeVisible();
  await expect(page.getByRole("button", { name: "Add a team member" })).toHaveCount(0);
});

test("dev que abre o endereço de um time de que não participa vê 'time não encontrado'", async ({ request, page }) => {
  await prepararTimeComDev(request, page, 2);
  await page.goto(`/times/${crypto.randomUUID()}`);
  await expect(page.getByRole("alert")).toHaveText("Team not found or you do not have access.");
});
