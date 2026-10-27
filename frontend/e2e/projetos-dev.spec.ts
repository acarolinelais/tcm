import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { api, post, prepararTimeComDev } from "./api-fixtures";

test.setTimeout(60_000);
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

async function preparar(request: APIRequestContext, page: Page) {
  const { admin, dev, usuarios, time } = await prepararTimeComDev(request, page);
  // O proxy Vite usa SDF_E2E_API_URL; as respostas de sucesso vêm da API real.
  async function projeto(nome: string) {
    return post(request, "projetos", { time_id: time.id, app: nome, one_ui: "9.5", modelos_ids: [] }, admin.access_token);
  }
  async function caso(projetoId: string, tcId: string, principal = 0, backup = 1) {
    return post(request, `projetos/${projetoId}/test-cases`, { tc_id: tcId, category: "A", difficulty: "Low", situation: "New", responsavel_id: usuarios[principal].id, backup_id: usuarios[backup].id }, admin.access_token);
  }
  return { projeto, caso, dev, usuarios, admin };
}

test("entrada: sem associação exibe vazio e mantém Projects", async ({ request, page }) => {
  const dados = await preparar(request, page);
  await page.goto("/projetos");
  await expect(page.getByRole("heading", { name: "No associated projects or Test Cases" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Projects", exact: true })).toBeVisible();
  await dados.projeto("Sem casos");
  await page.reload();
  await expect(page.getByRole("heading", { name: "No associated projects or Test Cases" })).toBeVisible();
});

test("entrada: somente backup abre diretamente os TCs pessoais", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const projeto = await dados.projeto("Clock");
  const backup = await dados.caso(projeto.id, "Backup_001", 1, 0);
  await dados.caso(projeto.id, "Colega_001", 1, 2);
  await page.goto("/projetos");
  await expect(page).toHaveURL(new RegExp(`/projetos/${projeto.id}$`));
  await expect(page.getByRole("row", { name: /Backup_001/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Backup_001/ })).toContainText(dados.usuarios[1].user_id);
  await expect(page.getByRole("row", { name: /Backup_001/ })).toContainText(dados.usuarios[0].user_id);
  await expect(page.getByText("Colega_001")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Status Backup_001/ })).toHaveCount(1);
  const negado = await request.put(`${api}/api/test-cases/${backup.id}`, { data: { status: "InProgress" }, headers: { Authorization: `Bearer ${dados.dev.access_token}` } });
  expect(negado.status()).toBe(403);
  const transferencia = await request.patch(`${api}/api/test-cases/${backup.id}/transferir-para-backup`, { headers: { Authorization: `Bearer ${dados.dev.access_token}` } });
  expect(transferencia.status()).toBe(403);
});

test("múltiplos: troca pelo dropdown e recupera perda da associação", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const primeiro = await dados.projeto("Clock");
  await dados.caso(primeiro.id, "Clock_001");
  const segundo = await dados.projeto("Gallery");
  await dados.caso(segundo.id, "Gallery_001");
  await dados.projeto("Sem associação");
  await page.goto("/projetos");
  await expect(page).toHaveURL(new RegExp(`/projetos/${segundo.id}$`));
  await page.getByRole("button", { name: "Gallery 9.5" }).click();
  await expect(page.getByRole("menuitemradio", { name: "Sem associação 9.5" })).toHaveCount(0);
  await page.getByRole("menuitemradio", { name: "Clock 9.5" }).click();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  await expect(page.getByText("Gallery_001")).toHaveCount(0);
  await page.getByRole("button", { name: "Transfer to backup Clock_001" }).click();
  await expect(page).toHaveURL(new RegExp(`/projetos/${segundo.id}$`));
  await expect(page.getByRole("row", { name: /Gallery_001/ })).toBeVisible();
});

test("entrada: falha mostra erro sem simular ausência", async ({ request, page }) => {
  await preparar(request, page);
  await page.route("**/api/projetos?*", (route) => route.fulfill({ status: 500, json: { title: "Falha", status: 500 } }));
  await page.goto("/projetos");
  await expect(page.getByRole("button", { name: "Try again" })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("heading", { name: "No associated projects or Test Cases" })).toHaveCount(0);
});

test("filtra pela semana da data final no cabeçalho e restaura os TCs ao limpar", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const projeto = await dados.projeto("Semana");
  const concluido = await dados.caso(projeto.id, "Concluido_001");
  await dados.caso(projeto.id, "Pendente_001");
  const atualizado = await request.put(`${api}/api/test-cases/${concluido.id}`, { data: { status: "Done" }, headers: { Authorization: `Bearer ${dados.admin.access_token}` } });
  expect(atualizado.ok()).toBeTruthy();
  await page.goto("/projetos");
  await expect(page.getByRole("row", { name: /Pendente_001/ })).toBeVisible();
  const seletor = page.getByRole("button", { name: "Week: Select a week" });
  expect(await seletor.evaluate((element) => Boolean(element.closest("header")))).toBe(true);
  await seletor.click();
  await page.getByRole("button", { name: "This week", exact: true }).click();
  await expect(page.getByRole("row", { name: /Concluido_001/ })).toBeVisible();
  await expect(page.getByRole("row", { name: /Pendente_001/ })).toHaveCount(0);
  await page.getByRole("button", { name: /^Week: Week/ }).click();
  await page.getByRole("button", { name: "Clear filters", exact: true }).click();
  await expect(page.getByRole("row", { name: /Pendente_001/ })).toBeVisible();
});

test("acesso direto: projeto de outro time é negado", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const setor = await post(request, "setores", { nome: `Fora ${crypto.randomUUID()}` }, dados.admin.access_token);
  const time = await post(request, "times", { nome: "Fora", setor_id: setor.id }, dados.admin.access_token);
  const fora = await post(request, "projetos", { time_id: time.id, app: "Restrito", one_ui: "1", modelos_ids: [] }, dados.admin.access_token);
  await page.goto(`/projetos/${fora.id}`);
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText("Restrito 1")).toHaveCount(0);
});
