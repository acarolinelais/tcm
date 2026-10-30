import { readFile } from "node:fs/promises";

import * as XLSX from "@e965/xlsx";
import { expect, test, type Download, type Page } from "@playwright/test";

const profiles = [
  { id: "perfil-admin", nome: "Administrador", codigo: "ADMIN_UNIDADE", permissoes: [] },
  { id: "perfil-padrao", nome: "Developer", codigo: "USUARIO_PADRAO", permissoes: [] },
];

const usuario = {
  id: "usuario-ana",
  nome: "Ana",
  email: "ana@example.com",
  user_id: "USR-001",
  ativo: true,
  perfil_id: "perfil-padrao",
  responsavel_id: null,
  created_at: "2026-01-01T00:00:00Z",
};

async function prepararPagina(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("sdf.access", "e2e-user-id"));
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: {
    id: "admin-1",
    nome: "Admin",
    email: "admin@example.com",
    unidade_id: "unidade-1",
    unidade_nome: "Unidade",
    perfil_codigo: "ADMIN_UNIDADE",
    perfil: "Administrador",
    permissoes: ["usuarios.consultar", "usuarios.gerenciar", "usuarios.perfil.consultar", "setores.consultar"],
    times: [],
    setores_gerenciados: [],
    time_atual_id: null,
    tem_multiplos_times: false,
    senha_alteracao_obrigatoria: false,
    idioma_preferido: "pt-BR",
  } }));
  await page.route("**/api/perfis", (route) => route.fulfill({ json: profiles }));
  await page.route("**/api/setores?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 100, total_count: 0 },
  }));
}

test("cadastra e edita usuário preservando o identificador informado", async ({ page }) => {
  await prepararPagina(page);
  let users = [usuario];
  await page.route("**/api/usuarios?*", (route) => route.fulfill({
    json: { items: users, page: 1, page_size: 10, total_count: users.length },
  }));
  await page.route("**/api/usuarios", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.user_id).toBe("USR-002");
    users = [{ ...usuario, user_id: body.user_id }];
    await route.fulfill({ status: 201, json: users[0], headers: { location: "/api/usuarios/usuario-ana" } });
  });
  await page.route("**/api/usuarios/usuario-ana", async (route) => {
    const body = route.request().postDataJSON();
    expect(body.user_id).toBe("USR-003");
    users = [{ ...usuario, user_id: body.user_id }];
    await route.fulfill({ json: users[0] });
  });

  await page.goto("/admin/usuarios");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  await page.getByLabel("Nome").fill("Ana");
  await page.getByRole("textbox", { name: "E-mail" }).fill("ana@example.com");
  await page.getByLabel("ID do usuário").fill("USR-002");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Usuário Ana cadastrado.")).toBeVisible();

  await page.getByRole("button", { name: "Editar Ana" }).click();
  await expect(page.getByLabel("ID do usuário")).toHaveValue("USR-002");
  await page.getByLabel("ID do usuário").fill("USR-003");
  await page.getByRole("button", { name: "Salvar" }).click();
  await expect(page.getByText("Usuário Ana atualizado.")).toBeVisible();
});

test("exibe duplicidade do identificador no campo do formulário", async ({ page }) => {
  await prepararPagina(page);
  await page.route("**/api/usuarios?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 10, total_count: 0 },
  }));
  await page.route("**/api/usuarios", (route) => route.fulfill({
    status: 409,
    contentType: "application/problem+json",
    body: JSON.stringify({
      title: "Conflito",
      status: 409,
      errors: [{ campo: "user_id", mensagem: "Duplicado." }],
    }),
  }));

  await page.goto("/admin/usuarios");
  await page.getByRole("button", { name: "Novo usuário" }).click();
  await page.getByLabel("Nome").fill("Ana");
  await page.getByRole("textbox", { name: "E-mail" }).fill("ana@example.com");
  await page.getByLabel("ID do usuário").fill("USR-001");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText("Este ID do usuário já está em uso nesta unidade.")).toBeVisible();
});

const muitosUsuarios = Array.from({ length: 130 }, (_, i) => ({
  ...usuario,
  id: `usuario-${i}`,
  nome: `Pessoa ${String(i).padStart(3, "0")}`,
  email: `pessoa${i}@example.com`,
  ativo: i % 2 === 0,
}));

async function listarPaginado(page: Page, falharNaPagina?: number) {
  await page.route("**/api/usuarios?*", (route) => {
    const params = new URL(route.request().url()).searchParams;
    const pagina = Number(params.get("page") ?? 1);
    const tamanho = Number(params.get("page_size") ?? 20);
    if (pagina === falharNaPagina && tamanho === 100) return route.fulfill({ status: 500, json: { title: "Erro", status: 500 } });
    const ativo = params.get("ativo");
    const filtrados = ativo === null ? muitosUsuarios : muitosUsuarios.filter((item) => String(item.ativo) === ativo);
    return route.fulfill({ json: { items: filtrados.slice((pagina - 1) * tamanho, pagina * tamanho), page: pagina, page_size: tamanho, total_count: filtrados.length } });
  });
}

async function lerDownload(download: Download) {
  const workbook = XLSX.read(await readFile(await download.path()));
  return XLSX.utils.sheet_to_json<string[]>(workbook.Sheets[workbook.SheetNames[0]], { header: 1 });
}

test("exporta a página atual e todos os itens filtrados para Excel", async ({ page }) => {
  await prepararPagina(page);
  await listarPaginado(page);
  await page.goto("/admin/usuarios");
  await expect(page.getByText("Pessoa 000")).toBeVisible();

  await page.getByRole("button", { name: "Exportar" }).click();
  const [downloadPagina] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Página atual" }).click()]);
  expect(downloadPagina.suggestedFilename()).toMatch(/^usuarios_\d{4}-\d{2}-\d{2}\.xlsx$/);
  const linhasPagina = await lerDownload(downloadPagina);
  expect(linhasPagina).toHaveLength(21);
  expect(linhasPagina[0]).not.toContain("Ações");

  await page.getByRole("button", { name: "Filtrar por Status" }).click();
  await page.getByRole("option", { name: "Inativo" }).click();
  await expect(page.getByText("Pessoa 001")).toBeVisible();
  await page.getByRole("button", { name: "Exportar" }).click();
  const [downloadTodos] = await Promise.all([page.waitForEvent("download"), page.getByRole("menuitem", { name: "Todos os itens" }).click()]);
  const linhasTodos = await lerDownload(downloadTodos);
  expect(linhasTodos).toHaveLength(66);
  expect(linhasTodos.slice(1).every((linha) => linha.includes("Inativo"))).toBe(true);
});

test("falha ao buscar uma página não baixa arquivo parcial e avisa o erro", async ({ page }) => {
  await prepararPagina(page);
  await listarPaginado(page, 2);
  let baixou = false;
  page.on("download", () => { baixou = true; });
  await page.goto("/admin/usuarios");
  await expect(page.getByText("Pessoa 000")).toBeVisible();

  await page.getByRole("button", { name: "Exportar" }).click();
  await page.getByRole("menuitem", { name: "Todos os itens" }).click();

  await expect(page.getByText("Não foi possível exportar a planilha. Tente de novo.")).toBeVisible();
  await expect(page.getByRole("button", { name: "Exportar" })).toBeEnabled();
  expect(baixou).toBe(false);
});
