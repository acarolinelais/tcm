import { expect, test, type Page } from "@playwright/test";

import { setupProjectSession } from "./projetos-fixtures";
import { semTextoCortado, semTransicao, temFocoVisivel } from "./visual-helpers";

/** Spec 055: a identidade nova do login, da Sidebar e do estado vazio (CA-01, CA-11 e CA-12), com a API simulada. */

const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const AZUL = "rgb(0, 108, 209)"; // --accent-text do tema claro (#006cd1)

async function abrirLogin(page: Page, idioma = "en") {
  await page.addInitScript((valor) => window.sessionStorage.setItem("sdf.pendingLocale", valor), idioma);
  await page.goto("/login");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
}

async function abrirProjetosVazio(page: Page, idioma: string) {
  await setupProjectSession(page, { idioma_preferido: idioma });
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 20, total_count: 0 } }));
  await page.goto("/projetos");
  await expect(page.getByRole("heading", { level: 2 })).toBeVisible({ timeout: 15_000 });
}

test("o login mostra o logotipo, o título azul, os campos e o botão do protótipo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await abrirLogin(page);

  const logo = page.getByRole("img", { name: "TCM" });
  await expect(logo).toBeVisible();
  expect(await logo.evaluate((img) => (img as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toHaveCSS("color", AZUL);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("aside img:visible")).toBeVisible();
});

test("só com o teclado, cada controle do login mostra o foco", async ({ page }) => {
  await abrirLogin(page);
  await semTransicao(page);
  await page.locator("body").click({ position: { x: 5, y: 5 } });

  for (let i = 0; i < 6; i++) {
    await page.keyboard.press("Tab");
    const focado = page.locator(":focus-visible");
    await expect(focado, `controle ${i + 1}`).toBeVisible();
    expect(await temFocoVisivel(focado), `controle ${i + 1} sem foco visível`).toBe(true);
  }
});

test("só com o teclado, cada item da Sidebar mostra o foco", async ({ page }) => {
  await abrirProjetosVazio(page, "en");
  await semTransicao(page);
  await page.getByRole("link", { name: "Overview" }).focus();

  let conferidos = 0;
  for (let i = 0; i < 5; i++) {
    await page.keyboard.press("Tab");
    const focado = page.locator("aside :focus-visible");
    if (!(await focado.count())) break;
    expect(await temFocoVisivel(focado), `item ${i + 1} da Sidebar sem foco visível`).toBe(true);
    conferidos++;
  }
  expect(conferidos).toBeGreaterThan(2);
});

for (const idioma of IDIOMAS) {
  test(`o login não corta texto (${idioma})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrirLogin(page, idioma);
    expect(await semTextoCortado(page.locator("main"))).toEqual([]);
  });

  test(`a Sidebar e o estado vazio não cortam texto (${idioma})`, async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await abrirProjetosVazio(page, idioma);
    expect(await semTextoCortado(page.locator("aside"))).toEqual([]);
    expect(await semTextoCortado(page.getByRole("heading", { level: 2 }).locator("xpath=.."))).toEqual([]);
  });
}
