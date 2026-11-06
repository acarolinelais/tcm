import { expect, test, type Page } from "@playwright/test";

import { entrarComoAdmin } from "./api-fixtures";

// Spec 039. Só as rotas da Overview são simuladas; o login e o perfil vêm da API real. Os gráficos do admin
// (spec 064) ficam no overview-graficos.spec.ts.
const meses = ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"];

async function simularOverview(page: Page, total: number, concluidos: number) {
  // O perfil vem da API real; o idioma fica fixo, para o teste não depender do idioma salvo na conta.
  await page.route("**/api/auth/me", async (route) => {
    const resposta = await route.fetch();
    await route.fulfill({ response: resposta, json: { ...(await resposta.json()), idioma_preferido: "en" } });
  });
  await page.route("**/api/overview?*", (route) => route.fulfill({ json: {
    total, concluidos, em_andamento: total - concluidos, a_fazer: 0, atribuidos: 0,
    desempenho: meses.map((mes) => ({ mes, concluidos: mes === "2026-09" ? concluidos : 0 })),
  } }));
  await page.route("**/api/overview/time?*", (route) => route.fulfill({ json: {
    projetos: [], criacao_por_dia: [], concluidos_por_dev: [], concluidos_por_semana: [], done_por_projeto: [],
    andamento_por_time: [], andamento_por_setor: [], em_correcao_por_projeto: [], pass_rate_por_projeto: [],
  } }));
}

test("mostra quanto falta na unidade, pelas contagens vindas da API", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await simularOverview(page, 10, 4);

  await page.goto("/overview");

  // O admin tem o cabeçalho da spec 064 (RN-12): a frase usa o total e os concluídos do escopo.
  await expect(page.getByText("Don't give up, only 6 test cases left!")).toBeVisible();
});

test("falha: sem casos no escopo mostra o estado vazio e nenhum gráfico", async ({ request, page }) => {
  await entrarComoAdmin(request, page);
  await simularOverview(page, 0, 0);

  await page.goto("/overview");

  await expect(page.getByRole("heading", { name: "No Test Cases to show yet" })).toBeVisible();
  await expect(page.locator(".recharts-surface")).toHaveCount(0);
});
