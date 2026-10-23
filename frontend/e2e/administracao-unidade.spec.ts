import { expect, test, type Page } from "@playwright/test";

const gerente = {
  id: "gerente-1",
  nome: "Gerente Ana",
  email: "ana@example.com",
  ativo: true,
  perfil_id: "perfil-gerente",
  responsavel_id: null,
  created_at: "2026-01-01T00:00:00Z",
};

const carol = {
  id: "usuario-carol",
  nome: "Carol",
  email: "carol@example.com",
  ativo: true,
  perfil_id: "perfil-padrao",
  responsavel_id: "gerente-1",
  created_at: "2026-01-01T00:00:00Z",
};

const outroUsuario = {
  ...carol,
  id: "usuario-outro",
  nome: "Bruno",
  email: "bruno@example.com",
  responsavel_id: "gerente-2",
};

function perfilAtual(perfil: "ADMIN_UNIDADE" | "GERENTE" | "USUARIO_PADRAO") {
  const admin = perfil === "ADMIN_UNIDADE";
  const gerenteAtual = perfil === "GERENTE";
  const kp = perfil === "USUARIO_PADRAO";
  return {
    id: admin ? "admin-1" : gerenteAtual ? gerente.id : "kp-1",
    nome: admin ? "Admin" : gerenteAtual ? gerente.nome : "KP",
    email: admin ? "admin@example.com" : gerenteAtual ? gerente.email : "kp@example.com",
    unidade_id: "unidade-1",
    unidade_nome: "Unidade",
    perfil_codigo: perfil,
    perfil: admin ? "Administrador" : "Gerente",
    permissoes: admin
      ? ["usuarios.consultar", "usuarios.gerenciar", "perfis.gerenciar"]
      : gerenteAtual
        ? ["usuarios.consultar", "usuarios.gerenciar"]
        : ["times.consultar"],
    times: kp ? [{ id: "time-kp", nome: "Time KP", papel: "kp" }] : [],
    setores_gerenciados: [],
    time_atual_id: null,
    tem_multiplos_times: false,
    senha_alteracao_obrigatoria: false,
  };
}

async function prepararSessao(page: Page) {
  await page.addInitScript(() => sessionStorage.setItem("sdf.access", "e2e-token"));
}

test("admin transfere a responsabilidade pela conta na tabela de usuários", async ({ page }) => {
  await prepararSessao(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: perfilAtual("ADMIN_UNIDADE") }));
  await page.route("**/api/perfis", (route) => route.fulfill({ json: [
    { id: "perfil-gerente", nome: "Gerente", codigo: "GERENTE", permissoes: [] },
    { id: "perfil-padrao", nome: "Usuário padrão", codigo: "USUARIO_PADRAO", permissoes: [] },
  ] }));
  await page.route("**/api/usuarios?*", async (route) => {
    const url = new URL(route.request().url());
    const items = url.searchParams.get("perfil_id") === "perfil-gerente" ? [gerente] : [carol];
    await route.fulfill({ json: { items, page: 1, page_size: 10, total_count: items.length } });
  });
  await page.route("**/api/usuarios/usuario-carol/responsavel", (route) => route.fulfill({
    json: { ...carol, responsavel_id: "gerente-1" },
  }));

  await page.goto("/admin/usuarios");
  await expect(page.getByRole("row", { name: /Carol/ })).toBeVisible();
  await page.getByRole("button", { name: "Ações para Carol" }).click();
  await page.getByRole("menuitem", { name: "Alterar responsável" }).click();
  await page.getByLabel("Gerente responsável").selectOption("gerente-1");
  await page.getByRole("button", { name: "Salvar" }).click();

  await expect(page.getByText("Responsável atualizado com sucesso.")).toBeVisible();
  await expect(page.getByText("Gerente Ana")).toBeVisible();
});

test("gerente só recebe ações de gestão nas contas sob sua responsabilidade", async ({ page }) => {
  await prepararSessao(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: perfilAtual("GERENTE") }));
  await page.route("**/api/usuarios?*", (route) => route.fulfill({
    json: { items: [carol, outroUsuario], page: 1, page_size: 10, total_count: 2 },
  }));

  await page.goto("/usuarios");
  await expect(page.getByRole("row", { name: /Carol/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ações para Carol" })).toBeVisible();
  await expect(page.getByRole("row", { name: /Bruno/ }).getByRole("button")).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Administração/ })).toHaveCount(0);
});

test("admin vê as páginas de Setores e Times com estado vazio padronizado", async ({ page }) => {
  await prepararSessao(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: perfilAtual("ADMIN_UNIDADE") }));
  await page.route("**/api/perfis", (route) => route.fulfill({ json: [
    { id: "perfil-gerente", nome: "Gerente", codigo: "GERENTE", permissoes: [] },
  ] }));
  await page.route("**/api/usuarios?*", (route) => route.fulfill({
    json: { items: [gerente], page: 1, page_size: 100, total_count: 1 },
  }));
  await page.route("**/api/setores?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 100, total_count: 0 },
  }));
  await page.route("**/api/times?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 10, total_count: 0 },
  }));

  await page.goto("/admin/setores");
  await expect(page.getByRole("heading", { name: "Nenhum setor cadastrado" })).toBeVisible();
  await page.getByRole("link", { name: "Times" }).click();
  await expect(page.getByRole("heading", { name: "Nenhum time cadastrado" })).toBeVisible();
});

test("KP acessa a área de Times sem receber ações administrativas", async ({ page }) => {
  await prepararSessao(page);
  await page.route("**/api/auth/me", (route) => route.fulfill({ json: perfilAtual("USUARIO_PADRAO") }));
  await page.route("**/api/setores?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 100, total_count: 0 },
  }));
  await page.route("**/api/times?*", (route) => route.fulfill({
    json: { items: [], page: 1, page_size: 10, total_count: 0 },
  }));

  await page.goto("/times");
  await expect(page.getByRole("heading", { name: "Times" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Novo time" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /Administração/ })).toHaveCount(0);
});

