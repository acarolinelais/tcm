import { expect, test, type Locator, type Page } from "@playwright/test";

import { setupProjectSession } from "./projetos-fixtures";

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

/** Sem transição, o estilo lido logo depois de tirar o foco já é o final. */
const semTransicao = (page: Page) => page.addStyleTag({ content: "*, *::before, *::after { transition: none !important; }" });

/**
 * O foco aparece: o contorno, a sombra ou a borda do elemento (ou de um dos três contêineres, onde os campos do HeroUI
 * desenham o anel) muda quando ele perde o foco. Só ter sombra não basta, porque os campos já a têm sempre.
 */
async function temFocoVisivel(elemento: Locator) {
  return elemento.evaluate((el) => {
    const assinatura = () => {
      const estilos: string[] = [];
      for (let atual: Element | null = el, nivel = 0; atual && nivel < 4; atual = atual.parentElement, nivel++) {
        const e = getComputedStyle(atual);
        estilos.push([e.outlineStyle, e.outlineWidth, e.outlineColor, e.boxShadow, e.borderColor].join("|"));
      }
      return estilos.join("||");
    };
    const focado = assinatura();
    (el as HTMLElement).blur();
    const semFoco = assinatura();
    (el as HTMLElement).focus();
    return focado !== semFoco;
  });
}

/** Textos de bloco que passam da caixa que os contém. Os inline ficam de fora: a caixa deles é o próprio texto. */
async function semTextoCortado(escopo: Locator) {
  await escopo.page().evaluate(() => document.fonts.ready);
  return escopo.evaluate((raiz) => [...raiz.querySelectorAll<HTMLElement>("h1, h2, p, label, button, a, span")]
    .filter((el) => el.children.length === 0 && el.textContent?.trim() && getComputedStyle(el).display !== "inline" && el.scrollWidth > el.clientWidth + 1)
    .map((el) => el.textContent!.trim()));
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
