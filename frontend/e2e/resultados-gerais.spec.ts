import { expect, test, type Page } from "@playwright/test";

import { managerId, project, setupProjectSession } from "./projetos-fixtures";

/** Specs 032, 033, 053 e 059: General Results por projeto, paginada, com a API simulada. */
const gallery = { ...project, id: "project-2", nome: "Gallery 9.5", app: "Gallery" };
const modelos = [{ id: "s26", nome: "S26 Ultra" }, { id: "s27", nome: "S27 Ultra" }];
const DIAS = ["2026-10-10", "2026-10-09", "2026-10-08", "2026-10-07", "2026-10-06"];
const resultado = (execucao_id: string, valor: string, origem = "SDF") => ({ execucao_id, resultado: valor, sdf_id: origem === "SDF" ? `SDF-${execucao_id}` : null, origem });
const dev = { perfil_codigo: "USUARIO_PADRAO", perfil: "Developer", permissoes: ["projetos.consultar", "test_cases.consultar", "form_factor.consultar", "form_factor.registrar"] };

const TOTAL_CASOS = 45;

function historico(params: URLSearchParams, importado = false) {
  const semana = params.get("semana");
  const datas = semana ? ["2026-09-30"] : DIAS;
  const pagina = Number(params.get("page") ?? 1);
  const tamanho = Number(params.get("page_size") ?? 20);
  const casos = Array.from({ length: TOTAL_CASOS }, (_, indice) => ({
    caso_teste_id: `case-${indice + 1}`,
    tc_id: `Clock_${String(indice + 1).padStart(3, "0")}`,
    responsavel_id: managerId,
    responsavel_identificador: "GER-001",
    // Depois da importação, o S26 passa a ter o SDF do relatório novo (CA-09).
    ultimo_sdf_por_modelo: { s26: importado ? "SDF-IMPORTADO" : `SDF-e26-${indice}-0`, s27: `SDF-e27-${indice}-1` },
    resultados: Object.fromEntries(datas.map((dia, posicao) => [dia, {
      s26: resultado(`e26-${indice}-${posicao}`, posicao % 2 ? "FAIL" : "PASS"),
      s27: resultado(`e27-${indice}-${posicao}`, "PASS", posicao === 0 ? "MANUAL" : "SDF"),
    }])),
  }));
  const primeiro = (pagina - 1) * tamanho;
  return { modelos, datas, items: casos.slice(primeiro, primeiro + tamanho), page: pagina, page_size: tamanho, total_count: TOTAL_CASOS };
}

async function rotas(page: Page, projetos: object[] = [project, gallery]) {
  const consultas: string[] = [];
  const paginas: string[] = [];
  const gravacoes: string[] = [];
  let importado = false;
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: projetos, page: 1, page_size: 100, total_count: projetos.length } }));
  await page.route("**/api/form-factor/general/projetos/*/historico?*", (route) => {
    const url = new URL(route.request().url());
    consultas.push(`${url.pathname.split("/")[5]}?${url.searchParams.get("semana") ?? ""}`);
    paginas.push(url.searchParams.get("page") ?? "");
    return route.fulfill({ json: historico(url.searchParams, importado) });
  });
  await page.route("**/api/form-factor/general/casos/case-1/execucoes?*", (route) => route.fulfill({ json: {
    caso_teste_id: "case-1", tc_id: "Clock_001", responsavel_identificador: "GER-001", modelos,
    datas: ["2026-10-09", "2026-10-10"],
    resultados: { "2026-10-10": { s26: [{ ...resultado("a", "FAIL"), data_reportada: "2026-10-10T09:00:00Z" }, { ...resultado("b", "PASS", "MANUAL"), data_reportada: "2026-10-10T15:00:00Z" }] } },
  } }));
  await page.route("**/api/projetos/*/form-factor/rodadas", (route) => {
    gravacoes.push(`rodada ${route.request().postDataJSON()?.sdf_id ?? ""}`);
    return route.fulfill({ status: 201, json: { id: "round-1", projeto_id: project.id, sdf_id: "SDF-NOVA", total_test_cases: 3, created_at: "2026-10-10T12:00:00Z" } });
  });
  await page.route("**/api/projetos/*/relatorios-sdf", (route) => {
    importado = true;
    return route.fulfill({ status: 201, json: { importacao_id: "imp-1", quantidade_execucoes: 9, quantidade_resultados: 9 } });
  });
  return { consultas, paginas, gravacoes };
}

test("abas por app, linha que expande, resultado, histórico e filtro por semana (spec 059)", async ({ page }) => {
  await setupProjectSession(page);
  const { consultas } = await rotas(page);
  await page.goto("/resultados-gerais");

  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Resultados Gerais");
  await expect(page.getByRole("tab")).toHaveText(["Clock", "Gallery"]);
  await expect(page.getByRole("columnheader")).toHaveCount(1 + 4 + 5 + 1); // número, TC ID, Assignee, Form Factor, SDF ID, 5 datas e Actions
  // O cabeçalho fica centralizado; só as células do corpo sobem para alinhar as pilhas de devices.
  const alinhamentos = await page.getByRole("columnheader").evaluateAll((titulos) => [...new Set(titulos.map((titulo) => getComputedStyle(titulo).verticalAlign))]);
  expect(alinhamentos).toEqual(["middle"]);
  const linha = page.getByRole("row", { name: /Clock_001/ });
  expect(await linha.getByRole("gridcell").first().evaluate((celula) => getComputedStyle(celula).verticalAlign)).toBe("top");
  await expect(linha.getByText("SDF-e26-0-0")).toBeVisible();
  await expect(linha.getByText("S27 Ultra")).toHaveCount(0);

  // A seta abre a linha com os dois devices, sem consulta nova; Enter no mesmo botão fecha (CA-14, CA-16).
  const antes = consultas.length;
  const seta = linha.getByRole("button", { name: "Mostrar todos os devices de Clock_001" });
  await seta.click();
  await expect(seta).toHaveAttribute("aria-expanded", "true");
  await expect(linha.getByText("S27 Ultra")).toBeVisible();
  await expect(linha.getByText("SDF-e27-0-1")).toBeVisible();
  await expect(linha.getByRole("button", { name: "PASS no S27 Ultra, 10/10/2026" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Clock_002/ }).getByText("S27 Ultra")).toHaveCount(0);
  await expect(seta).toBeFocused();
  await page.keyboard.press("Enter");
  await expect(seta).toHaveAttribute("aria-expanded", "false");
  await expect(linha.getByText("S27 Ultra")).toHaveCount(0);
  expect(consultas.length).toBe(antes);

  // Janela do resultado: SDF ID, origem e só Fechar.
  await linha.getByRole("button", { name: "PASS no S26 Ultra, 10/10/2026" }).click();
  const janela = page.getByRole("dialog");
  await expect(janela.getByRole("heading")).toHaveText("Clock_001 · S26 Ultra · 10/10/2026");
  await expect(janela.getByText("SDF-e26-0-0")).toBeVisible();
  await expect(janela.getByText("Importado da planilha")).toBeVisible();
  await janela.getByRole("button", { name: "Fechar" }).click();
  await expect(janela).toBeHidden();

  // Histórico da linha: grade devices × datas, com as duas execuções do dia (CA-18).
  await linha.getByRole("button", { name: "Ver histórico de execuções Clock_001" }).click();
  const painel = page.getByRole("dialog");
  await expect(painel.getByText("GER-001")).toBeVisible();
  await expect(painel.getByRole("button", { name: /no S26 Ultra, 10\/10\/2026/ })).toHaveCount(2);
  await page.keyboard.press("Escape");
  await expect(painel).toBeHidden();

  // A aba troca o projeto e fica no endereço.
  await page.getByRole("tab", { name: "Gallery" }).click();
  await expect.poll(() => consultas.at(-1)).toBe(`${gallery.id}?`);
  await expect(page).toHaveURL(/\?projeto=project-2$/);

  // Calendário: escolher uma semana consulta só o período.
  await page.getByRole("button", { name: /^Dia ou semana: / }).click();
  await page.getByRole("button", { name: /^Semana \d+, \d{4}$/ }).first().click();
  await expect.poll(() => consultas.at(-1)).toMatch(new RegExp(`^${gallery.id}\\?\\d{4}-W\\d{2}$`));
  await expect(page.getByRole("columnheader")).toHaveCount(1 + 4 + 1 + 1);

  // Recarregar mantém o projeto escolhido.
  await page.reload();
  await expect(page.getByRole("tab", { name: "Gallery" })).toHaveAttribute("aria-selected", "true");
});

test("a gestão cria rodada e importa relatório pela General Results (CA-08, CA-09)", async ({ page }) => {
  await setupProjectSession(page);
  const { consultas, gravacoes } = await rotas(page);
  await page.goto("/resultados-gerais");
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();

  await page.getByRole("button", { name: "Criar rodada de testes" }).click();
  const dialogo = page.getByRole("dialog");
  await dialogo.getByLabel("ID do SDF").fill("SDF-NOVA");
  await dialogo.getByRole("button", { name: "Criar rodada de testes" }).click();
  await expect(page.getByText("Rodada criada.")).toBeVisible();
  expect(gravacoes).toContain("rodada SDF-NOVA");

  const antes = consultas.length;
  await page.locator('input[type="file"]').setInputFiles({ name: "123456-789012_0_Test_1_Detail.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("relatorio") });
  await page.getByRole("button", { name: "Importar", exact: true }).click();
  await expect(page.getByText("Relatório importado: 9 execuções e 9 resultados.")).toBeVisible();
  // A tabela consulta de novo, sem recarregar a página, e mostra o SDF do relatório novo.
  await expect.poll(() => consultas.length).toBeGreaterThan(antes);
  await expect(page.getByRole("row", { name: /Clock_001/ })).toContainText("SDF-IMPORTADO");
});

test("falha: um relatório recusado pela API mostra a mensagem dela e a tabela não muda (CA-10)", async ({ page }) => {
  await setupProjectSession(page);
  const { consultas } = await rotas(page);
  await page.route("**/api/projetos/*/relatorios-sdf", (route) => route.fulfill({
    status: 403,
    contentType: "application/problem+json",
    body: JSON.stringify({ title: "Acesso negado", detail: "O projeto está fora do escopo permitido.", status: 403 }),
  }));
  await page.goto("/resultados-gerais");
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  const antes = consultas.length;

  await page.locator('input[type="file"]').setInputFiles({ name: "fora-do-escopo.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("relatorio") });
  await page.getByRole("button", { name: "Importar", exact: true }).click();

  await expect(page.getByText("O projeto está fora do escopo permitido.")).toBeVisible();
  expect(consultas.length).toBe(antes);
});

test("o dev vê a General Results dos projetos do time, sem os botões de gerência (CA-01, CA-06)", async ({ page }) => {
  await setupProjectSession(page, dev);
  await rotas(page);
  await page.goto("/");

  await page.getByRole("link", { name: "Resultados Gerais" }).click();
  await expect(page.getByRole("tab")).toHaveText(["Clock", "Gallery"]);
  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Criar rodada de testes" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Importar relatório SDF" })).toHaveCount(0);
});

test("com 15 projetos, a última aba fica visível ao receber o foco pelo teclado (CA-13)", async ({ page }) => {
  await setupProjectSession(page);
  const muitos = Array.from({ length: 15 }, (_, i) => ({ ...project, id: `projeto-${i}`, nome: `App ${i} 9.5`, app: `Aplicativo com nome comprido ${String(i).padStart(2, "0")}` }));
  const { consultas } = await rotas(page, muitos);
  await page.goto("/resultados-gerais");

  const ultima = page.getByRole("tab", { name: muitos[14].app });
  // As abas não cabem: a última começa fora da vista.
  await expect(ultima).not.toBeInViewport();
  await page.getByRole("tab", { name: muitos[0].app }).focus();
  await page.keyboard.press("End");
  await expect(ultima).toBeFocused();
  await expect(ultima).toBeInViewport({ ratio: 1 });
  await page.keyboard.press("Enter");
  await expect.poll(() => consultas.at(-1)).toBe("projeto-14?");
});

test("numa janela estreita, TC ID e Assignee continuam visíveis ao rolar para os lados", async ({ page }) => {
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
  await expect(page.getByRole("row", { name: /Clock_001/ }).getByText("GER-001")).toBeInViewport();
});

test("navega até a última página com as mesmas colunas de data (spec 033)", async ({ page }) => {
  await setupProjectSession(page);
  const { paginas } = await rotas(page);
  await page.goto("/resultados-gerais");

  await expect(page.getByRole("row", { name: /Clock_001/ })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(1 + 20);
  const datas = await page.getByRole("columnheader").allTextContents();

  await page.getByRole("button", { name: "Página 3" }).click();
  await expect(page.getByRole("row", { name: /Clock_045/ })).toBeVisible();
  await expect(page.getByRole("row")).toHaveCount(1 + 5);
  await expect(page.getByRole("button", { name: "Próxima página" })).toBeDisabled();
  expect(await page.getByRole("columnheader").allTextContents()).toEqual(datas);
  expect(paginas.at(-1)).toBe("3");
});
