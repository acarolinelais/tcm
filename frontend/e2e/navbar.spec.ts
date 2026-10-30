import { expect, test, type Page } from "@playwright/test";

import { project, setupProjectSession } from "./projetos-fixtures";

/** Spec 050: a Navbar sem sobreposição (RN-10, CA-09), com a API simulada. */

const IDIOMAS = ["en", "pt-BR", "ko"] as const;
const TEMAS = ["light", "dark"] as const;
const LARGURAS = [1280, 1440, 1920];
// Nome longo, para a coluna da direita ficar no limite do truncamento.
const NOME_LONGO = "Maximiliana Albuquerque";

async function abrir(page: Page, idioma: string, tema: string, rota = "/projetos") {
  // Sem animação, a largura da Sidebar muda na hora e as caixas podem ser medidas logo depois do clique.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript((valor) => window.localStorage.setItem("sdf.theme", valor), tema);
  await setupProjectSession(page, { idioma_preferido: idioma, nome: NOME_LONGO });
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: { items: [project], page: 1, page_size: 20, total_count: 1 } }));
  await page.goto(rota);
  // A primeira carga compila a página no Vite: com vários workers, pode passar dos 5s padrão.
  await expect(page.getByRole("banner").locator('input[type="search"]')).toBeVisible({ timeout: 15_000 });
}

/** Caixas da busca, do tema, do idioma e do usuário, da esquerda para a direita. */
async function caixas(page: Page) {
  const cabecalho = page.getByRole("banner");
  const elementos = [
    cabecalho.locator('label:has(input[type="search"])'),
    cabecalho.locator("button[aria-pressed]"),
    cabecalho.locator('button[aria-haspopup="menu"]').first(),
    cabecalho.locator('button[aria-haspopup="menu"]').last(),
  ];
  return Promise.all(elementos.map(async (elemento) => (await elemento.boundingBox())!));
}

for (const idioma of IDIOMAS) {
  for (const tema of TEMAS) {
    test(`busca, tema, idioma e usuário não se sobrepõem (${idioma}, ${tema})`, async ({ page }) => {
      await abrir(page, idioma, tema);
      for (const recolhida of [false, true]) {
        if (recolhida) await page.locator("aside button[aria-expanded]").first().click();
        for (const largura of LARGURAS) {
          await page.setViewportSize({ width: largura, height: 900 });
          const [busca, temaBotao, idiomaBotao, usuario] = await caixas(page);
          const onde = `${largura}px, Sidebar ${recolhida ? "recolhida" : "aberta"}`;
          expect(busca.width, `busca visível em ${onde}`).toBeGreaterThan(120);
          expect(busca.width, `busca até 362px em ${onde}`).toBeLessThanOrEqual(362.5);
          // Folga mínima de 8px entre vizinhos: nada encosta nem fica por cima.
          for (const [antes, depois] of [[busca, temaBotao], [temaBotao, idiomaBotao], [idiomaBotao, usuario]]) {
            expect(depois.x - (antes.x + antes.width), `folga em ${onde}`).toBeGreaterThanOrEqual(8);
          }
        }
      }
    });
  }
}

for (const idioma of IDIOMAS) {
  test(`texto em Inter na busca, no título e nos botões (${idioma})`, async ({ page }) => {
    await abrir(page, idioma, "light");
    const fonte = (seletor: string) => page.locator(seletor).first().evaluate((elemento) => getComputedStyle(elemento).fontFamily);

    for (const seletor of ['header input[type="search"]', "h1", 'header button[aria-haspopup="menu"]', "main button"]) {
      expect(await fonte(seletor), seletor).toContain("Inter");
    }
  });
}

test("no escuro, a busca da Navbar tem o fundo dos painéis e a borda #2f2f2f", async ({ page }) => {
  await abrir(page, "en", "dark");
  const busca = page.getByRole("banner").locator('label:has(input[type="search"])');
  const estilo = await busca.evaluate((elemento) => {
    const css = getComputedStyle(elemento);
    return [css.backgroundColor, css.borderTopColor, css.height];
  });

  expect(estilo).toEqual(["rgb(27, 27, 27)", "rgb(47, 47, 47)", "29px"]);
});

test("no detalhe do projeto, o botão de voltar não invade a busca em 1280px", async ({ page }) => {
  await abrir(page, "pt-BR", "light", `/projetos/${project.id}`);
  await page.setViewportSize({ width: 1280, height: 900 });
  const cabecalho = page.getByRole("banner");
  const voltar = (await cabecalho.locator("button").first().boundingBox())!;
  const busca = (await cabecalho.locator('label:has(input[type="search"])').boundingBox())!;

  expect(busca.x - (voltar.x + voltar.width)).toBeGreaterThanOrEqual(8);
});

for (const [largura, altura] of [[1280, 620], [1440, 700], [1920, 1080]]) {
  test(`no login, tema e idioma ficam acima do cartão, sem se sobrepor (${largura}x${altura})`, async ({ page }) => {
    await page.setViewportSize({ width: largura, height: altura });
    await page.goto("/login");
    const cartao = (await page.locator("main section").boundingBox())!;

    // A linha de cima da página tem o tema e o idioma (o botão de mostrar a senha também usa aria-pressed).
    const controles = page.locator("main > div").first();
    for (const controle of [controles.locator("button[aria-pressed]"), controles.locator('button[aria-haspopup="menu"]')]) {
      const caixa = (await controle.boundingBox())!;
      expect(cartao.y - (caixa.y + caixa.height), "folga até o cartão").toBeGreaterThanOrEqual(8);
    }
  });
}

