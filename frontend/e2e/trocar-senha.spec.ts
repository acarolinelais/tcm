import { expect, test, type Page } from "@playwright/test";

import { adminEmail, adminSenha, api, post, senha } from "./api-fixtures";

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
  // As duas ilustrações (clara e escura) ocupam o mesmo lugar; a que não é do tema atual só está transparente.
  const ilustracao = page.locator("aside img").first();
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

async function entrarComSenhaPropria(page: Page, senhaPropria: string) {
  const usuario = await entrarComSenhaInicial(page);
  await page.getByLabel("New password", { exact: true }).fill(senhaPropria);
  await page.getByLabel("Confirm new password").fill(senhaPropria);
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  return usuario;
}

async function abrirMenuDaConta(page: Page) {
  // O botão do menu tem o primeiro nome da pessoa como nome acessível (os usuários de teste se chamam "Novo ...").
  await page.getByRole("button", { name: "Novo", exact: true }).click();
}

test("troca a própria senha em Configurações e a senha antiga deixa de entrar", async ({ page }) => {
  const usuario = await entrarComSenhaPropria(page, "senha-um");

  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill("senha-um");
  await page.getByLabel("New password", { exact: true }).fill("senha-dois");
  await page.getByLabel("Confirm new password").fill("senha-dois");
  await page.getByRole("button", { name: "Save password" }).click();
  await expect(page.getByText("Password changed.")).toBeVisible();

  await abrirMenuDaConta(page);
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await page.getByLabel("Email").fill(usuario.email);
  await page.getByLabel("Password", { exact: true }).fill("senha-um");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page.getByText("Invalid email or password.")).toBeVisible();

  await page.getByLabel("Password", { exact: true }).fill("senha-dois");
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
});

test("senha atual errada em Configurações é recusada e o painel continua aberto", async ({ page }) => {
  await entrarComSenhaPropria(page, "senha-um");

  await page.goto("/configuracoes");
  await page.getByRole("button", { name: "Change password" }).click();
  await page.getByLabel("Current password").fill("errada");
  await page.getByLabel("New password", { exact: true }).fill("senha-dois");
  await page.getByLabel("Confirm new password").fill("senha-dois");
  await page.getByRole("button", { name: "Save password" }).click();

  await expect(page.getByText("The current password is incorrect.")).toBeVisible();
  await expect(page.getByRole("heading", { name: "Change password" })).toBeVisible();
});

test("depois que o admin redefine, a pessoa entra com a senha padrão e cai na troca obrigatória", async ({ page }) => {
  const usuario = await entrarComSenhaPropria(page, "senha-um");
  const admin = await post(page.request, "auth/login", { email: adminEmail, senha: adminSenha });
  const resposta = await page.request.patch(`${api}/api/usuarios/${usuario.id}/redefinir-senha`, { headers: { Authorization: `Bearer ${admin.access_token}` } });
  expect(await resposta.json()).toEqual({ senha_padrao: senha });

  await page.goto("/login");
  await entrarPelaTela(page, usuario.email);

  await expect(page).toHaveURL(/\/trocar-senha$/);
});
