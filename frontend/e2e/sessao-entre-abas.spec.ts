import { expect, test } from "@playwright/test";

import { adminEmail, adminSenha, api, post } from "./api-fixtures";

test("aba nova abre logada e, depois de sair, pede login", async ({ page, context, request }) => {
  const admin = await post(request, "auth/login", { email: adminEmail, senha: adminSenha });
  const perfil = await (await request.get(`${api}/api/auth/me`, { headers: { Authorization: `Bearer ${admin.access_token}` } })).json();
  const primeiroNome = String(perfil.nome).split(" ")[0];

  await page.goto("/login");
  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminSenha);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  const abaNova = await context.newPage();
  await abaNova.goto("/usuarios");
  await expect(abaNova).toHaveURL(/\/usuarios$/);
  const menuDoUsuario = abaNova.getByRole("banner").getByRole("button", { name: primeiroNome });
  await expect(menuDoUsuario).toBeVisible();

  await menuDoUsuario.click();
  await abaNova.getByRole("menuitem", { name: "Log out" }).click();
  await expect(abaNova).toHaveURL(/\/login$/);

  const depoisDeSair = await context.newPage();
  await depoisDeSair.goto("/usuarios");
  await expect(depoisDeSair).toHaveURL(/\/login$/);
});
