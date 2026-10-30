import { expect, test, type Page } from "@playwright/test";

import { entrarComoAdmin } from "./api-fixtures";

// Spec 039. Só a rota da Overview é simulada; o login e o perfil vêm da API real.
const meses = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

async function simularOverview(page: Page, total: number, concluidos: number) {
  await page.route("**/api/overview?*", (route) => route.fulfill({ json: {
    total, concluidos, em_andamento: total - concluidos, a_fazer: 0, atribuidos: 0,
    desempenho: meses.map((mes) => ({ mes, concluidos: mes === "2026-09" ? concluidos : 0 })),
  } }));
}

test("mostra as contagens do escopo vindas da API", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await simularOverview(page, 10, 4);

  await page.goto("/overview");

  await expect(page.getByText("4 TCs")).toBeVisible();
  await expect(page.getByText("10 TCs")).toBeVisible();
  await expect(page.getByText("40%", { exact: true })).toBeVisible();
});

test("falha: sem casos no escopo mostra o estado vazio e nenhum gráfico", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await simularOverview(page, 0, 0);

  await page.goto("/overview");

  await expect(page.getByRole("heading", { name: "No Test Cases to show yet" })).toBeVisible();
  await expect(page.getByRole("img", { name: "Monthly team performance line chart" })).toHaveCount(0);
});
