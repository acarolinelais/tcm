import { expect, test, type Page } from "@playwright/test";

import { project, setupProjectSession } from "./projetos-fixtures";
import { semTextoCortado, semTransicao, temFocoVisivel } from "./visual-helpers";

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
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Linha do tempo");
  // Com um projeto só, o seletor mostra só o nome, sem menu.
  await expect(page.getByText(project.nome, { exact: true })).toBeVisible();
  await expect(page.getByRole("list", { name: "terça-feira, 29 de dezembro" }).getByRole("button", { name: "Clock_00046, Ana, 2 mudanças" })).toBeVisible();
  await expect(page.getByRole("list", { name: "quinta-feira, 31 de dezembro" }).getByRole("button", { name: /^Clock_00001, Caio/ })).toBeVisible();
  expect(consultas.at(-1)?.get("inicio")).toBe("2026-12-28");
  expect(consultas.at(-1)?.get("fim")).toBe("2027-01-03");

  // CA-03: filtrar Ana e Bia esconde o card do Caio.
  await page.getByRole("button", { name: "Filtrar" }).click();
  await page.getByRole("button", { name: "Pessoas" }).click();
  await page.getByRole("option", { name: "Ana" }).click();
  await page.getByRole("option", { name: "Bia" }).click();
  // Escape fecha primeiro a lista e depois o painel (com o painel aberto o resto da tela fica oculto).
  await page.keyboard.press("Escape");
  await expect(page.getByRole("option", { name: "Ana" })).toBeHidden();
  // O foco volta ao painel de forma assíncrona: um Escape que chega antes se perde, então repete até fechar.
  await expect(async () => {
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toBeHidden({ timeout: 500 });
  }).toPass({ timeout: 5000 });
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

/** Spec 057: o visual novo da Timeline (CA-03, CA-06, CA-11 e CA-12), com a mesma API simulada. */
const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const AZUL = "rgb(0, 129, 249)"; // --accent-text do tema claro (#0081f9)

async function abrirTimeline(page: Page, idioma: string) {
  await page.clock.setFixedTime(new Date(2026, 11, 30, 12));
  await setupProjectSession(page, { idioma_preferido: idioma });
  await rotas(page);
  await page.goto("/timeline");
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByRole("button", { name: /Clock_00046/ })).toBeVisible({ timeout: 15_000 });
}

const paginaDaTimeline = (page: Page) => page.getByRole("heading", { level: 1 }).locator("xpath=ancestor::section[1]");

for (const idioma of IDIOMAS) {
  test(`a barra, o cabeçalho da grade e os cards não cortam texto em Dia, Semana e Mês (${idioma})`, async ({ page }) => {
    await abrirTimeline(page, idioma);
    await expect(page.getByRole("heading", { level: 1 })).toHaveCSS("color", AZUL);

    // Dia, Semana e Mês, na ordem da barra.
    for (const visao of [0, 1, 2]) {
      await page.getByRole("radio").nth(visao).click();
      await expect(page.getByRole("radio").nth(visao)).toBeChecked();
      const cortados = await semTextoCortado(paginaDaTimeline(page));
      // O nome do mês vaza de propósito para as colunas vizinhas (a grade do Mês tem colunas estreitas).
      expect(cortados.filter((texto) => !/\d{4}/.test(texto)), `visão ${visao}`).toEqual([]);
    }
  });
}

test("o dia de hoje fica em azul e sublinhado, e a linha do momento atual é azul", async ({ page }) => {
  await abrirTimeline(page, "en");

  const hoje = page.getByText("30", { exact: true });
  await expect(hoje).toHaveCSS("color", AZUL);
  await expect(page.getByTestId("linha-agora")).toHaveCSS("background-color", AZUL);
  await expect(page.getByTestId("fundo-grade")).toBeVisible();
});

test("só com o teclado, o Filter abre e fecha, e a barra e os cards mostram o foco", async ({ page }) => {
  await abrirTimeline(page, "en");
  await semTransicao(page);

  for (const nome of [/^Previous period$/, /^Today$/]) {
    const controle = page.getByRole("button", { name: nome });
    await controle.focus();
    expect(await temFocoVisivel(controle), String(nome)).toBe(true);
  }
  const card = page.getByRole("button", { name: /^Clock_00046/ });
  await card.focus();
  expect(await temFocoVisivel(card)).toBe(true);

  const filtro = page.getByRole("button", { name: "Filter" });
  await filtro.focus();
  expect(await temFocoVisivel(filtro)).toBe(true);
  await page.keyboard.press("Enter");
  await expect(page.getByRole("dialog", { name: "Timeline filters" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();
  await expect(filtro).toBeFocused();
});

test("o texto do card não passa por baixo do avatar, mesmo com nome longo e muitas mudanças", async ({ page }) => {
  await page.clock.setFixedTime(new Date(2026, 11, 30, 12));
  await setupProjectSession(page);
  await rotas(page);
  const longa = { id: "caro", nome: "Caroline Laís", cor_avatar: "azul" };
  const muitas = Array.from({ length: 11 }, (_, i) => mudanca("status", "To-Do", "InProgress", `2026-12-30T1${i % 10}:00:00Z`, "Caroline Laís"));
  // A rota registrada por último vale primeiro: devolve só o card longo.
  await page.route(`**/api/projetos/${project.id}/timeline?*`, (route) => route.fulfill({ json: {
    pessoas: [longa], casos: [{ id: "k1", tc_id: "Keyboard_000001", title: null }],
    cards: [card(longa, { id: "k1", tc_id: "Keyboard_000001", title: "" }, "2026-12-30", muitas)],
  } }));
  await page.goto("/timeline");

  const botao = page.getByRole("button", { name: /^Keyboard_000001/ });
  await expect(botao).toBeVisible({ timeout: 15_000 });
  const sobrepostos = await botao.evaluate((el) => {
    const avatar = el.lastElementChild!.getBoundingClientRect();
    const texto = el.children[1];
    return [...texto.children].filter((linha) => linha.getBoundingClientRect().right > avatar.left + 0.5).map((linha) => linha.textContent);
  });
  expect(sobrepostos).toEqual([]);
});
