import { expect, type APIRequestContext, type Page } from "@playwright/test";

// e2e que preparam os dados pela API real. Usar uma API/banco dedicados aos testes; não executar contra produção.
export const api = process.env.SDF_E2E_API_URL ?? "http://127.0.0.1:8000";
export const senha = "tcm@123";
export const adminEmail = "admin@sdfmanager.com";
export const adminSenha = process.env.SDF_E2E_ADMIN_PASSWORD ?? "mude-esta-senha";

export async function post(request: APIRequestContext, path: string, data: object, token?: string) {
  const response = await request.post(`${api}/api/${path}`, { data, headers: token ? { Authorization: `Bearer ${token}` } : {} });
  expect(response.ok(), `${path}: ${await response.text()}`).toBeTruthy();
  return response.json();
}

/**
 * Cria um setor e um time novos com `membros` usuários e abre no navegador a sessão do primeiro deles (o dev).
 * Os nomes levam um sufixo aleatório, para os testes não colidirem entre si.
 */
export async function prepararTimeComDev(request: APIRequestContext, page: Page, membros = 3) {
  const admin = await post(request, "auth/login", { email: adminEmail, senha: adminSenha });
  const sufixo = crypto.randomUUID();
  const usuarios = [];
  for (let i = 0; i < membros; i++) {
    usuarios.push(await post(request, "usuarios", { nome: `Dev ${i} ${sufixo}`, email: `dev-${i}-${sufixo}@example.com`, user_id: `DEV-${i}-${sufixo}` }, admin.access_token));
  }
  const setor = await post(request, "setores", { nome: `Setor ${sufixo}` }, admin.access_token);
  const time = await post(request, "times", { nome: `Time ${sufixo}`, setor_id: setor.id }, admin.access_token);
  for (const usuario of usuarios) await post(request, `times/${time.id}/membros`, { usuario_id: usuario.id }, admin.access_token);
  let dev = await post(request, "auth/login", { email: usuarios[0].email, senha });
  dev = await post(request, "auth/trocar-senha", { nova_senha: senha }, dev.access_token);
  await page.addInitScript((tokens) => {
    sessionStorage.setItem("sdf.access", tokens.access_token);
    sessionStorage.setItem("sdf.refresh", tokens.refresh_token);
  }, dev);
  return { admin, dev, usuarios, setor, time };
}

/** Abre no navegador a sessão do administrador existente, sem passar pela tela de login e sem criar dados. */
export async function entrarComoAdmin(request: APIRequestContext, page: Page) {
  const admin = await post(request, "auth/login", { email: adminEmail, senha: adminSenha });
  await page.addInitScript((tokens) => {
    sessionStorage.setItem("sdf.access", tokens.access_token);
    sessionStorage.setItem("sdf.refresh", tokens.refresh_token);
  }, admin);
}
