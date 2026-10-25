import { expect, test, type Locator, type Page } from "@playwright/test";
import * as XLSX from "@e965/xlsx";

import { project, setupProjectSession, setupTeamsAndModels } from "./projetos-fixtures";

const cabecalho = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];

function planilha(linhas: unknown[][]) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([cabecalho, ...linhas]), "Cases");
  return { name: "clock.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from(XLSX.write(workbook, { type: "array", bookType: "xlsx" })) };
}

const casos = (total: number) => Array.from({ length: total }, (_, index) =>
  [index ? "" : "Clock", `Clock_${String(index + 1).padStart(3, "0")}`, "Low", "A", "New", index ? "" : "9.5", "Gerente Ana", "Kaique Pereira"]);

test.beforeEach(async ({ page }) => {
  await setupProjectSession(page);
  await setupTeamsAndModels(page);
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [], page: 1, page_size: 10, total_count: 0 } }));
});

test("pagina a prévia e informa quantos Test Cases foram criados", async ({ page }) => {
  await page.route("**/api/projetos/importar", async (route) => {
    expect(route.request().method()).toBe("POST");
    expect(route.request().headers()["content-type"]).toContain("multipart/form-data");
    await route.fulfill({ json: { projeto: project, quantidade_casos: 45 } });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles(planilha(casos(45)));
  const previa = page.getByRole("region", { name: "Prévia dos Test Cases" });
  await expect(previa).toContainText("45 Test Cases");
  await expect(previa).toContainText("Página 1 de 3");
  await expect(previa).not.toContainText("Clock_021");
  await previa.getByRole("button", { name: "Última página" }).click();
  await expect(previa).toContainText("Clock_045");
  await expect(previa).toContainText("Página 3 de 3");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page.getByText("Planilha importada com sucesso: 45 Test Cases criados em Clock 9.5.")).toBeVisible();
});

test("mostra os problemas da planilha agrupados por linha e confere as pessoas no servidor", async ({ page }) => {
  let submitted = false;
  await page.route("**/api/projetos/importar", (route) => {
    submitted = true;
    return route.fulfill({
      status: 422,
      contentType: "application/problem+json",
      body: JSON.stringify({
        title: "Planilha inválida.", status: 422, total_linhas: 2,
        errors: [
          { campo: "linha.2.tc situation", mensagem: "x", codigo: "valor_invalido", linha: 2, coluna: "TC Situation", valor: "To-Do", parametros: { esperados: ["New", "New Step", "Without Changes"] } },
          { campo: "linha.2.backup", mensagem: "x", codigo: "pessoa_fora_do_time", linha: 2, coluna: "Backup", valor: "Kaique Pereira" },
        ],
      }),
    });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles(planilha([
    ["Clock", "Clock_001", "Low", "A", "To-Do", "9.5", "Gerente Ana", "Kaique Pereira"],
    ["", "Clock_001", "Low", "", "New", "", "Gerente Ana", "Kaique Pereira"],
  ]));

  const alerta = page.getByRole("alert");
  await expect(alerta).toContainText("2 de 2 linhas precisam de ajuste. Nada foi criado.");
  await expect(alerta).toContainText('Coluna TC Situation: "To-Do" não é válido. Use New, New Step ou Without Changes.');
  await expect(alerta.getByRole("heading", { name: "Linha 3" })).toBeVisible();
  await expect(alerta).toContainText('Coluna TC ID: "Clock_001" já aparece na linha 2.');
  await expect(alerta).toContainText("Coluna Category: a célula está vazia.");
  await expect(alerta).not.toContainText("linha.");
  await expect(page.getByRole("button", { name: "Conferir planilha" })).toBeDisabled();
  expect(submitted).toBe(false);

  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Conferir planilha" }).click();
  await expect(alerta).toContainText('Coluna Backup: "Kaique Pereira" não é membro ativo do time selecionado.');
  expect(submitted).toBe(true);
});

test("mostra os problemas de pessoas devolvidos pela API e não cria o projeto", async ({ page }) => {
  await page.route("**/api/projetos/importar", (route) => route.fulfill({
    status: 422,
    contentType: "application/problem+json",
    body: JSON.stringify({
      title: "Planilha inválida.", status: 422, total_linhas: 2,
      errors: [{ campo: "linha.3.assignees", mensagem: "A pessoa precisa ser membro ativo do time.", codigo: "pessoa_fora_do_time", linha: 3, coluna: "Assignees", valor: "Gerente Ana" }],
    }),
  }));

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles(planilha(casos(2)));
  // Espera a leitura terminar: a prévia muda o layout e fecharia a lista de times aberta.
  await expect(page.getByRole("region", { name: "Prévia dos Test Cases" })).toContainText("Clock_002");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  const alerta = page.getByRole("alert").filter({ hasText: "Linha 3" });
  await expect(alerta).toContainText("1 de 2 linhas precisa de ajuste. Nada foi criado.");
  await expect(alerta).toContainText('Coluna Assignees: "Gerente Ana" não é membro ativo do time selecionado.');
  await expect(page.getByRole("heading", { name: "Meus projetos" })).toHaveCount(0);
});

test("envia identificadores de usuário e bloqueia importação ambígua", async ({ page }) => {
  await page.route("**/api/projetos/importar", (route) => route.fulfill({
    status: 422,
    contentType: "application/problem+json",
    body: JSON.stringify({
      title: "Planilha inválida.", status: 422, total_linhas: 1,
      errors: [{ campo: "linha.2.assignees", mensagem: "Mais de uma pessoa corresponde a este valor.", codigo: "pessoa_ambigua", linha: 2, coluna: "Assignees", valor: "USR-001" }],
    }),
  }));

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles(planilha([
    ["Clock", "Clock_001", "Low", "A", "New", "9.5", "USR-001", "BACK-002"],
  ]));
  const previa = page.getByRole("region", { name: "Prévia dos Test Cases" });
  await expect(previa).toContainText("USR-001");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  const alerta = page.getByRole("alert");
  await expect(alerta).toContainText("USR-001");
  await expect(page.getByRole("heading", { name: "Meus projetos" })).toHaveCount(0);
});

test("abrir o seletor de modelos com a prévia rolada não estica a página", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.locator('input[type="file"]').setInputFiles(planilha(casos(150)));
  await expect(page.getByRole("region", { name: "Prévia dos Test Cases" })).toContainText("Clock_001");
  await page.getByRole("button", { name: "Modelos de dispositivo" }).click();
  await expect(page.getByRole("option", { name: "S27 Ultra" })).toBeVisible();

  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBe(720);
});

async function abrirNovoProjeto(page: Page) {
  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
}

const escolher = (page: Page, arquivo: Parameters<Locator["setInputFiles"]>[0]) => page.locator('input[type="file"]').setInputFiles(arquivo);
const modelo = (page: Page) => page.getByRole("button", { name: "Baixar template" });
const previaDe = (page: Page) => page.getByRole("region", { name: "Prévia dos Test Cases" });

test("lê a planilha com barra até 100%, recolhe a área e reabre ao remover", async ({ page }) => {
  await abrirNovoProjeto(page);
  const area = page.getByRole("button", { name: /Arraste e solte sua planilha aqui/ });
  await expect(modelo(page)).toBeVisible();

  await escolher(page, planilha(casos(1000)));

  await expect(page.getByText("clock.xlsx")).toBeVisible();
  await expect(previaDe(page)).toContainText("1.000 Test Cases");
  await expect(page.getByRole("progressbar", { name: "Progresso da leitura da planilha" })).toHaveAttribute("aria-valuenow", "100");
  await expect(area).toBeHidden();
  await expect(modelo(page)).toHaveCount(0);

  await page.getByRole("button", { name: "Remover arquivo" }).click();
  await expect(area).toBeFocused();
  await expect(previaDe(page)).toHaveCount(0);
  await expect(modelo(page)).toBeVisible();
  await expect(page.getByText("Planilha removida")).toBeVisible();
});

test("trocar de arquivo logo após escolher descarta a leitura anterior", async ({ page }) => {
  await abrirNovoProjeto(page);

  await escolher(page, planilha(casos(1000)));
  await page.getByRole("button", { name: "Remover arquivo" }).click();
  await escolher(page, planilha(casos(1)));

  await expect(previaDe(page)).toContainText("1 Test Case");
  await expect(previaDe(page)).not.toContainText("1.000 Test Cases");
});

test("recusa um arquivo .csv mostrando o motivo junto da área", async ({ page }) => {
  await abrirNovoProjeto(page);

  await escolher(page, { name: "casos.csv", mimeType: "text/csv", buffer: Buffer.from("a,b") });

  await expect(page.getByText("Selecione uma planilha XLS ou XLSX.").first()).toBeVisible();
  await expect(page.getByRole("progressbar")).toHaveCount(0);
  await expect(modelo(page)).toBeVisible();
});
