import { expect, test, type Page } from "@playwright/test";

import { adminEmail, adminSenha, post, senha } from "./api-fixtures";

test.setTimeout(60_000);

async function entrarPelaTela(page: Page, email: string) {
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Sign in" }).click();
}

// Cada teste cria um usuário novo, que entra com a senha inicial e cai na troca obrigatória.
async function entrarComSenhaInicial(page: Page) {
  const request = page.request;
  const admin = await post(request, "auth/login", { email: adminEmail, senha: adminSenha });
  const sufixo = crypto.randomUUID();
  const usuario = await post(request, "usuarios", { nome: `Novo ${sufixo}`, email: `novo-${sufixo}@example.com`, user_id: `NOVO-${sufixo}` }, admin.access_token);
  await page.goto("/login");
  await entrarPelaTela(page, usuario.email);
  await expect(page).toHaveURL(/\/trocar-senha$/);
  return usuario;
}

test("primeiro acesso cai na troca de senha com o visual do login", async ({ page }) => {
  await entrarComSenhaInicial(page);

  await expect(page.getByRole("heading", { name: "Create your password" })).toBeVisible();
  await expect(page.getByRole("img", { name: "TCM" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Log out" })).toBeVisible();
  await expect(page.getByText("Developed by · SDF Automation Team")).toBeVisible();
});

test("a ilustração aparece em tela larga e some no celular, sem rolagem horizontal", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await entrarComSenhaInicial(page);
  const ilustracao = page.locator("aside img:visible");
  await expect(ilustracao).toBeVisible();

  await page.setViewportSize({ width: 375, height: 812 });

  await expect(ilustracao).toBeHidden();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= document.documentElement.clientWidth)).toBe(true);
});

test("sair volta ao login, e a troca continua obrigatória no próximo acesso", async ({ page }) => {
  const usuario = await entrarComSenhaInicial(page);

  await page.getByRole("button", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);

  await entrarPelaTela(page, usuario.email);
  await expect(page).toHaveURL(/\/trocar-senha$/);
});

test("senhas iguais trocam a senha e levam ao overview", async ({ page }) => {
  await entrarComSenhaInicial(page);

  await page.getByLabel("New password", { exact: true }).fill("minha-senha-pessoal");
  await page.getByLabel("Confirm new password").fill("minha-senha-pessoal");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(page).toHaveURL(/\/overview$/);
});

test("senhas diferentes são recusadas e a tela continua", async ({ page }) => {
  await entrarComSenhaInicial(page);

  await page.getByLabel("New password", { exact: true }).fill("minha-senha-pessoal");
  await page.getByLabel("Confirm new password").fill("outra-senha");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(page.getByText("Enter the same password in both fields.")).toBeVisible();
  await expect(page).toHaveURL(/\/trocar-senha$/);
});
