import { expect, test, type APIRequestContext, type Page } from "@playwright/test";

import { api, entrarComoAdmin, post, prepararTimeComDev } from "./api-fixtures";

test.setTimeout(90_000);
// As sete colunas não cabem em 1280 px; numa tela larga o arrasto não precisa rolar o quadro.
test.use({ viewport: { width: 1920, height: 1080 } });

/** Arrasta como uma pessoa: segura o card e move o mouse em passos até a coluna, para o drag nativo do navegador começar. */
async function arrastar(page: Page, tcId: string, destino: RegExp) {
  const origem = await page.getByRole("article", { name: tcId }).boundingBox();
  const alvo = await page.getByRole("region", { name: destino }).boundingBox();
  if (!origem || !alvo) throw new Error(`card ${tcId} ou coluna ${destino} fora da tela`);
  await page.mouse.move(origem.x + origem.width / 2, origem.y + origem.height / 2);
  await page.mouse.down();
  await page.mouse.move(alvo.x + alvo.width / 2, alvo.y + 80, { steps: 15 });
  await page.mouse.up();
}

/** Time novo com três membros; a sessão aberta no navegador é a do dev `usuarios[0]`. */
async function preparar(request: APIRequestContext, page: Page) {
  const dados = await prepararTimeComDev(request, page);
  const projeto = await post(request, "projetos", { time_id: dados.time.id, app: `Kanban ${crypto.randomUUID().slice(0, 8)}`, one_ui: "9.5", modelos_ids: [] }, dados.admin.access_token);
  async function caso(tcId: string, principal: number, backup: number, status?: string) {
    const criado = await post(request, `projetos/${projeto.id}/test-cases`, { tc_id: tcId, category: "A", difficulty: "Low", situation: "New", responsavel_id: dados.usuarios[principal].id, backup_id: dados.usuarios[backup].id }, dados.admin.access_token);
    if (status) {
      const resposta = await request.put(`${api}/api/test-cases/${criado.id}`, { data: { status }, headers: { Authorization: `Bearer ${dados.admin.access_token}` } });
      expect(resposta.ok()).toBeTruthy();
    }
    return criado;
  }
  return { ...dados, projeto, caso };
}

const coluna = (page: Page, status: RegExp) => page.getByRole("region", { name: status });

test("gestão arrasta de In Review para In Validation e a aba Test Cases reflete", async ({ request, page }) => {
  const dados = await preparar(request, page);
  await dados.caso("Kanban_001", 1, 2, "InReview");
  await entrarComoAdmin(request, page);

  await page.goto(`/projetos/${dados.projeto.id}?aba=kanban`);
  await arrastar(page, "Kanban_001", /^In Validation/);

  await expect(coluna(page, /^In Validation, 1 case/)).toBeVisible();
  await expect(coluna(page, /^In Review, 0 cases/)).toBeVisible();
  await page.getByRole("tab", { name: "Test Cases" }).click();
  await expect(page.getByRole("row", { name: /Kanban_001/ })).toContainText("In Validation");
});

test("excluir pelo Kanban grava a justificativa", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const caso = await dados.caso("Kanban_001", 0, 1);

  await page.goto(`/projetos/${dados.projeto.id}?aba=kanban`);
  await page.getByRole("button", { name: "Move Kanban_001 to" }).click();
  await page.getByRole("menuitem", { name: "Excluded" }).click();
  await page.getByRole("alertdialog").getByRole("textbox").fill("Depende de hardware");
  // A coluna muda antes da API responder (atualização otimista): espera o PUT para ler o que foi gravado.
  const gravado = page.waitForResponse((resposta) => resposta.request().method() === "PUT" && resposta.url().includes(caso.id));
  await page.getByRole("alertdialog").getByRole("button", { name: /exclude/i }).click();
  expect((await gravado).ok()).toBeTruthy();

  await expect(coluna(page, /^Excluded, 1 case/)).toBeVisible();
  const salvo = await request.get(`${api}/api/test-cases/${caso.id}`, { headers: { Authorization: `Bearer ${dados.admin.access_token}` } });
  expect(await salvo.json()).toMatchObject({ status: "Cancelled", justificativa_exclusao: "Depende de hardware" });
});

test("dev vê todos os casos, só move os seus, e o backup só exclui", async ({ request, page }) => {
  const dados = await preparar(request, page);
  await dados.caso("Proprio_001", 0, 1);
  await dados.caso("Backup_001", 1, 0);
  await dados.caso("Colega_001", 1, 2);

  await page.goto(`/projetos/${dados.projeto.id}?aba=kanban`);
  await expect(coluna(page, /^To-Do, 3 cases/)).toBeVisible();
  await expect(page.getByRole("article", { name: "Colega_001" }).getByRole("button")).toHaveCount(0);
  await page.getByRole("button", { name: "Move Backup_001 to" }).click();
  await expect(page.getByRole("menuitem")).toHaveText(["Excluded"]);
  await page.keyboard.press("Escape");
  await expect(page.getByRole("menu")).toHaveCount(0);

  await arrastar(page, "Proprio_001", /^In Progress/);
  await expect(coluna(page, /^In Progress, 1 case/)).toBeVisible();

  // A aba Test Cases do dev continua mostrando só os casos ligados a ele.
  await page.getByRole("tab", { name: "Test Cases" }).click();
  await expect(page.getByRole("row", { name: /Proprio_001/ })).toBeVisible();
  await expect(page.getByText("Colega_001")).toHaveCount(0);
});

test("link para o Kanban de projeto fora do escopo mostra não encontrado", async ({ request, page }) => {
  const dados = await preparar(request, page);
  const outroSetor = await post(request, "setores", { nome: `Fora ${crypto.randomUUID()}` }, dados.admin.access_token);
  const outroTime = await post(request, "times", { nome: `Fora ${crypto.randomUUID()}`, setor_id: outroSetor.id }, dados.admin.access_token);
  const fora = await post(request, "projetos", { time_id: outroTime.id, app: "Fora", one_ui: "9.5", modelos_ids: [] }, dados.admin.access_token);

  await page.goto(`/projetos/${fora.id}?aba=kanban`);

  // A consulta do projeto refaz a chamada com espera crescente antes de mostrar o erro.
  await expect(page.getByRole("alert")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("region")).toHaveCount(0);
});

test("projeto com 1.000 casos abre com os totais certos", async ({ request, page }) => {
  const dados = await preparar(request, page);
  for (let lote = 0; lote < 10; lote++) {
    await Promise.all(Array.from({ length: 100 }, (_, i) => dados.caso(`Carga_${String(lote * 100 + i).padStart(4, "0")}`, 0, 1)));
  }

  await page.goto(`/projetos/${dados.projeto.id}?aba=kanban`);

  await expect(coluna(page, /^To-Do, 1000 cases/)).toBeVisible({ timeout: 15_000 });
  await expect(coluna(page, /^To-Do/).getByRole("article")).toHaveCount(50);
});

test("Board leva direto ao Kanban de quem tem um time com um projeto", async ({ request, page }) => {
  // O dev não tem nenhum caso no projeto: mesmo assim o Kanban abre (RN-04a).
  const dados = await preparar(request, page);

  await page.goto("/board");

  // O Board abre uma tela só com o Kanban, sem as abas da tela do projeto.
  await expect(page).toHaveURL(new RegExp(`/board/${dados.projeto.id}$`));
  await expect(page.getByRole("region", { name: /^To-Do/ })).toBeVisible();
  await expect(page.getByRole("tab")).toHaveCount(0);
});
