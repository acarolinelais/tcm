import { expect, test, type Page } from "@playwright/test";

import { project, projectId, setupProjectSession, setupTeamsAndModels, teamId } from "./projetos-fixtures";

// Spec 071. A sessão e as rotas são simuladas, como em overview-graficos.spec.ts: o teste não cria dados no banco. A
// conta da meta e do eixo do burndown fica nos testes do backend.
const hoje = new Date();
const dia = (deslocamento: number) => {
  const data = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate() + deslocamento);
  return `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, "0")}-${String(data.getDate()).padStart(2, "0")}`;
};
const kp = { perfil_codigo: "KP", perfil: "Key Person", idioma_preferido: "en", times: [{ id: teamId, nome: "Plataforma" }], time_atual_id: teamId };

async function simularProjetos(page: Page) {
  let atual: Record<string, unknown> = { ...project, modelos_ids: ["model-1"], data_planejada: null };
  const edicoes: { corpo: Record<string, unknown>; fuso: string | null }[] = [];
  await setupTeamsAndModels(page);
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [atual], page: 1, page_size: 20, total_count: 1 } }));
  await page.route(`**/api/projetos/${projectId}?*`, (route) => {
    if (route.request().method() !== "PUT") return route.fallback();
    const corpo = route.request().postDataJSON();
    edicoes.push({ corpo, fuso: new URL(route.request().url()).searchParams.get("fuso_horario") });
    atual = { ...atual, data_planejada: corpo.data_planejada };
    return route.fulfill({ json: atual });
  });
  return { edicoes, dataPlanejada: () => atual.data_planejada };
}

/** O burndown devolve a data que o PUT gravou, para o teste ligar a edição ao Overview. */
async function simularOverview(page: Page, dataPlanejada: () => unknown) {
  // Burndown clássico: começou há 5 dias e termina daqui a 9; o executado para hoje.
  const burndown = Array.from({ length: 15 }, (_, i) => ({ dia: dia(i - 5), planejado: Math.max(30 - 2 * i, 0), executado: i <= 5 ? 30 - i : null }));
  await page.route("**/api/overview?*", (route) => route.fulfill({ json: { total: 30, concluidos: 5, em_andamento: 4, a_fazer: 21, atribuidos: 3, desempenho: [] } }));
  await page.route("**/api/overview/time?*", (route) => route.fulfill({ json: {
    projetos: [{ id: projectId, nome: "Clock 9.5", app: "Clock" }], criacao_por_dia: [], concluidos_por_dev: [], concluidos_por_semana: [],
    done_por_projeto: [], andamento_por_time: [], andamento_por_setor: [], em_correcao_por_projeto: [], pass_rate_por_projeto: [],
  } }));
  await page.route("**/api/overview/projetos/*", (route) => route.fulfill({ json: { data_planejada: dataPlanejada(), meta_diaria: 2.3, burndown, pass_rate: null } }));
}

test("o KP define a data planejada no projeto e vê a meta no burndown do Overview", async ({ page }) => {
  await setupProjectSession(page, kp);
  const { edicoes, dataPlanejada } = await simularProjetos(page);
  await simularOverview(page, dataPlanejada);
  await page.goto("/projetos");

  await page.getByRole("button", { name: "Edit project Clock 9.5" }).click();
  const painel = page.getByRole("dialog");
  await painel.getByRole("button", { name: /Planned date/ }).click();
  await page.getByRole("button", { name: "Today", exact: true }).click();
  await painel.getByRole("button", { name: "Save" }).click();

  await expect(page.getByText("Project updated.")).toBeVisible();
  expect(edicoes[0]).toMatchObject({ corpo: { data_planejada: dia(0) }, fuso: Intl.DateTimeFormat().resolvedOptions().timeZone });

  await page.getByRole("link", { name: "Overview" }).click();
  const cartao = page.getByRole("region", { name: "Planned vs. executed" });
  await expect(cartao.getByText(`Planned date ${hoje.toLocaleDateString("en-US")} · 2.3 per business day`)).toBeVisible();
});

test("falha: data no passado mostra o erro e não salva", async ({ page }) => {
  await setupProjectSession(page, kp);
  const { edicoes } = await simularProjetos(page);
  await page.goto("/projetos");

  await page.getByRole("button", { name: "Edit project Clock 9.5" }).click();
  const painel = page.getByRole("dialog");
  await painel.getByRole("button", { name: /Planned date/ }).click();
  await page.getByRole("button", { name: /previous month/i }).click();
  await page.getByRole("button", { name: /15th/ }).first().click();

  await expect(painel.getByText("The planned date can't be in the past.")).toBeVisible();
  await expect(painel.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(edicoes).toEqual([]);
});
