import { expect, test, type Page } from "@playwright/test";

import { managerId, project, setupProjectSession } from "./projetos-fixtures";

/** Spec 032: Resultados Gerais por projeto, com a API simulada. */
const gallery = { ...project, id: "project-2", nome: "Gallery 9.5", app: "Gallery" };
const modelos = [{ id: "s26", nome: "S26 Ultra" }, { id: "s27", nome: "S27 Ultra" }];
const DIAS = ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-04"];
const resultado = (execucao_id: string, valor: string, origem = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });

function historico(params: URLSearchParams) {
  const semana = params.get("semana");
  const datas = semana ? ["2026-09-30"] : DIAS;
  const casos = Array.from({ length: 3 }, (_, indice) => ({
    caso_teste_id: `case-${indice + 1}`,
    tc_id: `Clock_00${indice + 1}`,
    responsavel_id: managerId,
    responsavel_identificador: "GER-001",
    modelo_padrao_id: "s27",
    resultados: Object.fromEntries(datas.map((dia, posicao) => [dia, {
      s26: resultado(`e26-${indice}-${posicao}`, posicao % 2 ? "FAIL" : "PASS"),
      s27: resultado(`e27-${indice}-${posicao}`, "PASS", posicao === 0 ? "MANUAL" : "SDF"),
    }])),
  }));
  return { modelos, datas, modelo_destacado_id: null, casos };
}

async function rotas(page: Page) {
  const consultas: string[] = [];
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [project, gallery], page: 1, page_size: 100, total_count: 2 } }));
  await page.route("**/api/form-factor/general/projetos/*/historico?*", (route) => {
    const url = new URL(route.request().url());
    consultas.push(`${url.pathname.split("/")[5]}?${url.searchParams.get("semana") ?? ""}`);
    return route.fulfill({ json: historico(url.searchParams) });
  });
  await page.route("**/api/form-factor/general/casos/case-1/execucoes?*", (route) => route.fulfill({ json: {
    caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_identificador: "GER-001", modelos,
    datas: ["2026-10-09", "2026-10-10"],
    resultados: { "2026-10-10": { s26: [{ ...resultado("a", "FAIL"), data_reportada: "2026-10-10T09:00:00Z" }, { ...resultado("b", "PASS", "MANUAL"), data_reportada: "2026-10-10T15:00:00Z" }] } },
  } }));
  return consultas;
}

test("troca de aba e de modelo, abre o resultado e o resumo e filtra por semana", async ({ page }) => {
  await setupProjectSession(page);
  const consultas = await rotas(page);
  await page.goto("/resultados-gerais");

  await expect(page.getByRole("tab", { name: "Clock 9.5" })).toHaveAttribute("aria-selected", "true");
  const linha = page.getByRole("row", { name: /Clock_001/ });
  await expect(linha.getByRole("button", { name: "PASS no S27 Ultra, 10/10/2026" })).toBeVisible();
  await expect(page.getByRole("columnheader")).toHaveCount(2 + 7 + 1);

  // Form Factor da linha: só a linha 1 muda, sem nova consulta.
  const antes = consultas.length;
  await linha.getByRole("button", { name: "Form Factor Clock_001" }).click();
  await page.getByRole("option", { name: "S26 Ultra" }).click();
  await expect(linha.getByRole("button", { name: "FAIL no S26 Ultra, 09/10/2026" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_002/ }).getByRole("button", { name: "Form Factor Clock_002" })).toContainText("S27 Ultra");
  expect(consultas.length).toBe(antes);

  // Janela do resultado: SDF ID, origem e só Fechar.
  await linha.getByRole("button", { name: "PASS no S26 Ultra, 10/10/2026" }).click();
  const janela = page.getByRole("dialog");
  await expect(janela.getByRole("heading")).toHaveText("Clock_001 · S26 Ultra · 10/10/2026");
  await expect(janela.getByText("SDF-e26-0-0")).toBeVisible();
  await expect(janela.getByText("Importado da planilha")).toBeVisible();
  await janela.getByRole("button", { name: "Fechar" }).click();
  await expect(janela).toBeHidden();

  // Resumo de execuções: grade devices × datas, com as duas execuções do dia.
  await linha.getByRole("button", { name: "Resumo de execuções Clock_001" }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByText("GER-001")).toBeVisible();
  await expect(painel.getByRole("button", { name: /no S26 Ultra, 10\/10\/2026/ })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(painel).toBeHidden();

  // Outra aba consulta o outro projeto.
  await page.getByRole("tab", { name: "Gallery 9.5" }).click();
  await expect.poll(() => consultas.at(-1)).toBe(`${gallery.id}?`);

  // Calendário: escolher uma semana consulta só o período.
  await page.getByRole("button", { name: /^Dia ou semana: / }).click();
  await page.getByRole("button", { name: /^Semana \d+, \d{4}$/ }).first().click();
  await expect.poll(() => consultas.at(-1)).toMatch(new RegExp(`^${gallery.id}\\?\\d{4}-W\\d{2}$`));
  await expect(page.getByRole("columnheader")).toHaveCount(2 + 1 + 1);
});

test("numa janela estreita, TC ID e Form Factor continuam visíveis ao rolar para os lados", async ({ page }) => {
  await page.setViewportSize({ width: 760, height: 800 });
  await setupProjectSession(page);
  await rotas(page);
  await page.goto("/resultados-gerais");
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();

  const rolagem = page.locator(".thin-scroll").filter({ has: page.getByRole("grid") }).first();
  const tcId = page.getByRole("rowheader", { name: /Clock_001/ });
  const inicio = (await tcId.boundingBox())!.x;
  await rolagem.evaluate((elemento) => { elemento.scrollLeft = elemento.scrollWidth; });

  await expect.poll(async () => rolagem.evaluate((elemento) => elemento.scrollLeft)).toBeGreaterThan(0);
  expect(Math.abs((await tcId.boundingBox())!.x - inicio)).toBeLessThan(2);
  await expect(page.getByRole("button", { name: "Form Factor Clock_001" })).toBeInViewport();
});
