import { expect, test, type Page } from "@playwright/test";

import { setupProjectSession } from "./projetos-fixtures";
import { semTextoCortado, semTransicao, temFocoVisivel } from "./visual-helpers";

/** Spec 055: a identidade nova do login, da Sidebar e do estado vazio (CA-01, CA-11 e CA-12), com a API simulada. */

const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const AZUL_DO_LOGIN = "rgb(0, 129, 249)"; // --auth-titulo do tema claro (#0081f9, ajuste de 2026-11-03)

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
  await expect(page.getByRole("heading", { level: 1, name: "Sign in" })).toHaveCSS("color", AZUL_DO_LOGIN);
  await expect(page.getByLabel("Email")).toBeVisible();
  await expect(page.getByLabel("Password", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
  await expect(page.locator("aside img").first()).toBeVisible();
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

test("a ilustração do login fica 56px abaixo do centro do cartão lateral, como no protótipo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await abrirLogin(page);

  for (const tema of ["claro", "escuro"]) {
    if (tema === "escuro") await page.getByRole("button", { name: "Dark theme" }).click();
    const lado = await page.locator("aside").boundingBox();
    const imagem = await page.locator("aside img").first().boundingBox();
    if (!lado || !imagem) throw new Error("ilustração fora da tela");
    const abaixo = (imagem.y + imagem.height / 2) - (lado.y + lado.height / 2);
    expect(Math.abs(abaixo - 56), `${tema}: ${abaixo}`).toBeLessThanOrEqual(2);
  }
});

test("o login usa as cores do protótipo no tema claro e no escuro (ajuste de 2026-11-03)", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await abrirLogin(page);
  await semTransicao(page);

  const titulo = page.getByRole("heading", { level: 1, name: "Sign in" });
  const cartao = titulo.locator("xpath=ancestor::section[1]");
  const dica = page.getByText("Use your Samsung Corp account.");
  const rotulo = page.getByText("Email", { exact: true });
  const campo = page.getByLabel("Email");
  const olho = page.getByRole("button", { name: "Show password" });
  const idioma = page.getByRole("button", { name: /English/ });
  const botao = page.getByRole("button", { name: "Sign in" });
  const pagina = page.locator("main");
  const cor = (alvo: typeof titulo, propriedade: string) => alvo.evaluate((el, prop) => getComputedStyle(el).getPropertyValue(prop), propriedade);

  // Claro
  expect(await cor(titulo, "color")).toBe("rgb(0, 129, 249)");
  expect(await cor(dica, "color")).toBe("rgb(126, 126, 126)");
  expect(await cor(rotulo, "color")).toBe("rgb(69, 68, 66)");
  expect(await cor(cartao, "background-color")).toBe("rgb(255, 255, 255)");
  expect(await cor(cartao, "border-top-color")).toBe("rgb(242, 242, 242)");
  expect(await cor(campo, "background-color")).toBe("rgb(255, 255, 255)");
  expect(await cor(campo, "border-top-color")).toBe("rgb(242, 242, 242)");
  expect(await cor(olho, "color")).toBe("rgb(126, 126, 126)");
  expect(await cor(idioma, "color")).toBe("rgb(69, 68, 66)");
  expect(await cor(botao, "background-color")).toBe("rgb(0, 129, 249)");
  expect(await cor(botao, "color")).toBe("rgb(255, 255, 255)");
  expect(await cor(pagina, "background-color")).toBe("rgb(251, 251, 251)");
  // O fundo da ilustração é uma imagem pronta, com o vidro do Figma assado, e não um filtro caro em tempo de execução.
  const camadaClara = page.locator("aside > div[aria-hidden=\"true\"]").first();
  expect(await cor(camadaClara, "background-image")).toContain(".webp");
  expect(await cor(camadaClara, "backdrop-filter")).toBe("none");

  // Escuro
  await page.getByRole("button", { name: "Dark theme" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  // As cores passam aos poucos por 450ms (spec 049); só se lê o valor final depois que a troca termina.
  await expect(page.locator("html")).not.toHaveClass(/trocando-tema/);
  expect(await cor(titulo, "color")).toBe("rgb(12, 138, 255)");
  expect(await cor(dica, "color")).toBe("rgb(181, 181, 181)");
  expect(await cor(rotulo, "color")).toBe("rgb(255, 255, 255)");
  expect(await cor(cartao, "background-color")).toBe("rgb(15, 15, 15)");
  expect(await cor(cartao, "border-top-color")).toBe("rgb(27, 27, 27)");
  expect(await cor(campo, "background-color")).toBe("rgb(27, 27, 27)");
  expect(await cor(campo, "border-top-color")).toBe("rgb(38, 38, 38)");
  expect(await cor(olho, "color")).toBe("rgb(181, 181, 181)");
  expect(await cor(idioma, "color")).toBe("rgb(181, 181, 181)");
  expect(await cor(botao, "background-color")).toBe("rgb(12, 138, 255)");
  expect(await cor(botao, "color")).toBe("rgb(255, 255, 255)");
  expect(await cor(pagina, "background-color")).toBe("rgb(0, 0, 0)");
});

test("na troca de tema, as ilustrações e o fundo do login se dissolvem aos poucos, e não pulam", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await abrirLogin(page);
  const claro = page.locator("aside img").first();
  const escuro = page.locator("aside img").nth(1);
  const camadaClara = page.locator("aside > div[aria-hidden='true']").first();
  const camadaEscura = page.locator("aside > div[aria-hidden='true']").nth(1);
  const opacidade = (alvo: typeof claro) => alvo.evaluate((el) => Number(getComputedStyle(el).opacity));

  // Em repouso, a camada que não é do tema fica com 1%: não some por completo, para o navegador mantê-la desenhada.
  expect(await opacidade(claro)).toBe(1);
  expect(await opacidade(escuro)).toBeCloseTo(0.01, 2);
  expect(await opacidade(camadaEscura)).toBeCloseTo(0.01, 2);

  // Amostra a opacidade quadro a quadro dentro da página, que é a única medida confiável aqui.
  const curva = await page.evaluate(() => new Promise<{ escuro: number[]; camada: number[] }>((resolver) => {
    const ilustracao = document.querySelectorAll("aside img")[1];
    const camada = document.querySelectorAll("aside > div[aria-hidden='true']")[1];
    const escuro: number[] = [];
    const camadaOpacidades: number[] = [];
    const inicio = performance.now();
    (document.querySelector("button[aria-label='Dark theme']") as HTMLButtonElement).click();
    const passo = () => {
      escuro.push(Number(getComputedStyle(ilustracao).opacity));
      camadaOpacidades.push(Number(getComputedStyle(camada).opacity));
      if (performance.now() - inicio < 900) requestAnimationFrame(passo);
      else resolver({ escuro, camada: camadaOpacidades });
    };
    requestAnimationFrame(passo);
  }));
  for (const [nome, valores] of [["ilustração escura", curva.escuro], ["fundo escuro", curva.camada]] as const) {
    expect(valores.some((v) => v > 0.1 && v < 0.9), `${nome}: passou por valores intermediários`).toBe(true);
    expect(valores.at(-1), nome).toBe(1);
  }
  expect(await opacidade(claro)).toBeCloseTo(0.01, 2);
  // No escuro, só uma camada de fundo fica opaca: com a clara também opaca por baixo, o branco dela vaza como uma
  // linha clara na borda curva do cartão (anti-aliasing duplo).
  expect(await opacidade(camadaClara)).toBeCloseTo(0.01, 2);
  expect(await opacidade(camadaEscura)).toBe(1);
});

test("a troca de tema no login não congela a tela: nenhum quadro demora mais que 250ms", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1024 });
  await abrirLogin(page);

  // Era o caso do fundo em SVG com desfoques enormes: a primeira troca ficava quase meio segundo sem desenhar um quadro.
  const maiorLacuna = await page.evaluate(() => new Promise<number>((resolver) => {
    const instantes: number[] = [];
    const inicio = performance.now();
    (document.querySelector("button[aria-label='Dark theme']") as HTMLButtonElement).click();
    const passo = () => {
      instantes.push(performance.now());
      if (performance.now() - inicio < 1000) requestAnimationFrame(passo);
      else resolver(Math.max(...instantes.slice(1).map((t, i) => t - instantes[i])));
    };
    requestAnimationFrame(passo);
  }));
  expect(maiorLacuna).toBeLessThan(250);
});
