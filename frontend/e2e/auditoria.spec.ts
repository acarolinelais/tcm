import { expect, test, type Page } from "@playwright/test";

import { entrarComoAdmin } from "./api-fixtures";

// Spec 052. Só a rota da auditoria é simulada; o login, o perfil e as opções dos filtros vêm da API real.
const registro = (id: number, usuario: string, campos: [string, string, string][]) => ({
  id, alterado_em: "2026-10-30T15:42:00Z", usuario_nome: usuario, usuario_perfil: "Administrador", acao: "alteracao",
  caso_teste_id: `caso-${id}`, tc_id: `Clock_00${id}`, projeto_id: "projeto-1", projeto_nome: "Clock 9.5",
  alteracoes: campos.map(([campo, valor_anterior, valor_novo]) => ({ campo, valor_anterior, valor_novo })),
  origem: "api", tela: "/projetos/projeto-1/kanban",
});
const daAdmin = registro(1, "Administradora da Unidade Manaus", [["status", "InProgress", "InReview"], ["category", "B", "A"]]);
const deOutra = registro(2, "Bia Costa", [["status", "To-Do", "InProgress"]]);

async function simularAuditoria(page: Page) {
  const chamadas: URL[] = [];
  await page.route("**/api/auditoria?*", (route) => {
    const url = new URL(route.request().url());
    chamadas.push(url);
    const items = url.searchParams.has("usuario_id") ? [daAdmin] : [daAdmin, deOutra];
    return route.fulfill({ json: { items, page: 1, page_size: 20, total_count: items.length } });
  });
  return chamadas;
}

test("o admin abre Auditoria em Administration, filtra por usuário e abre o detalhe", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  const chamadas = await simularAuditoria(page);
  await page.goto("/overview");

  await page.getByRole("button", { name: "Administration" }).click();
  await page.getByRole("link", { name: "Audit" }).click();
  await expect(page.getByRole("row", { name: /Clock_002/ })).toBeVisible();

  await page.getByRole("button", { name: "Filter by User" }).click();
  await page.getByRole("option", { name: /Administradora da Unidade Manaus/ }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("row", { name: /Clock_002/ })).toHaveCount(0);
  expect(chamadas.at(-1)?.searchParams.getAll("usuario_id")).toHaveLength(1);

  const linha = page.getByRole("row", { name: /Clock_001/ });
  await expect(linha.getByTitle("Status: In Progress → In Review +1")).toBeVisible();
  await expect(linha.getByText("+1")).toBeVisible();
  await linha.getByRole("button", { name: "View details Clock_001" }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByText("Category")).toBeVisible();
  await expect(painel.getByText("B", { exact: true })).toHaveClass(/line-through/);
  await expect(painel.getByRole("link", { name: "Open Test Case" })).toHaveAttribute("href", "/projetos/projeto-1?caso=caso-1&tc=Clock_001");
});

test("falha: a API recusa e a tela mostra o erro", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await page.route("**/api/auditoria?*", (route) => route.fulfill({ status: 500, json: { type: "about:blank", title: "Erro", status: 500 } }));

  await page.goto("/admin/auditoria");

  // O TanStack Query tenta de novo antes de desistir, como em projetos-dev.spec.ts.
  await expect(page.getByRole("alert")).toContainText("Couldn't load the audit records.", { timeout: 15_000 });
});
