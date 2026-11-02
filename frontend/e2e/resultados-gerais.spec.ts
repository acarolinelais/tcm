import { expect, test, type Page } from "@playwright/test";

import { managerId, project, setupProjectSession } from "./projetos-fixtures";

/** Specs 032, 033 e 053: Resultados Gerais por projeto, paginados, com a API simulada. */
const gallery = { ...project, id: "project-2", nome: "Gallery 9.5", app: "Gallery" };
const modelos = [{ id: "s26", nome: "S26 Ultra" }, { id: "s27", nome: "S27 Ultra" }];
const DIAS = ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06", "2026-10-05", "2026-10-04"];
const resultado = (execucao_id: string, valor: string, origem = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });

const TOTAL_CASOS = 45;

function historico(params: URLSearchParams) {
  const semana = params.get("semana");
  const datas = semana ? ["2026-09-30"] : DIAS;
  const pagina = Number(params.get("page") ?? 1);
  const tamanho = Number(params.get("page_size") ?? 20);
  const casos = Array.from({ length: TOTAL_CASOS }, (_, indice) => ({
    caso_teste_id: `case-${indice + 1}`,
    tc_id: `Clock_${String(indice + 1).padStart(3, "0")}`,
    responsavel_id: managerId,
    responsavel_identificador: "GER-001",
    modelo_padrao_id: "s27",
    resultados: Object.fromEntries(datas.map((dia, posicao) => [dia, {
      s26: resultado(`e26-${indice}-${posicao}`, posicao % 2 ? "FAIL" : "PASS"),
      s27: resultado(`e27-${indice}-${posicao}`, "PASS", posicao === 0 ? "MANUAL" : "SDF"),
    }])),
  }));
  const primeiro = (pagina - 1) * tamanho;
  return { modelos, datas, modelo_destacado_id: null, items: casos.slice(primeiro, primeiro + tamanho), page: pagina, page_size: tamanho, total_count: TOTAL_CASOS };
}

async function rotas(page: Page, projetos: object[] = [project, gallery]) {
  const consultas: string[] = [];
  const paginas: string[] = [];
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: projetos, page: 1, page_size: 100, total_count: projetos.length } }));
  await page.route("**/api/form-factor/general/projetos/*/historico?*", (route) => {
    const url = new URL(route.request().url());
    consultas.push(`${url.pathname.split("/")[5]}?${url.searchParams.get("semana") ?? ""}`);
    paginas.push(url.searchParams.get("page") ?? "");
    return route.fulfill({ json: historico(url.searchParams) });
  });
  await page.route("**/api/form-factor/general/casos/case-1/execucoes?*", (route) => route.fulfill({ json: {
    caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_identificador: "GER-001", modelos,
    datas: ["2026-10-09", "2026-10-10"],
    resultados: { "2026-10-10": { s26: [{ ...resultado("a", "FAIL"), data_reportada: "2026-10-10T09:00:00Z" }, { ...resultado("b", "PASS", "MANUAL"), data_reportada: "2026-10-10T15:00:00Z" }] } },
  } }));
  return { consultas, paginas };
}

/** Abre o seletor de projeto do título e digita na busca (spec 053). */
async function buscarProjeto(page: Page, atual: string, termo: string) {
  await page.getByRole("button", { name: atual }).click();
  await page.getByRole("searchbox", { name: "Buscar projeto" }).fill(termo);
}

test("troca de projeto e de modelo, abre o resultado e o resumo e filtra por semana", async ({ page }) => {
  await setupProjectSession(page);
  const { consultas } = await rotas(page);
  await page.goto("/resultados-gerais");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Clock 9.5");
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

  // O seletor do título busca e troca de projeto (spec 053), e o projeto fica no endereço.
  await buscarProjeto(page, "Clock 9.5", "gal");
  await page.getByRole("menuitemradio", { name: "Gallery 9.5" }).click();
  await expect.poll(() => consultas.at(-1)).toBe(`${gallery.id}?`);
  await expect(page).toHaveURL(/\?projeto=project-2$/);

  // Calendário: escolher uma semana consulta só o período.
  await page.getByRole("button", { name: /^Dia ou semana: / }).click();
  await page.getByRole("button", { name: /^Semana \d+, \d{4}$/ }).first().click();
  await expect.poll(() => consultas.at(-1)).toMatch(new RegExp(`^${gallery.id}\\?\\d{4}-W\\d{2}$`));
  await expect(page.getByRole("columnheader")).toHaveCount(2 + 1 + 1);

  // Recarregar mantém o projeto escolhido.
  await page.reload();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Gallery 9.5");
});

test("com 40 projetos, a tela não passa da borda, a busca acha o último e avisa quando não acha nada (spec 053, CA-01, CA-03)", async ({ page }) => {
  await setupProjectSession(page);
  const muitos = Array.from({ length: 40 }, (_, i) => ({
    ...project, id: `projeto-${i}`, nome: `Projeto com nome comprido ${String(i).padStart(2, "0")}`,
  }));
  const { consultas } = await rotas(page, muitos);
  await page.goto("/resultados-gerais");

  const titulo = page.getByRole("heading", { level: 1 });
  await expect(titulo).toHaveText(muitos[0].nome);
  await expect(page.getByRole("tab")).toHaveCount(0);
  // O layout corta o que sobra (overflow-hidden), então a borda é medida no próprio cabeçalho da tela.
  await expect(titulo).toBeInViewport();
  expect(await titulo.locator("xpath=ancestor::header[1]").evaluate((cabecalho) => cabecalho.scrollWidth <= cabecalho.clientWidth)).toBe(true);

  await buscarProjeto(page, muitos[0].nome, "39");
  await page.getByRole("menuitemradio", { name: muitos[39].nome }).click();
  await expect.poll(() => consultas.at(-1)).toBe("projeto-39?");

  // Busca sem resultado: aviso, nenhuma consulta nova e o mesmo projeto aberto.
  const antes = consultas.length;
  await buscarProjeto(page, muitos[39].nome, "inexistente");
  await expect(page.getByText("Nenhum projeto encontrado")).toBeVisible();
  // O primeiro Escape limpa a busca; o segundo fecha o menu.
  await page.keyboard.press("Escape");
  await page.keyboard.press("Escape");
  await expect(page.getByRole("searchbox", { name: "Buscar projeto" })).toBeHidden();
  expect(consultas.length).toBe(antes);
  await expect(titulo).toHaveText(muitos[39].nome);
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

test("navega até a última página com as mesmas colunas de data (spec 033)", async ({ page }) => {
  await setupProjectSession(page);
  const { paginas } = await rotas(page);
  await page.goto("/resultados-gerais");

  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(1 + 20);
  await expect(page.getByText("45 no total")).toHaveCount(0);
  const datas = await page.getByRole("columnheader").allTextContents();

  await page.getByRole("button", { name: "Página 3" }).click();
  await expect(page.getByRole("row", { name: /Clock_045/ })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(1 + 5);
  await expect(page.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  expect(await page.getByRole("columnheader").allTextContents()).toEqual(datas);
  expect(paginas.at(-1)).toBe("3");
});
