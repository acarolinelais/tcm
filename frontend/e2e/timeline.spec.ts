import { expect, test, type Page } from "@playwright/test";

import { project, setupProjectSession } from "./projetos-fixtures";

/** Spec 054: Timeline dos Test Cases com a API simulada. "Hoje" é quarta, 30/12/2026. */
const pessoas = [
  { id: "ana", nome: "Ana", cor_avatar: "roxo" },
  { id: "bia", nome: "Bia", cor_avatar: "verde" },
  { id: "caio", nome: "Caio", cor_avatar: "azul" },
];
const casos = [{ id: "c46", tc_id: "Clock_00046", title: "Alarme" }, { id: "c01", tc_id: "Clock_00001", title: "Relógio" }];
const mudanca = (campo: string, antes: string, depois: string, alterado_em: string, nome: string) => ({
  campo, valor_anterior: antes, valor_novo: depois, usuario_nome: nome, usuario_perfil: "Key Person", origem: "api", alterado_em,
});
const card = (pessoa: (typeof pessoas)[number], caso: (typeof casos)[number], dia: string, alteracoes: ReturnType<typeof mudanca>[]) => ({
  caso_teste_id: caso.id, tc_id: caso.tc_id, responsavel_id: pessoa.id, responsavel_nome: pessoa.nome, responsavel_cor_avatar: pessoa.cor_avatar,
  dia, primeira_em: `${dia}T13:00:00Z`, alteracoes,
});
const cards = [
  card(pessoas[0], casos[0], "2026-12-29", [
    mudanca("category", "A", "B", "2026-12-29T15:00:00Z", "Ana"),
    mudanca("status", "InProgress", "InReview", "2026-12-29T13:00:00Z", "Ana"),
  ]),
  card(pessoas[1], casos[1], "2026-12-30", [mudanca("status", "To-Do", "InProgress", "2026-12-30T13:00:00Z", "Bia")]),
  card(pessoas[2], casos[1], "2026-12-31", [mudanca("difficulty", "Low", "High", "2026-12-31T13:00:00Z", "Caio")]),
];

async function rotas(page: Page) {
  const consultas: URLSearchParams[] = [];
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [project], page: 1, page_size: 100, total_count: 1 } }));
  await page.route(`**/api/projetos/${project.id}/timeline?*`, (route) => {
    const params = new URL(route.request().url()).searchParams;
    consultas.push(params);
    const usuarios = params.getAll("responsavel_ids");
    const filtrados = cards.filter((item) => !usuarios.length || usuarios.includes(item.responsavel_id));
    return route.fulfill({ json: { pessoas, casos, cards: filtrados } });
  });
  return consultas;
}

test("mostra a semana, filtra duas pessoas, troca para Mês e abre um card", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 11, 30, 12));
  await setupProjectSession(page);
  const consultas = await rotas(page);
  await page.goto("/timeline");

  // CA-01: a semana atual, de segunda a domingo, com os cards nos dias certos.
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(project.nome);
  await expect(page.getByRole("list", { name: "terça-feira, 29 de dezembro" }).getByRole("button", { name: "Clock_00046, Ana, 2 mudanças" })).toBeVisible();
  await expect(page.getByRole("list", { name: "quinta-feira, 31 de dezembro" }).getByRole("button", { name: /^Clock_00001, Caio/ })).toBeVisible();
  expect(consultas.at(-1)?.get("inicio")).toBe("2026-12-28");
  expect(consultas.at(-1)?.get("fim")).toBe("2027-01-03");

  // CA-03: filtrar Ana e Bia esconde o card do Caio.
  await page.getByRole("button", { name: "Pessoas" }).click();
  await page.getByRole("option", { name: "Ana" }).click();
  await page.getByRole("option", { name: "Bia" }).click();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("button", { name: /^Clock_00001, Caio/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /^Clock_00001, Bia/ })).toBeVisible();
  expect(consultas.at(-1)?.getAll("responsavel_ids")).toEqual(["ana", "bia"]);

  // CA-05: o Mês de dezembro, com os filtros mantidos e o card compacto.
  await page.getByRole("radio", { name: "Mês" }).click();
  await expect(page.getByRole("list", { name: /de dezembro$/ })).toHaveCount(31);
  expect(consultas.at(-1)?.get("inicio")).toBe("2026-12-01");
  expect(consultas.at(-1)?.getAll("responsavel_ids")).toEqual(["ana", "bia"]);

  // A grade rola por dentro; a página não rola para os lados.
  const rolaParaOsLados = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(rolaParaOsLados).toBe(false);

  // CA-02: o card abre o painel com as duas mudanças, antes e depois.
  await page.getByRole("button", { name: "Clock_00046, Ana, 2 mudanças" }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByRole("heading", { name: "Clock_00046" })).toBeVisible();
  await expect(painel.getByRole("listitem")).toHaveCount(2);
  await expect(painel.getByText("Em revisão")).toBeVisible();
  await expect(painel.getByRole("button", { name: "Abrir Test Case" })).toBeVisible();
});
