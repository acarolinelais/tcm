import { expect, test, type Page } from "@playwright/test";

import { setupProjectSession, setupTeams } from "./projetos-fixtures";

const pagina = <T,>(items: T[]) => ({ items, page: 1, page_size: 20, total_count: items.length });

interface Modelo { id: string; unidade_id: string; nome: string; descricao: string | null; ativo: boolean; created_at: string; updated_at: string }

/** API de modelos em memória: lista, cria, edita, ativa/inativa e devolve as opções ativas. */
async function simularCatalogo(page: Page, modelos: Modelo[]) {
  await page.route(/\/api\/modelos-dispositivo(\/|\?|$)/, async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const [, id, acao] = url.pathname.replace("/api/modelos-dispositivo", "").split("/");
    const agora = new Date().toISOString();
    if (id === "opcoes") return route.fulfill({ json: pagina(modelos.filter((m) => m.ativo).map(({ id: modeloId, nome, descricao }) => ({ id: modeloId, nome, descricao }))) });
    if (!id && request.method() === "GET") {
      const ativo = url.searchParams.get("ativo");
      return route.fulfill({ json: pagina(modelos.filter((m) => ativo === null || String(m.ativo) === ativo)) });
    }
    if (!id && request.method() === "POST") {
      const body = request.postDataJSON();
      const modelo = { id: `model-${modelos.length + 1}`, unidade_id: "unit-1", nome: body.nome, descricao: body.descricao, ativo: true, created_at: agora, updated_at: agora };
      modelos.push(modelo);
      return route.fulfill({ status: 201, json: modelo });
    }
    const modelo = modelos.find((m) => m.id === id);
    if (!modelo) return route.fulfill({ status: 404, json: { type: "about:blank", title: "Not Found", status: 404 } });
    if (acao) modelo.ativo = acao === "ativar";
    else Object.assign(modelo, request.postDataJSON());
    modelo.updated_at = agora;
    return route.fulfill({ json: modelo });
  });
}

test("KP acessa Device models em Administration, cria, edita e inativa um modelo, que some do seletor de projetos", async ({ page }) => {
  await setupProjectSession(page, { id: "kp-1", nome: "Kaique", perfil_codigo: "KP", perfil: "KP", permissoes: ["projetos.consultar", "projetos.gerenciar", "modelos_dispositivo.gerenciar"] });
  await simularCatalogo(page, [{ id: "model-tab", unidade_id: "unit-1", nome: "Tab S11", descricao: "Tablet", ativo: true, created_at: "2026-03-01T12:00:00Z", updated_at: "2026-03-01T12:00:00Z" }]);
  await page.route("**/api/projetos?*", (route) => route.fulfill({ json: pagina([]) }));
  await setupTeams(page);

  await page.goto("/overview");
  await page.getByRole("button", { name: "Administração" }).click();
  await page.getByRole("link", { name: "Modelos de dispositivo" }).click();
  await expect(page).toHaveURL(/\/admin\/modelos-dispositivo$/);
  await expect(page.getByRole("row", { name: /Tab S11/ })).toBeVisible();

  await page.getByRole("button", { name: "Novo modelo de dispositivo" }).click();
  await page.getByRole("textbox", { name: "Nome do modelo" }).fill("S27 Ultra");
  await page.getByRole("textbox", { name: "Descrição" }).fill("Flagship");
  await page.getByRole("button", { name: "Salvar" }).click();
  const linha = page.getByRole("row", { name: /S27 Ultra/ });
  await expect(linha.getByText("Flagship")).toBeVisible();

  await page.getByRole("button", { name: "Editar S27 Ultra" }).click();
  await page.getByRole("textbox", { name: "Descrição" }).fill("Flagship 2027");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(linha.getByText("Flagship 2027")).toBeVisible();

  await page.getByRole("button", { name: "Inativar S27 Ultra" }).click();
  await page.getByRole("alertdialog").getByRole("button", { name: "Inativar" }).click();
  await expect(linha.getByText("Inativo")).toBeVisible();

  await page.goto("/projetos");
  await page.getByRole("button", { name: "Novo projeto" }).click();
  await page.getByRole("tab", { name: "Criar manualmente" }).click();
  await page.getByRole("button", { name: "Modelos de dispositivo" }).click();
  await expect(page.getByRole("option", { name: "Tab S11 Tablet" })).toBeVisible();
  await expect(page.getByRole("option", { name: /S27 Ultra/ })).toHaveCount(0);
});

test("gerente não vê Administration nem Device models e o acesso direto é negado", async ({ page }) => {
  await setupProjectSession(page, { perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["projetos.consultar", "projetos.gerenciar"] });
  await simularCatalogo(page, []);

  await page.goto("/overview");
  await expect(page.getByRole("navigation", { name: "Navegação principal" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Administração" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "Modelos de dispositivo", includeHidden: true })).toHaveCount(0);

  await page.goto("/admin/modelos-dispositivo");
  await expect(page.getByRole("alert")).toHaveText("Você não tem permissão para acessar esta página.");
});
