import { expect, test, type Page } from "@playwright/test";

import { entrarComoAdmin } from "./api-fixtures";

// Spec 070. Só as rotas do Bug Reports, dos membros e da edição do caso são simuladas; o login e o perfil vêm da API real.
const falha = (responsavel_id: string, responsavel_identificador: string) => ({
  caso_teste_id: "caso-2", tc_id: "Clock_000002", titulo: "Girar a tela", status: "InFixes", projeto_id: "projeto-1", projeto_nome: "Clock 9.5",
  time_id: "time-1", modelo_dispositivo_id: "sm-1234", modelo_nome: "SM-1234", sdf_id: "SDF-5", motivo: "Crash ao girar a tela",
  data_execucao: "2026-11-05T09:00:00Z", responsavel_id, responsavel_identificador, backup_id: null,
});

async function simularBugReports(page: Page) {
  let atual = falha("bia", "bia.s");
  const edicoes: unknown[] = [];
  await page.route("**/api/bug-reports?*", (route) => route.fulfill({ json: { items: [atual], page: 1, page_size: 20, total_count: 1 } }));
  await page.route("**/api/times/time-1/membros", (route) => route.fulfill({ json: [
    { usuario_id: "bia", usuario_user_id: "bia.s", usuario_nome: "Bia", ativo: true },
    { usuario_id: "ana", usuario_user_id: "ana.s", usuario_nome: "Ana", ativo: true },
  ] }));
  await page.route("**/api/test-cases/caso-2", (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    edicoes.push(route.request().postDataJSON());
    atual = falha("ana", "ana.s");
    return route.fulfill({ json: {} });
  });
  return edicoes;
}

test("a gestão abre Bug Reports, vê a falha com o motivo e troca o responsável", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  const edicoes = await simularBugReports(page);
  await page.goto("/overview");

  await page.getByRole("link", { name: "Bug Reports" }).click();
  const linha = page.getByRole("row", { name: /Clock_000002/ });
  await expect(linha.getByText("Crash ao girar a tela")).toBeVisible();

  await linha.getByRole("button", { name: /Change assignee Clock_000002 SM-1234/ }).click();
  await page.getByRole("option", { name: "ana.s" }).click();

  await expect(page.getByText("Assignee changed.")).toBeVisible();
  expect(edicoes).toEqual([{ responsavel_id: "ana" }]);
  await expect(linha.getByRole("button", { name: /Change assignee/ })).toContainText("ana.s");
});

test("falha: a API recusa e a tela mostra o erro", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await page.route("**/api/bug-reports?*", (route) => route.fulfill({ status: 500, json: { type: "about:blank", title: "Erro", status: 500 } }));

  await page.goto("/bug-reports");

  // O TanStack Query tenta de novo antes de desistir, como em auditoria.spec.ts.
  await expect(page.getByRole("alert")).toContainText("Couldn't load the failures. Try again.", { timeout: 15_000 });
});
