import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

import { setupProjectSession } from "./projetos-fixtures";

// Spec 063. A sessão e as rotas da Overview são simuladas: o teste não cria dados no banco. O escopo por time (CA-11)
// é do backend e fica nos testes funcionais e de integração.

const dias = Array.from({ length: 30 }, (_, i) => `2026-10-${String(i + 1).padStart(2, "0")}`);
const semanas = Array.from({ length: 12 }, (_, i) => ({ semana: `2026-08-${String(i + 1).padStart(2, "0")}`, concluidos: i % 4 }));

async function simularOverview(page: Page) {
  await page.route("**/api/overview?*", (route) => route.fulfill({ json: {
    total: 12, concluidos: 5, em_andamento: 4, a_fazer: 3, atribuidos: 3,
    desempenho: ["2026-05", "2026-06", "2026-07", "2026-08", "2026-09", "2026-10"].map((mes) => ({ mes, concluidos: 1 })),
  } }));
  await page.route("**/api/overview/time?*", (route) => route.fulfill({ json: {
    projetos: [{ id: "p1", nome: "Alarm 2.0", app: "Alarm" }, { id: "p2", nome: "Clock 9.5", app: "Clock" }],
    criacao_por_dia: [{ projeto_id: "p1", projeto: "Alarm 2.0", media: 0.5 }, { projeto_id: "p2", projeto: "Clock 9.5", media: 1.2 }],
    concluidos_por_dev: [{ usuario_id: "u1", nome: "Ana", concluidos: 3 }, { usuario_id: "u2", nome: "Bia", concluidos: 1 }],
    concluidos_por_semana: semanas,
    done_por_projeto: [{ projeto_id: "p1", projeto: "Alarm 2.0", concluidos: 4, total: 9, em_andamento: 3 }, { projeto_id: "p2", projeto: "Clock 9.5", concluidos: 2, total: 3, em_andamento: 1 }],
    andamento_por_time: [{ id: "t1", nome: "QA", a_fazer: 3, em_andamento: 4, concluidos: 5 }, { id: "t2", nome: "Site", a_fazer: 1, em_andamento: 2, concluidos: 2 }],
    andamento_por_setor: [{ id: "s1", nome: "Engenharia", a_fazer: 4, em_andamento: 6, concluidos: 7 }],
    em_correcao_por_projeto: [{ projeto_id: "p2", projeto: "Clock 9.5", em_correcao: 3 }],
    pass_rate_por_projeto: [{ projeto_id: "p1", projeto: "Alarm 2.0", aprovados: 8, total: 10 }],
  } }));
  await page.route("**/api/overview/projetos/*", (route) => {
    const clock = route.request().url().includes("/projetos/p2");
    return route.fulfill({ json: {
      burndown: dias.map((dia, i) => ({ dia, planejado: Math.max(30 - 2 * i, 0), executado: 30 - i })),
      pass_rate: clock ? null : { rodada_em: "2026-10-30T12:00:00Z", modelos: [{ modelo_id: "m1", modelo: "SAMSUNG S26", aprovados: 3, total: 4 }] },
    } });
  });
  await page.route("**/api/overview/pessoal?*", (route) => route.fulfill({ json: {
    concluidos: 2, atribuidos: 3, por_dificuldade: { Low: 2, Medium: 0, High: 1 },
    entregas_por_dia: dias.map((dia, i) => ({ dia, concluidos: i % 5 === 0 ? 1 : 0 })),
    entregas_por_semana: semanas,
    projetos: [
      { projeto_id: "p1", projeto: "Alarm 2.0", app: "Alarm", concluidos: 2, em_andamento: 1, atribuidos: 4 },
      { projeto_id: "p2", projeto: "Clock 9.5", app: "Clock", concluidos: 7, em_andamento: 3, atribuidos: 11 },
    ],
  } }));
}

test("KP: os gráficos desenham sem violação de acessibilidade, e trocar de projeto refaz o Pass Rate", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "KP", perfil: "Key Person", idioma_preferido: "en" });
  await simularOverview(page);

  await page.goto("/overview");

  const passRate = page.getByRole("region", { name: "Pass Rate by model" });
  await expect(passRate.locator(".recharts-surface")).toBeVisible();
  await expect(page.getByRole("region", { name: "Planned vs. executed" }).locator(".recharts-line")).toHaveCount(2);
  await expect(page.getByRole("region", { name: "Finished per week" }).locator(".recharts-surface")).toBeVisible();

  // CA-09: nenhum problema de acessibilidade nos cartões de gráfico. O título da página e o texto de apoio usam os
  // tokens que o protótipo deixou abaixo do AA (ajuste de 2026-11-04) e ficam fora desta verificação.
  const { violations } = await new AxeBuilder({ page }).include("main section[aria-labelledby]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

  // CA-02: o Clock não tem rodada, então o Pass Rate passa a mostrar o vazio dele.
  const pedido = page.waitForRequest("**/api/overview/projetos/p2*");
  await page.getByRole("button", { name: "Alarm 2.0" }).click();
  await page.getByRole("menuitemradio", { name: "Clock 9.5" }).click();
  await pedido;
  await expect(passRate.getByRole("heading", { name: "No Form Factor round yet" })).toBeVisible();

});

test("KP: o gráfico recebe o foco pelo teclado e as setas percorrem os valores (CA-09)", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "KP", perfil: "Key Person", idioma_preferido: "en" });
  await simularOverview(page);
  await page.goto("/overview");

  const grafico = page.getByRole("region", { name: "Finished per developer" }).locator(".recharts-surface");
  await expect(grafico).toBeVisible();
  await grafico.focus();
  await page.keyboard.press("ArrowRight");

  await expect(page.getByRole("region", { name: "Finished per developer" }).locator(".recharts-tooltip-wrapper")).toBeVisible();
});

test("dev: vê os próprios gráficos, sem o card All", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", idioma_preferido: "en" });
  await simularOverview(page);

  await page.goto("/overview");

  await expect(page.getByRole("region", { name: "Test Cases by difficulty" }).locator(".recharts-surface")).toBeVisible();
  await expect(page.getByText("67%")).toBeVisible();
  await expect(page.getByText("All", { exact: true })).toHaveCount(0);

  // Spec 064, RN-12: os cards do dev são do projeto escolhido no seletor.
  const cards = page.getByRole("region", { name: "Your Test Cases" });
  await expect(cards.getByText("4 TCs")).toBeVisible();
  await page.getByRole("button", { name: "Alarm 2.0" }).click();
  await page.getByRole("menuitemradio", { name: "Clock 9.5" }).click();
  await expect(cards.getByText("11 TCs")).toBeVisible();
});

test("a Overview rola por dentro e o último cartão aparece inteiro, sem corte embaixo", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await setupProjectSession(page, { perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", idioma_preferido: "en" });
  await simularOverview(page);
  await page.goto("/overview");

  const ultimo = page.getByRole("region", { name: "Delivered per week" });
  await expect(ultimo.locator(".recharts-surface")).toBeVisible();
  // A roda do mouse, como a pessoa faz: um contêiner com overflow-hidden não rola por ela.
  await page.mouse.move(900, 500);
  await page.mouse.wheel(0, 3000);
  await expect.poll(async () => {
    const caixa = (await ultimo.boundingBox())!;
    return caixa.y + caixa.height;
  }).toBeLessThanOrEqual(700);

});

// Spec 064.
test("gerente: andamento por time, Pass Rate por projeto e por modelo, sem violação de acessibilidade", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "GERENTE", perfil: "Manager", idioma_preferido: "en" });
  await simularOverview(page);

  await page.goto("/overview");

  await expect(page.getByRole("region", { name: "Progress by team" }).locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Pass Rate by project" }).locator(".recharts-surface")).toBeVisible();
  await expect(page.getByRole("region", { name: "Done per project" }).getByText("4 (44%)")).toBeVisible();
  const porModelo = page.getByRole("region", { name: "Pass Rate by model" });
  await expect(porModelo.locator(".recharts-surface")).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).include("main section[aria-labelledby]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);

  // CA-05: o Clock não tem rodada, então o Pass Rate por modelo passa a mostrar o vazio dele.
  const pedido = page.waitForRequest("**/api/overview/projetos/p2*");
  await page.getByRole("button", { name: "Alarm 2.0" }).click();
  await page.getByRole("menuitemradio", { name: "Clock 9.5" }).click();
  await pedido;
  await expect(porModelo.getByRole("heading", { name: "No Form Factor round yet" })).toBeVisible();
});

test("admin: andamento por setor e Pass Rate dos projetos da unidade, sem violação de acessibilidade", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "ADMIN_UNIDADE", idioma_preferido: "en" });
  await simularOverview(page);

  await page.goto("/overview");

  await expect(page.getByRole("region", { name: "Progress by sector" }).locator(".recharts-bar-rectangle").first()).toBeVisible();
  await expect(page.getByRole("region", { name: "Pass Rate by project" }).locator(".recharts-surface")).toBeVisible();
  await expect(page.getByRole("region", { name: "Pass Rate by model" })).toHaveCount(0);

  // RN-12: saudação, quanto falta e os cards do projeto escolhido; trocar o projeto troca os cards.
  await expect(page.getByRole("heading", { level: 2, name: "Hi Gerente, you are almost done." })).toBeVisible();
  const cards = page.getByRole("region", { name: "Test Cases of the chosen project" });
  await expect(cards.getByText("9 TCs")).toBeVisible();
  await page.getByRole("button", { name: "Alarm 2.0" }).click();
  await page.getByRole("menuitemradio", { name: "Clock 9.5" }).click();
  await expect(cards.getByText("3 TCs")).toBeVisible();

  const { violations } = await new AxeBuilder({ page }).include("main section[aria-labelledby]").analyze();
  expect(violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`)).toEqual([]);
});

test("admin no tema escuro: cada etapa das barras empilhadas passa de 3:1 sobre o cartão", async ({ page }) => {
  await page.addInitScript(() => window.localStorage.setItem("sdf.theme", "dark"));
  await setupProjectSession(page, { perfil_codigo: "ADMIN_UNIDADE", idioma_preferido: "en" });
  await simularOverview(page);
  await page.goto("/overview");

  const andamento = page.getByRole("region", { name: "Progress by sector" });
  await expect(andamento.locator(".recharts-bar-rectangle path").first()).toBeVisible();
  // O axe não mede o preenchimento de SVG: a medida é feita aqui, com as cores calculadas.
  const contrastes = await andamento.evaluate((cartao) => {
    const rgb = (cor: string) => (cor.match(/\d+(\.\d+)?/g) ?? []).slice(0, 3).map(Number);
    const luz = (cor: string) => {
      const [r, g, b] = rgb(cor).map((c) => c / 255).map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    const fundo = luz(getComputedStyle(cartao).backgroundColor);
    return [...cartao.querySelectorAll(".recharts-bar-rectangle path")].slice(0, 3).map((barra) => {
      const [maior, menor] = [luz(getComputedStyle(barra).fill), fundo].sort((x, y) => y - x);
      return Math.round(((maior + 0.05) / (menor + 0.05)) * 100) / 100;
    });
  });
  expect(contrastes.length).toBe(3);
  for (const contraste of contrastes) expect(contraste).toBeGreaterThanOrEqual(3);
});

test("KP: só a área da Overview rola, sem uma segunda barra na página", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 700 });
  await setupProjectSession(page, { perfil_codigo: "KP", perfil: "Key Person", idioma_preferido: "en" });
  await simularOverview(page);
  await page.goto("/overview");
  await expect(page.getByRole("region", { name: "Finished per week" }).locator(".recharts-surface")).toBeVisible();

  // Os resumos sr-only são absolutos: soltos, esticavam o documento além da janela.
  expect(await page.evaluate(() => document.documentElement.scrollHeight)).toBeLessThanOrEqual(700);
});
