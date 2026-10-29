import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { adminEmail, adminSenha, entrarComoAdmin } from "./api-fixtures";

// Spec 033. Só entra com o administrador existente e navega: não cria dados na API.
const rotas = ["/overview", "/projetos", "/admin/usuarios", "/admin/setores", "/admin/times", "/configuracoes"];
const html = (page: Page) => page.locator("html");
const toggleTema = (page: Page) => page.getByRole("button", { name: "Dark theme" });

async function guardarTema(page: Page, valor: string) {
  await page.addInitScript((tema) => { window.localStorage.setItem("sdf.theme", tema); }, valor);
}

/** Abre a rota e espera o conteúdo trocar os skeletons. */
async function abrir(page: Page, rota: string) {
  await page.goto(rota);
  await expect(page.getByRole("heading").first()).toBeVisible();
  await expect(page.locator(".animate-pulse")).toHaveCount(0);
}

test("abre no claro mesmo com o sistema operacional em modo escuro", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/login");
  await expect(html(page)).not.toHaveClass(/dark/);
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light");
});

test("o tema escolhido no login continua depois de autenticar, sem mudar sessão nem idioma", async ({ page }) => {
  await page.goto("/login");
  await toggleTema(page).click();
  await expect(html(page)).toHaveClass(/dark/);

  await page.getByLabel("Email").fill(adminEmail);
  await page.getByLabel("Password", { exact: true }).fill(adminSenha);
  await page.getByRole("button", { name: "Sign in" }).click();
  await expect(page).toHaveURL(/\/overview$/);
  await expect(html(page)).toHaveClass(/dark/);

  await toggleTema(page).click();
  await expect(html(page)).not.toHaveClass(/dark/);
  await abrir(page, "/admin/usuarios");
  await expect(page).toHaveURL(/\/admin\/usuarios$/);
  await expect(page.getByRole("banner").getByRole("button", { name: "English" })).toBeVisible();
});

test("alterna no navbar sem recarregar a página nem perder o texto da busca", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await page.goto("/overview");
  const busca = page.getByRole("searchbox");
  await busca.fill("login");
  await page.evaluate(() => { (window as unknown as { marca: number }).marca = 1; });

  await toggleTema(page).click();

  await expect(html(page)).toHaveClass(/dark/);
  await expect(busca).toHaveValue("login");
  expect(await page.evaluate(() => (window as unknown as { marca?: number }).marca)).toBe(1);
});

test("o tema guardado é aplicado antes do React carregar", async ({ page }) => {
  await guardarTema(page, "dark");
  // Depende do servidor de desenvolvimento do Vite (playwright.config.ts), que serve o main.tsx sem empacotar.
  await page.route("**/src/main.tsx", (rota) => rota.abort());
  await page.goto("/login");
  await expect(html(page)).toHaveClass(/dark/);
  await expect(page.locator("#root")).toBeEmpty();
});

test("falha: valor guardado inválido abre no claro e o toggle continua funcionando", async ({ page }) => {
  await guardarTema(page, "roxo");
  await page.goto("/login");
  await expect(html(page)).not.toHaveClass(/dark/);
  await toggleTema(page).click();
  await expect(html(page)).toHaveClass(/dark/);
});

/** Elementos visíveis com fundo branco puro, com a cor normalizada num canvas (o Chrome pode devolver oklch). */
function superficiesBrancas(page: Page) {
  return page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    const ehBranco = (cor: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = cor;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data;
      return r === 255 && g === 255 && b === 255 && a === 255;
    };
    return [...document.querySelectorAll<HTMLElement>("body, body *")]
      .filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0 && ehBranco(getComputedStyle(el).backgroundColor))
      .map((el) => `${el.tagName.toLowerCase()}.${el.getAttribute("class") ?? ""}`.slice(0, 120));
  });
}

for (const tema of ["light", "dark"]) {
  test(`contraste AA no tema ${tema}${tema === "dark" ? ", sem superfície branca" : ""}`, async ({ request, page }) => {
    test.setTimeout(60_000);
    await guardarTema(page, tema);
    const verificar = async (rota: string) => {
      const { violations } = await new AxeBuilder({ page }).withRules(["color-contrast"]).analyze();
      expect(violations.flatMap((v) => v.nodes.map((n) => `${n.target.join(" ")} ${n.failureSummary?.split("\n").at(-1)?.trim()}`)), rota).toEqual([]);
      if (tema === "dark") expect(await superficiesBrancas(page), rota).toEqual([]);
    };
    await page.goto("/login");
    await expect(page.getByRole("button", { name: "Sign in" })).toBeVisible();
    await verificar("/login");
    await entrarComoAdmin(request, page);
    for (const rota of rotas) {
      await abrir(page, rota);
      await verificar(rota);
    }
  });
}

test("o foco do teclado no toggle é visível", async ({ page }) => {
  await page.goto("/login");
  const toggle = toggleTema(page);
  const semFoco = await toggle.evaluate((el) => getComputedStyle(el).boxShadow);
  await toggle.focus();
  await page.keyboard.press("Shift+Tab");
  await page.keyboard.press("Tab");
  await expect(toggle).toBeFocused();
  expect(await toggle.evaluate((el) => getComputedStyle(el).boxShadow)).not.toBe(semFoco);
  await page.keyboard.press("Enter");
  await expect(html(page)).toHaveClass(/dark/);
});
