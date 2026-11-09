import { expect, test, type Page } from "@playwright/test";

import { semTextoCortado, semTransicao, temFocoVisivel } from "./visual-helpers";

/** Spec 058: as abas de Projects, a Origem "Spreadsheet" e o histórico de execuções (CA-04, CA-05, CA-10 e CA-11), com a API simulada. */

test.use({ viewport: { width: 1440, height: 1024 } });

const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const projeto = { id: "project-1", unidade_id: "unit-1", time_id: "team-1", nome: "Clock 9.5", app: "Clock", one_ui: "9.5", status: "Created", ativo: true, modelos_dispositivo: [], created_at: null, updated_at: null };
const caso = (n: number, status: string, dificuldade: string) => ({
  id: `case-${n}`, unidade_id: "unit-1", projeto_id: "project-1", tc_id: `Clock_00000${n}`, category: "A", difficulty: dificuldade, automation_level: null,
  situation: "New", status, responsavel_id: "u1", backup_id: "u2", data_final: "2026-03-23", ativo: true, created_at: "2026-03-23T10:00:00Z", updated_at: "2026-03-23T10:00:00Z",
});
const modelos = [{ id: "m1", nome: "S25 Ultra" }, { id: "m2", nome: "Fold 8 Ultra" }, { id: "m3", nome: "Tab S11" }, { id: "m4", nome: "Fold 8" }];
const execucao = (n: number, origem: "MANUAL" | "SDF", resultado: string) => ({
  execucao_id: `run-${n}`, caso_teste_id: `case-${n}`, tc_id: `Clock_00000${n}`, responsavel_id: "u1", sdf_id: origem === "SDF" ? "12345-67890" : null,
  data_reportada: "2026-03-23T10:00:00Z", origem, resultados: { m1: resultado, m2: resultado, m3: resultado, m4: resultado },
});

async function abrirProjeto(page: Page, idioma: string) {
  await page.addInitScript(() => sessionStorage.setItem("sdf.access", "e2e-projetos-visual"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: {
    id: "u1", nome: "Caroline", email: "c@example.com", unidade_id: "unit-1", unidade_nome: "Unidade", perfil_codigo: "USUARIO_PADRAO", perfil: "Developer",
    permissoes: ["projetos.consultar", "test_cases.consultar", "form_factor.consultar", "form_factor.registrar"], times: [], setores_gerenciados: [],
    time_atual_id: "team-1", tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: idioma,
  } }));
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [projeto], page: 1, page_size: 100, total_count: 1 } }));
  await page.route("**/api/projetos/project-1", (route) => route.fulfill({ json: projeto }));
  await page.route("**/api/projetos/project-1/test-cases?*", (route) => route.fulfill({ json: { items: [caso(1, "To-Do", "High"), caso(2, "InProgress", "Low")], page: 1, page_size: 20, total_count: 2 } }));
  await page.route("**/api/times/team-1/membros", (route) => route.fulfill({ json: [
    { id: "m1", time_id: "team-1", usuario_id: "u1", usuario_nome: "Caroline Laís", usuario_user_id: "caroline.silva", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
    { id: "m2", time_id: "team-1", usuario_id: "u2", usuario_nome: "Raquel", usuario_user_id: "raquel.batista", usuario_perfil: "Developer", usuario_perfil_codigo: null, ativo: true },
  ] }));
  await page.route("**/api/projetos/project-1/form-factor?*", (route) => route.fulfill({ json: { modelos, items: [], casos_elegiveis: [], page: 1, page_size: 20, total_count: 0 } }));
  await page.route("**/api/projetos/project-1/form-factor/results?*", (route) => route.fulfill({ json: {
    modelos, page: 1, page_size: 20, total_count: 2, items: [execucao(1, "MANUAL", "PASS"), execucao(2, "SDF", "FAIL")],
  } }));
  await page.route("**/api/form-factor/general/casos/*/execucoes?*", (route) => route.fulfill({ json: {
    caso_teste_id: "case-2", tc_id: "Clock_000002", responsavel_identificador: "caroline.silva", modelos, datas: ["2026-03-22", "2026-03-23"],
    resultados: { "2026-03-23": { m1: [{ execucao_id: "b", resultado: "FAIL", sdf_id: "12345-67890", origem: "SDF" }] } },
  } }));
  await page.goto("/projetos/project-1");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("row", { name: /Clock_000001/ })).toBeVisible({ timeout: 15_000 });
}

/** Abre a aba Form Factor na visão Results (a primeira do seletor, em qualquer idioma). */
async function abrirResultados(page: Page) {
  await page.getByRole("tab").nth(1).click();
  await page.getByRole("radio").first().click();
  await expect(page.getByRole("row", { name: /Clock_000002/ })).toBeVisible();
  // A tabela recria as linhas quando os membros do time chegam; sem esperar, o foco dado por script se perde.
  await page.waitForLoadState("networkidle");
}

const paginaDoProjeto = (page: Page) => page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section[1]");

for (const idioma of IDIOMAS) {
  test(`as duas abas e o painel de histórico não cortam texto (${idioma})`, async ({ page }) => {
    await abrirProjeto(page, idioma);
    expect(await semTextoCortado(paginaDoProjeto(page)), "aba Test Cases").toEqual([]);

    await abrirResultados(page);
    expect(await semTextoCortado(paginaDoProjeto(page)), "aba Form Factor").toEqual([]);

    await page.getByRole("button", { name: /Clock_000002/ }).last().click();
    const painel = page.getByRole("dialog");
    await expect(painel.getByRole("table")).toBeVisible();
    expect(await semTextoCortado(painel), "painel de histórico").toEqual([]);
  });
}

test("a Origem mostra Spreadsheet e nunca SDF", async ({ page }) => {
  await abrirProjeto(page, "en");
  await abrirResultados(page);

  await expect(page.getByRole("row", { name: /Clock_000002/ })).toContainText("Spreadsheet");
  await expect(page.getByRole("row", { name: /Clock_000001/ })).toContainText("Manual");
  await expect(page.getByRole("columnheader", { name: "Assignee" })).toHaveCount(0);
  await expect(page.getByRole("cell", { name: "SDF", exact: true })).toHaveCount(0);
});

test("só com o teclado, o ícone de histórico mostra o foco, o painel abre e fecha, e o foco volta ao ícone", async ({ page }) => {
  await abrirProjeto(page, "en");
  await abrirResultados(page);
  await semTransicao(page);

  const icone = page.getByRole("button", { name: "View execution history Clock_000002" });
  // A tabela é uma grade (React Aria): o foco vai à célula e o Tab entra no botão dela.
  const celula = icone.locator("xpath=ancestor::td[1]");
  await celula.focus();
  await page.keyboard.press("Tab");
  await expect(icone).toBeFocused();
  expect(await temFocoVisivel(icone)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog").getByRole("table")).toBeVisible();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  // O foco volta para a célula do ícone (ou para o próprio ícone); um Tab chega ao botão.
  await expect.poll(() => celula.evaluate((el) => el.contains(document.activeElement))).toBe(true);
  if (!(await icone.evaluate((el) => el === document.activeElement))) await page.keyboard.press("Tab");
  await expect(icone).toBeFocused();
});
