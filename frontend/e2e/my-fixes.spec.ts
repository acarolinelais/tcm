import { expect, test, type Page } from "@playwright/test";

import { caseItem, project, projectId, setupMembrosDoTime, setupProjectSession } from "./projetos-fixtures";

// Spec 073. A API é simulada pelas rotas, como nos outros e2e de projetos.
const falha = (data_execucao: string, tentativa: number) => ({
  modelo_dispositivo_id: "s26", modelo_nome: "S26 Ultra", sdf_id: `SDF-${tentativa}`, resultado: "FAIL", descricao: null, data_execucao, tentativa,
});

async function simularMyFixes(page: Page, { status = "InFixes", recusar = false } = {}) {
  let atual = {
    caso_teste_id: caseItem.id, tc_id: caseItem.tc_id, status, time_id: project.time_id, responsavel_id: "caio", responsavel_identificador: "caio.r",
    backup_id: null, dev_fix_id: null, dev_fix_identificador: null, tentativa_correcao: 2, correcao_em_revisao_em: null,
    falhas: [falha("2026-11-10T09:00:00Z", 2), falha("2026-11-05T09:00:00Z", 1)],
  };
  const pedidos: unknown[] = [];
  await page.route(`**/api/projetos/${projectId}`, (route) => route.fulfill({ json: project }));
  await page.route(`**/api/projetos/${projectId}/test-cases?*`, (route) => route.fulfill({ json: { items: [caseItem], page: 1, page_size: 20, total_count: 1 } }));
  await setupMembrosDoTime(page);
  await page.route("**/api/bug-reports/my-fixes?*", (route) => route.fulfill({ json: { items: [atual], page: 1, page_size: 20, total_count: 1 } }));
  await page.route(`**/api/test-cases/${caseItem.id}/correcao`, (route) => {
    pedidos.push(route.request().postDataJSON());
    if (recusar) return route.fulfill({ status: 403, json: { type: "about:blank", title: "Acesso negado.", status: 403, detail: "Só quem corrige o Test Case pode mudar o Status da correção." } });
    atual = { ...atual, status: "InReview", correcao_em_revisao_em: "2026-11-11T10:00:00Z" };
    return route.fulfill({ json: { ...caseItem, status: "InReview" } });
  });
  return pedidos;
}

test("o dev abre a My Fixes, vê a segunda tentativa, o histórico por tentativa e manda a correção para revisão", async ({ page }) => {
  await setupProjectSession(page);
  const pedidos = await simularMyFixes(page);

  await page.goto(`/projetos/${projectId}?aba=my-fixes`);

  const linha = page.getByRole("row", { name: new RegExp(caseItem.tc_id) });
  await expect(linha.getByText("2ª correção")).toBeVisible();
  await linha.getByRole("button", { name: caseItem.tc_id, exact: true }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByRole("region", { name: "2ª correção" })).toContainText("SDF-2");
  await expect(painel.getByRole("region", { name: "1ª correção" })).toContainText("SDF-1");
  await page.keyboard.press("Escape");

  await linha.getByRole("button", { name: new RegExp(`Status ${caseItem.tc_id}`) }).click();
  await expect(page.getByRole("option")).toHaveText(["Em correção", "Em andamento", "Em revisão", "Em validação"]);
  await page.getByRole("option", { name: "Em revisão" }).click();

  expect(pedidos).toEqual([{ status: "InReview" }]);
  await expect(linha).toContainText("Em revisão");
});

test("falha: quem não corrige o caso recebe a recusa da API", async ({ page }) => {
  await setupProjectSession(page);
  await simularMyFixes(page, { recusar: true });

  await page.goto(`/projetos/${projectId}?aba=my-fixes`);
  const linha = page.getByRole("row", { name: new RegExp(caseItem.tc_id) });
  await linha.getByRole("button", { name: new RegExp(`Status ${caseItem.tc_id}`) }).click();
  await page.getByRole("option", { name: "Em andamento" }).click();

  await expect(page.getByText("Só quem corrige o Test Case pode mudar o Status da correção.")).toBeVisible();
});
