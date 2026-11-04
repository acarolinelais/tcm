import { expect, test, type Page } from "@playwright/test";

import { project, projectId, setupProjectSession } from "./projetos-fixtures";
import { semTextoCortado, semTransicao, temFocoVisivel } from "./visual-helpers";

/** Spec 056: cabeçalho, botão Filter, colunas e cards do Board (CA-01, CA-03, CA-10 e CA-11), com a API simulada. */

test.use({ viewport: { width: 1920, height: 1080 } });

const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const AZUL = "rgb(0, 129, 249)"; // --accent-text do tema claro (#0081f9)
const STATUS = ["To-Do", "InProgress", "InReview", "InValidation", "InFixes", "Done", "Cancelled"];

const card = (id: string, nome: string, extra: Record<string, unknown> = {}) => ({
  id, tc_id: `Clock_${id}`, category: "A", difficulty: "Low", situation: "New",
  responsavel_id: nome, responsavel_nome: nome, responsavel_cor_avatar: "azul", destinos: ["InProgress"], ...extra,
});

const casos = ["Ana", "Bia", "Caio", "Dani", "Edu", "Fabi"].map((nome, i) => card(`00${i + 1}`, nome, { difficulty: ["Low", "Medium", "High"][i % 3] }));

async function abrirBoard(page: Page, idioma: string) {
  await setupProjectSession(page, { idioma_preferido: idioma });
  await page.route("**/api/projetos/navegacao", (route) => route.fulfill({ json: { setores: [{ id: "s1", nome: "SVP", times: [{ id: "t1", nome: "SDF Automation", membros: 11, projetos: [
    { id: projectId, nome: project.nome, status: "Created" }, { id: "project-2", nome: "Weather 9.5", status: "InProgress" },
  ] }] }] } }));
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/kanban`, (route) => route.fulfill({ json: {
    projeto_id: projectId, total: casos.length,
    colunas: STATUS.map((status) => ({ status, total: status === "To-Do" ? casos.length : 0, casos: status === "To-Do" ? casos : [] })),
  } }));
  await page.goto(`/board/${projectId}`);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("article").first()).toBeVisible({ timeout: 15_000 });
}

const paginaDoBoard = (page: Page) => page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section[1]");

for (const idioma of IDIOMAS) {
  test(`o Board mostra o cabeçalho, o Filter e as sete colunas, sem texto cortado (${idioma})`, async ({ page }) => {
    await abrirBoard(page, idioma);

    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", AZUL);
    await expect(page.getByRole("region")).toHaveCount(7);
    // Seis responsáveis: cinco avatares e o "+1".
    await expect(page.getByText("+1", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: /Clock 9\.5/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^(Filter|Filtrar|필터)$/ })).toBeVisible();
    expect(await semTextoCortado(paginaDoBoard(page))).toEqual([]);
  });
}

test("só com o teclado, o Filter abre e fecha, e o foco volta ao botão", async ({ page }) => {
  await abrirBoard(page, "en");
  await semTransicao(page);

  const filtro = page.getByRole("button", { name: "Filter" });
  await filtro.focus();
  expect(await temFocoVisivel(filtro)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Kanban filters" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(filtro).toBeFocused();
});

test("o menu e a alça de arrastar do card mostram o foco", async ({ page }) => {
  await abrirBoard(page, "en");
  await semTransicao(page);

  const menu = page.getByRole("button", { name: "Move Clock_001 to" });
  const alca = page.getByRole("button", { name: "Drag Clock_001" });
  await menu.focus();
  expect(await temFocoVisivel(menu)).toBe(true);
  await alca.focus();
  expect(await temFocoVisivel(alca)).toBe(true);
  // Discreta em repouso, mas inteira quando tem foco.
  await expect(alca).toHaveCSS("opacity", "1");
});
