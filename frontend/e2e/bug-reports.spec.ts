import { expect, test, type Page } from "@playwright/test";

import { entrarComoAdmin } from "./api-fixtures";

// Spec 072. Só as rotas de SDF Failures, dos membros e da edição do caso são simuladas; o login, o perfil e os
// projetos vêm da API real.
const falha = (modelo_nome: string, sdf_id: string, data_execucao: string) => ({
  modelo_dispositivo_id: modelo_nome, modelo_nome, sdf_id, resultado: "FAIL", descricao: "Crash ao girar a tela", data_execucao,
});
const caso = (dev_fix_id: string | null, dev_fix_identificador: string | null) => ({
  caso_teste_id: "caso-2", tc_id: "Clock_000002", status: "InFixes", time_id: "time-1", responsavel_id: "bia",
  responsavel_identificador: "bia.s", backup_id: null, dev_fix_id, dev_fix_identificador,
  falhas: [falha("S26 Ultra", "SDF-6", "2026-11-06T09:00:00Z"), falha("SM-1234", "SDF-5", "2026-11-05T09:00:00Z")],
});

async function simularSdfFailures(page: Page) {
  let atual = caso(null, null);
  const edicoes: unknown[] = [];
  await page.route("**/api/bug-reports?*", (route) => route.fulfill({ json: { items: [atual], page: 1, page_size: 20, total_count: 1 } }));
  await page.route("**/api/times/*/membros", (route) => route.fulfill({ json: [
    { usuario_id: "bia", usuario_user_id: "bia.s", usuario_nome: "Bia", ativo: true },
    { usuario_id: "ana", usuario_user_id: "ana.s", usuario_nome: "Ana", ativo: true },
  ] }));
  await page.route("**/api/test-cases/caso-2", (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    edicoes.push(route.request().postDataJSON());
    atual = caso("ana", "ana.s");
    return route.fulfill({ json: {} });
  });
  return edicoes;
}

test("a gestão abre SDF Failures, abre as falhas do caso e escolhe o Dev Fix sem trocar o dono", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  const edicoes = await simularSdfFailures(page);
  await page.goto("/overview");

  await page.getByRole("link", { name: "SDF Failures" }).click();
  const linha = page.getByRole("row", { name: /Clock_000002/ });
  await expect(linha.getByText("S26 Ultra")).toBeVisible();
  await linha.getByRole("button", { name: "Show all failures of Clock_000002" }).click();
  await expect(linha.getByText("SM-1234")).toBeVisible();

  await linha.getByRole("button", { name: /Change Dev Fix Clock_000002/ }).click();
  await page.getByRole("option", { name: "ana.s" }).click();

  await expect(page.getByText("Dev Fix changed.")).toBeVisible();
  expect(edicoes).toEqual([{ dev_fix_id: "ana" }]);
  await expect(linha.getByRole("button", { name: /Change Dev Fix/ })).toContainText("ana.s");
  await expect(linha).toContainText("bia.s");
});

test("falha: a API recusa e a tela mostra o erro", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await page.route("**/api/bug-reports?*", (route) => route.fulfill({ status: 500, json: { type: "about:blank", title: "Erro", status: 500 } }));

  await page.goto("/bug-reports");

  // O TanStack Query tenta de novo antes de desistir, como em auditoria.spec.ts.
  await expect(page.getByRole("alert")).toContainText("Couldn't load the failures. Try again.", { timeout: 15_000 });
});
