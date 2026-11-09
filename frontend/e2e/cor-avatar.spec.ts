import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { prepararTimeComDev, senha } from "./api-fixtures";

// Spec 036. Cada teste usa um dev novo (prepararTimeComDev), para a cor escolhida não vazar para outras contas.
const menuDoUsuario = (page: Page) => page.getByRole("banner").getByRole("button", { name: "Dev" });
// A esfera do HeroUI de cada cor (ADR 0043): azul = blue.jpg, verde = green.jpg.
const esferaDaBarra = (page: Page) => menuDoUsuario(page).locator("img");
const grupoDeCores = (page: Page) => page.getByRole("radiogroup", { name: "Avatar color" });

async function abrirConfiguracoes(page: Page) {
  await page.goto("/configuracoes");
  await expect(grupoDeCores(page)).toBeVisible();
}

test("a cor escolhida pelo teclado vale na hora e volta no próximo login", async ({ request, page }) => {
  const { usuarios } = await prepararTimeComDev(request, page, 1);
  await abrirConfiguracoes(page);
  const avatar = esferaDaBarra(page);
  await expect(avatar).toHaveAttribute("src", /\/blue\.jpg$/);
  await expect(page.getByRole("radio", { name: "Blue" })).toBeChecked();

  // Percorre a paleta pelas setas: cada passo grava, em fila, e a última escolha é a que fica.
  const gravouVerde = page.waitForResponse((response) => response.url().endsWith("/api/auth/preferencias") && response.request().postDataJSON()?.cor_avatar === "verde");
  await page.getByRole("radio", { name: "Blue" }).focus();
  for (let i = 0; i < 5; i++) await page.keyboard.press("ArrowRight");
  expect((await gravouVerde).ok()).toBeTruthy();

  await expect(page.getByRole("radio", { name: "Green" })).toBeChecked();
  await expect(avatar).toHaveAttribute("src", /\/green\.jpg$/);

  await menuDoUsuario(page).click();
  await page.getByRole("menuitem", { name: "Log out" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await page.getByLabel("Email").fill(usuarios[0].email);
  await page.getByLabel("Password", { exact: true }).fill(senha);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).not.toHaveURL(/\/login$/);

  // Pelo menu, sem recarregar: o init script do prepararTimeComDev recolocaria a sessão encerrada no logout.
  await page.getByRole("link", { name: "Settings" }).click();
  await expect(grupoDeCores(page)).toBeVisible();
  await expect(page.getByRole("radio", { name: "Green" })).toBeChecked();
  await expect(esferaDaBarra(page)).toHaveAttribute("src", /\/green\.jpg$/);
});

test("se a gravação falha, avisa e volta para a cor salva", async ({ request, page }) => {
  await prepararTimeComDev(request, page, 1);
  await page.route("**/api/auth/preferencias", (route) => route.fulfill({ status: 500, contentType: "application/problem+json", json: { title: "Erro", status: 500 } }));
  await abrirConfiguracoes(page);

  await page.getByRole("radio", { name: "Blue" }).focus();
  await page.keyboard.press("ArrowLeft"); // da primeira cor, a seta volta para a última: cinza-claro

  await expect(page.getByText("Could not save your avatar color. Your previous color was restored.")).toBeVisible();
  await expect(page.getByRole("radio", { name: "Blue" })).toBeChecked();
  await expect(page.getByRole("radio", { name: "Light gray" })).not.toBeChecked();
  await expect(esferaDaBarra(page)).toHaveAttribute("src", /\/blue\.jpg$/);
});

test("a seção de cor não tem violações de acessibilidade", async ({ request, page }) => {
  await prepararTimeComDev(request, page, 1);
  await abrirConfiguracoes(page);

  const resultado = await new AxeBuilder({ page }).include("[role='radiogroup']").analyze();
  expect(resultado.violations).toEqual([]);
});
