import { expect, test, type Page } from "@playwright/test";

import { caseItem, project, projectId, setupMembrosDoTime, setupProjectSession, setupTeamsAndModels } from "./projetos-fixtures";

test("cria projeto manualmente, atribui casos e transfere um caso ao backup", async ({ page }) => {
  await setupProjectSession(page);
  await setupTeamsAndModels(page);
  let projects = [] as typeof project[];
  let cases = [] as typeof caseItem[];

  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: projects, page: 1, page_size: 10, total_count: projects.length } }));
  await page.route("**/api/projetos", async (route) => {
    if (route.request().method() === "POST") {
      projects = [project];
      await route.fulfill({ json: project });
      return;
    }
    await route.fulfill({ json: { items: projects, page: 1, page_size: 10, total_count: projects.length } });
  });
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: cases, page: 1, page_size: 10, total_count: cases.length } }));
  let createdBody: Record<string, string> = {};
  await page.route(`**/api/projetos/${projectId}/test-cases`, async (route) => {
    const body = route.request().postDataJSON();
    createdBody = body;
    cases = [{ ...caseItem, tc_id: body.tc_id, situation: body.situation, responsavel_id: body.responsavel_id, backup_id: body.backup_id }];
    await route.fulfill({ json: cases[0] });
  });
  await setupMembrosDoTime(page);
  await page.route("**/api/test-cases/case-1/transferir-para-backup", async (route) => {
    // Troca de papéis: quem transferiu vira o backup.
    cases = [{ ...cases[0], responsavel_id: "backup-1", backup_id: cases[0].responsavel_id }];
    await route.fulfill({ json: cases[0] });
  });

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByRole("tab", { name: "Manual", exact: true }).click();
  await page.getByLabel("App").fill("Clock");
  await page.getByLabel(/One UI/).fill("9.5");
  await page.getByLabel("Time").click();
  await page.getByRole("option", { name: "Plataforma" }).click();
  await page.getByRole("button", { name: "Modelos de dispositivo" }).click();
  await page.getByRole("option", { name: "S27 Ultra" }).click();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Criar projeto" }).click();
  await page.getByRole("link", { name: "Clock 9.5" }).click();

  await page.getByRole("button", { name: "Novo caso de teste" }).click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("ID do TC").fill("Clock_001");
  await dialog.getByLabel("Situação do TC").click();
  await page.getByRole("option", { name: "Novo passo" }).click();
  await dialog.getByLabel("Responsável", { exact: true }).click();
  await page.getByRole("option", { name: "Gerente Ana" }).click();
  await dialog.getByLabel("Backup", { exact: true }).click();
  await page.getByRole("option", { name: "Kaique Pereira" }).click();
  await dialog.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  expect(createdBody).toMatchObject({ situation: "New Step" });
  expect(createdBody).not.toHaveProperty("status");
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("A fazer");
  await expect(page.getByRole("button", { name: /Situação do TC Clock_001/ })).toContainText("Novo passo");
  await page.getByRole("button", { name: "Transferir ao backup Clock_001" }).click();
  await page.getByRole("alertdialog", { name: "Transferir ao backup?" }).getByRole("button", { name: "Transferir ao backup" }).click();
  await expect(page.getByText("Test Case transferido para o backup.")).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("KP-002");
});

test("edita o Automation Level na tabela e mantém o nível depois de recarregar", async ({ page }) => {
  await setupProjectSession(page);
  let cases = [{ ...caseItem }];
  let atualizacao: Record<string, unknown> = {};

  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: cases, page: 1, page_size: 10, total_count: cases.length } }));
  await setupMembrosDoTime(page);
  await page.route("**/api/test-cases/case-1", async (route) => {
    atualizacao = route.request().postDataJSON();
    cases = [{ ...cases[0], ...atualizacao }];
    await route.fulfill({ json: cases[0] });
  });

  await page.goto(`/projetos/${projectId}`);
  const linha = page.getByRole("row", { name: /Clock_001/ });
  const nivel = linha.getByRole("button", { name: /Automation Level Clock_001/ });
  await expect(linha).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /Automation Level/ })).toBeVisible();
  await expect(nivel).toContainText("—");

  await nivel.click();
  await expect(page.getByRole("option")).toHaveText(["1 – Não automatizável", "2 – Automatizável até certo ponto", "3 – 100% automatizável"]);
  await page.getByRole("option", { name: "2 – Automatizável até certo ponto" }).click();

  await expect(nivel).toContainText("2 – Automatizável até certo ponto");
  expect(atualizacao).toEqual({ automation_level: 2 });

  await page.reload();
  await expect(linha).toContainText("2 – Automatizável até certo ponto");
});

/** Spec 030: rotas da tela do projeto com a aba Form Factor e os links de PR guardados em memória, como a API. */
async function rotasDosLinksDePr(page: Page, podeRemover: boolean) {
  const links: Record<string, string>[] = [];
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [caseItem], page: 1, page_size: 20, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}/form-factor?*`, (route) => route.fulfill({ json: {
    modelos: [], casos_elegiveis: [], page: 1, page_size: 20, total_count: 1,
    items: [{ caso_teste_id: caseItem.id, tc_id: caseItem.tc_id, responsavel_id: caseItem.responsavel_id, sdf_id: null, data_reportada: null, resultados: {} }],
  } }));
  await page.route(`**/api/test-cases/${caseItem.id}`, (route) => route.fulfill({ json: { ...caseItem, title: "Check alarm", precondition: null, procedure: "1. Open Clock", expected_result: null } }));
  await page.route(`**/api/test-cases/${caseItem.id}/pull-requests`, async (route) => {
    if (route.request().method() === "POST") {
      const { url } = route.request().postDataJSON() as { url: string };
      const link = { id: `pr-${links.length + 1}`, caso_teste_id: caseItem.id, url, created_at: "2026-10-28T12:00:00Z", created_by: "user-1", created_by_nome: "Gerente Ana" };
      links.unshift(link);
      return route.fulfill({ status: 201, json: link });
    }
    return route.fulfill({ json: { itens: links, pode_remover: podeRemover } });
  });
  await page.route(`**/api/test-cases/${caseItem.id}/pull-requests/*/inativar`, async (route) => {
    const id = route.request().url().split("/").at(-2);
    links.splice(links.findIndex((link) => link.id === id), 1);
    return route.fulfill({ status: 204 });
  });
  return links;
}

async function abrirPainelPeloFormFactor(page: Page) {
  await page.goto(`/projetos/${projectId}`);
  await page.getByRole("tab", { name: "Form Factor" }).click();
  await page.getByRole("row", { name: /Clock_001/ }).getByRole("button", { name: "Clock_001", exact: true }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByRole("heading", { name: "Clock_001" })).toBeVisible();
  return painel;
}

test("pull request: a gestão abre o painel pelo Form Factor, adiciona um link do GitHub Enterprise e o remove", async ({ page }) => {
  await setupProjectSession(page);
  await setupMembrosDoTime(page);
  const links = await rotasDosLinksDePr(page, true);
  const painel = await abrirPainelPeloFormFactor(page);

  await expect(painel.getByText("Nenhum PR registrado")).toBeVisible();
  const campo = painel.getByRole("textbox", { name: "Link do PR" });
  await campo.fill("https://github.com/org/repo/pull/1");
  await painel.getByRole("button", { name: "Adicionar" }).click();
  await expect(painel.getByText("Só são aceitos links do github.sec.samsung.net.")).toBeVisible();
  expect(links).toHaveLength(0);

  const url = "https://github.sec.samsung.net/org/repo/pull/12";
  await campo.fill(url);
  await painel.getByRole("button", { name: "Adicionar" }).click();
  const link = painel.getByRole("link", { name: url });
  await expect(link).toHaveAttribute("target", "_blank");
  await expect(link).toHaveAttribute("rel", "noopener noreferrer");
  await expect(painel.getByText(/Adicionado por Gerente Ana/)).toBeVisible();

  await painel.getByRole("button", { name: `Remover o link de PR ${url}` }).click();
  const confirmacao = page.getByRole("alertdialog", { name: "Remover link de PR?" });
  await expect(confirmacao).toContainText(url);
  await confirmacao.getByRole("button", { name: "Remover" }).click();
  await expect(painel.getByText("Nenhum PR registrado")).toBeVisible();
  expect(links).toHaveLength(0);
});

test("pull request: o dev adiciona um link, mas não vê a opção de remover", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", permissoes: ["projetos.consultar", "test_cases.consultar", "form_factor.consultar"] });
  await setupMembrosDoTime(page);
  await rotasDosLinksDePr(page, false);
  const painel = await abrirPainelPeloFormFactor(page);

  const url = "https://github.sec.samsung.net/org/repo/pull/7";
  await painel.getByRole("textbox", { name: "Link do PR" }).fill(url);
  await painel.getByRole("button", { name: "Adicionar" }).click();
  await expect(painel.getByRole("link", { name: url })).toBeVisible();
  await expect(painel.getByRole("button", { name: /Remover o link de PR/ })).toHaveCount(0);
});
