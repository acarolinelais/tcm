import { expect, test } from "@playwright/test";

const permissoes = [
  { id: "usuarios.consultar", descricao: "Consultar usuários", modulo: { codigo: "usuarios", nome: "Usuários", ordem: 1 }, ordem: 1 },
  { id: "usuarios.gerenciar", descricao: "Gerenciar usuários", modulo: { codigo: "usuarios", nome: "Usuários", ordem: 1 }, ordem: 2 },
  { id: "perfis.gerenciar", descricao: "Gerenciar perfis", modulo: { codigo: "perfis", nome: "Perfis", ordem: 2 }, ordem: 1 },
];

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => sessionStorage.setItem("sdf.access", "e2e-token"));
  await page.route("**/api/auth/me", (route) => route.fulfill({
    json: {
      id: "u1", nome: "Admin", email: "admin@example.com", unidade_id: "unit1", unidade_nome: "Unidade",
      perfil_codigo: "ADMIN_UNIDADE", perfil: "Administrador", permissoes: ["perfis.gerenciar"], times: [],
      time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false,
      idioma_preferido: "pt-BR",
    },
  }));
  await page.route("**/api/perfis/permissoes", (route) => route.fulfill({ json: permissoes }));
  await page.route("**/api/perfis", (route) => route.fulfill({
    json: [
      { id: "p1", nome: "Operação", descricao: null, codigo: null, permissoes: ["usuarios.consultar"] },
      { id: "p2", nome: "Leitura", descricao: null, codigo: null, permissoes: [] },
    ],
  }));
});

test("perfis: grupos e checkboxes continuam acessíveis em viewport estreito e por teclado", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/perfis");

  await expect(page.getByRole("grid")).toBeVisible();
  await page.getByRole("button", { name: "Editar permissões Operação" }).click();
  const group = page.getByRole("region", { name: "Permissões de Usuários" });
  await page.getByRole("button", { name: /Usuários/ }).click();
  const checkbox = page.getByLabel("Consultar usuários");
  await expect(group).toBeVisible();
  const overflowVisivel = await page.locator("body").evaluate(() =>
    [...document.querySelectorAll("body *")].some((element) => {
      const style = getComputedStyle(element);
      return style.visibility === "visible"
        && Number(style.opacity) > 0
        && element.getBoundingClientRect().right > window.innerWidth + 1;
    }),
  );
  expect(overflowVisivel).toBe(false);
  await expect(checkbox).toBeChecked();
  await checkbox.focus();
  await page.keyboard.press("Space");
  await expect(checkbox).not.toBeChecked();
  await expect(page.getByText("Alterações não salvas", { exact: true })).toBeVisible();
});
