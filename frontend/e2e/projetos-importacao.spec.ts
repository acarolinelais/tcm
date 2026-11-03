import { expect, test, type Locator, type Page } from "@playwright/test";
import * as XLSX from "@e965/xlsx";

import { caseItem, project, projectId, setupMembrosDoTime, setupProjectSession, setupTeamsAndModels } from "./projetos-fixtures";

/** O painel de problemas da planilha; o toast também é um `alert`, mas sem esse título. */
const alertaDaPlanilha = (page: Page) => page.getByRole("alert").filter({ has: page.getByRole("heading", { name: "Revise os erros da planilha abaixo." }) });

const cabecalho = ["App", "TC ID", "Difficulty", "Category", "TC Situation", "One UI", "Assignees", "Backup"];

function planilha(linhas: unknown[][], colunas: string[] = cabecalho) {
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, XLSX.utils.aoa_to_sheet([colunas, ...linhas]), "Cases");
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
  await expect(previa).not.toContainText("no total");
  await expect(previa).not.toContainText("Clock_021");
  await previa.getByRole("button", { name: "Próxima página" }).click();
  await previa.getByRole("button", { name: "Próxima página" }).click();
  await expect(previa).toContainText("Clock_045");
  await expect(previa.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  await page.getByRole("button", { name: /Time$/ }).click();
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

  const alerta = alertaDaPlanilha(page);
  await expect(alerta).toContainText("2 de 2 linhas precisam de ajuste. Nada foi criado.");
  await expect(alerta).toContainText('Coluna TC Situation: "To-Do" não é válido. Use New, New Step ou Without Changes.');
  await expect(alerta.getByRole("heading", { name: "Linha 3" })).toBeVisible();
  await expect(alerta).toContainText('Coluna TC ID: "Clock_001" já aparece na linha 2.');
  await expect(alerta).toContainText("Coluna Category: a célula está vazia.");
  await expect(alerta).not.toContainText("linha.");
  await expect(page.getByRole("button", { name: "Conferir planilha" })).toBeDisabled();
  expect(submitted).toBe(false);

  await page.getByRole("button", { name: /Time$/ }).click();
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
  await page.getByRole("button", { name: /Time$/ }).click();
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
  await page.getByRole("button", { name: /Time$/ }).click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  const alerta = alertaDaPlanilha(page);
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

// Modelo atual da planilha (spec 027): 13 colunas, com Automation Level depois de Category.
const cabecalhoModelo = [
  "App", "TC ID", "Title(English)", "Test Precondition(English)", "Test Procedure(English)", "Expected Result(English)",
  "Difficulty", "Category", "Automation Level", "TC Situation", "One UI", "Assignees", "Backup",
];
const casoModelo = (tcId: string, nivel: unknown) =>
  ["Clock", tcId, "Criar alarme", "App Clock instalado", "1. Abrir\n2. Tocar em Adicionar", "O alarme é criado", "Low", "A", nivel, "New", "9.5", "Gerente Ana", "Kaique Pereira"];

test("importa a planilha no modelo atual e mostra o Automation Level de cada caso na prévia", async ({ page }) => {
  await page.route("**/api/projetos/importar", (route) => route.fulfill({ json: { projeto: project, quantidade_casos: 3 } }));

  await abrirNovoProjeto(page);
  await escolher(page, planilha([casoModelo("Clock_001", 1), casoModelo("Clock_002", ""), casoModelo("Clock_003", "3.0")], cabecalhoModelo));

  const previa = previaDe(page);
  await expect(previa).toContainText("3 Test Cases");
  await expect(previa.getByRole("columnheader", { name: "Automation Level" })).toBeVisible();
  const linhas = previa.getByRole("row");
  await expect(linhas.filter({ hasText: "Clock_001" })).toContainText("1 – Não automatizável");
  await expect(linhas.filter({ hasText: "Clock_002" })).toContainText("—");
  await expect(linhas.filter({ hasText: "Clock_003" })).toContainText("3 – 100% automatizável");
  await page.getByRole("button", { name: /Time$/ }).click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();

  await expect(page.getByText("Planilha importada com sucesso: 3 Test Cases criados em Clock 9.5.")).toBeVisible();
});

test("recusa um Automation Level inválido na planilha, apontando a linha e a coluna, sem enviar nada", async ({ page }) => {
  let enviou = false;
  await page.route("**/api/projetos/importar", (route) => { enviou = true; return route.fulfill({ json: { projeto: project, quantidade_casos: 2 } }); });

  await abrirNovoProjeto(page);
  await escolher(page, planilha([casoModelo("Clock_001", 2), casoModelo("Clock_002", 4)], cabecalhoModelo));

  const alerta = alertaDaPlanilha(page);
  await expect(alerta).toContainText("1 de 2 linhas precisa de ajuste. Nada foi criado.");
  await expect(alerta.getByRole("heading", { name: "Linha 3" })).toBeVisible();
  await expect(alerta).toContainText('Coluna Automation Level: "4" não é válido. Use 1, 2 ou 3.');
  expect(enviou).toBe(false);
});

// Spec 028: os textos da planilha chegam ao painel de detalhes aberto pelo TC ID.
test("detalhes: importa a planilha com os textos e lê o procedimento no painel aberto pelo TC ID", async ({ page }) => {
  // A API é simulada: o detalhe devolve os textos da mesma linha que a planilha importa.
  const linha = casoModelo("Clock_001", 1);
  const [title, precondition, procedure, expected_result] = linha.slice(2, 6) as string[];
  await page.route("**/api/projetos/importar", (route) => route.fulfill({ json: { projeto: project, quantidade_casos: 1 } }));
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [caseItem], page: 1, page_size: 20, total_count: 1 } }));
  await page.route(`**/api/test-cases/${caseItem.id}`, (route) => route.fulfill({ json: { ...caseItem, title, precondition, procedure, expected_result } }));
  await setupMembrosDoTime(page);

  await abrirNovoProjeto(page);
  await escolher(page, planilha([linha], cabecalhoModelo));
  await expect(previaDe(page)).toContainText("1 Test Case");
  await page.getByRole("button", { name: /Time$/ }).click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await expect(page.getByText(/Planilha importada com sucesso/)).toBeVisible();

  await page.goto(`/projetos/${projectId}`);
  await page.getByRole("row", { name: /Clock_001/ }).getByRole("button", { name: "Clock_001", exact: true }).click();

  const painel = page.getByRole("dialog");
  await expect(painel.getByRole("heading", { name: "Clock_001" })).toBeVisible();
  await expect(painel.getByRole("term")).toHaveText(["Título", "Pré-condição (inglês)", "Procedimento (inglês)", "Resultado esperado (inglês)"]);
  const valores = painel.getByRole("definition");
  await expect(valores.nth(0)).toHaveText(title);
  await expect(valores.nth(1)).toHaveText(precondition);
  expect(await valores.nth(2).innerText()).toBe(procedure);
  await expect(valores.nth(3)).toHaveText(expected_result);

  await painel.getByRole("button", { name: "Concluir" }).click();
  await expect(painel).toBeHidden();
});

test("detalhes: recusa um Title acima de 500 caracteres, apontando a linha e a coluna, sem enviar nada", async ({ page }) => {
  let enviou = false;
  await page.route("**/api/projetos/importar", (route) => { enviou = true; return route.fulfill({ json: { projeto: project, quantidade_casos: 1 } }); });
  const longo = casoModelo("Clock_001", 1);
  longo[2] = "a".repeat(501);

  await abrirNovoProjeto(page);
  await escolher(page, planilha([longo], cabecalhoModelo));

  const alerta = alertaDaPlanilha(page);
  await expect(alerta.getByRole("heading", { name: "Linha 2" })).toBeVisible();
  await expect(alerta).toContainText("Coluna Title(English): o texto passa de 500 caracteres. Encurte o texto.");
  expect(enviou).toBe(false);
});
