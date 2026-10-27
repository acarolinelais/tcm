import { expect, test, type APIRequestContext, type APIResponse } from "@playwright/test";

// Usar uma API/banco dedicados aos testes. Não executar contra produção.
const api = process.env.SDF_E2E_API_URL ?? "http://127.0.0.1:8000";
const senha = "tcm@123";
test.setTimeout(90_000);
test.afterEach(async ({ page }) => { await page.unrouteAll({ behavior: "wait" }); });

function chamar(request: APIRequestContext, token: string) {
  const headers = { Authorization: `Bearer ${token}` };
  return {
    post: (path: string, data: object) => request.post(`${api}/api/${path}`, { data, headers }),
    put: (path: string, data: object) => request.put(`${api}/api/${path}`, { data, headers }),
    get: (path: string) => request.get(`${api}/api/${path}`, { headers }),
    importar: (path: string) => request.post(`${api}/api/${path}`, {
      headers,
      multipart: { arquivo: { name: "sdf.xlsx", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", buffer: Buffer.from("report") } },
    }),
  };
}

async function ok(resposta: Promise<APIResponse>) {
  const r = await resposta;
  expect(r.ok(), `${r.url()}: ${await r.text()}`).toBeTruthy();
  return r.json();
}

test("duas rodadas: DEV principal/Backup registram, Status segue os resultados e o histórico é preservado", async ({ request, page }) => {
  const login = await ok(request.post(`${api}/api/auth/login`, { data: { email: "admin@sdfmanager.com", senha: process.env.SDF_E2E_ADMIN_PASSWORD ?? "mude-esta-senha" } }));
  const admin = chamar(request, login.access_token);
  const sufixo = crypto.randomUUID().slice(0, 8);
  const usuarios = [];
  for (let i = 0; i < 3; i++) usuarios.push(await ok(admin.post("usuarios", { nome: `FF Dev ${i} ${sufixo}`, email: `ff-dev-${i}-${sufixo}@example.com`, user_id: `FF-${i}-${sufixo}` })));
  const setor = await ok(admin.post("setores", { nome: `Setor FF ${sufixo}` }));
  const time = await ok(admin.post("times", { nome: `Time FF ${sufixo}`, setor_id: setor.id }));
  for (const usuario of usuarios) await ok(admin.post(`times/${time.id}/membros`, { usuario_id: usuario.id }));
  const modelos = [await ok(admin.post("modelos-dispositivo", { nome: `S26 ${sufixo}` })), await ok(admin.post("modelos-dispositivo", { nome: `S27 ${sufixo}` }))];
  const projeto = await ok(admin.post("projetos", { time_id: time.id, app: `Clock ${sufixo}`, one_ui: "9.5", modelos_ids: modelos.map((m) => m.id) }));
  const tokens = [];
  for (const usuario of usuarios) {
    const primeiro = await ok(request.post(`${api}/api/auth/login`, { data: { email: usuario.email, senha } }));
    tokens.push(await ok(chamar(request, primeiro.access_token).post("auth/trocar-senha", { nova_senha: senha })));
  }
  const devs = tokens.map((t) => chamar(request, t.access_token));
  const casos: Record<string, { id: string }> = {};
  // [principal, backup]: o DEV 0 é principal de FAIL/PARCIAL; o DEV 1 é Backup de DONE/PARCIAL; ALHEIO não é do DEV 0.
  for (const [tcId, principal, backup] of [["FF_FAIL", 0, 2], ["FF_DONE", 2, 1], ["FF_PARCIAL", 0, 1], ["FF_ALHEIO", 2, 1]] as const) {
    casos[tcId] = await ok(admin.post(`projetos/${projeto.id}/test-cases`, { tc_id: tcId, category: "A", difficulty: "Low", situation: "New", responsavel_id: usuarios[principal].id, backup_id: usuarios[backup].id }));
    // Ciclo do DEV (spec 023): o PR passa por In Review antes de In Validation.
    for (const status of ["InProgress", "InReview", "InValidation"]) await ok(devs[principal].put(`test-cases/${casos[tcId].id}`, { status }));
  }
  await ok(admin.post(`projetos/${projeto.id}/test-cases`, { tc_id: "FF_TODO", category: "A", difficulty: "Low", situation: "New", responsavel_id: usuarios[0].id, backup_id: usuarios[1].id }));
  const statusDe = async (tcId: string) => (await ok(admin.get(`test-cases/${casos[tcId].id}`))).status;

  expect((await devs[0].post(`projetos/${projeto.id}/form-factor/rodadas`, { sdf_id: "DEV" })).status()).toBe(403);
  expect((await devs[0].importar(`projetos/${projeto.id}/relatorios-sdf`)).status()).toBe(403);
  const primeira = await ok(admin.post(`projetos/${projeto.id}/form-factor/rodadas`, { sdf_id: "SDF R1 #1" }));
  expect(primeira.total_test_cases).toBe(4);
  const resultados = (rodada: { id: string }, tcId: string) => `projetos/${projeto.id}/form-factor/rodadas/${rodada.id}/test-cases/${casos[tcId].id}/resultados`;

  // DEV principal registra FAIL pela linha do Resumo; o TC vai para In Fixes e sai da tabela.
  await page.addInitScript((sessao) => {
    sessionStorage.setItem("sdf.access", sessao.access_token);
    sessionStorage.setItem("sdf.refresh", sessao.refresh_token);
  }, tokens[0]);
  await page.goto("/projetos");
  await page.getByRole("tab", { name: "Form Factor" }).click();
  await expect(page.getByText("Test Cases in round")).toHaveCount(0);
  await expect(page.getByRole("row", { name: /FF_ALHEIO/ })).toBeVisible();
  await expect(page.getByRole("button", { name: "Record result FF_ALHEIO" })).toHaveCount(0);
  await page.getByRole("button", { name: "Record result FF_FAIL" }).press("Enter");
  await page.getByRole("button", { name: new RegExp(`Result for S26 ${sufixo}`) }).click();
  await page.getByRole("option", { name: "FAIL" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("row", { name: /FF_FAIL/ })).toHaveCount(0);

  // Backup registra PASS completo e parcial; TC alheio é recusado sem gravar nada.
  const [s26, s27] = modelos.map((m) => m.id);
  await ok(devs[1].post(resultados(primeira, "FF_DONE"), { resultados: { [s26]: "PASS", [s27]: "PASS" } }));
  await ok(devs[1].post(resultados(primeira, "FF_PARCIAL"), { resultados: { [s26]: "PASS" } }));
  expect((await devs[0].post(resultados(primeira, "FF_ALHEIO"), { resultados: { [s26]: "PASS" } })).status()).toBe(403);
  expect(await Promise.all(["FF_FAIL", "FF_DONE", "FF_PARCIAL", "FF_ALHEIO"].map(statusDe))).toEqual(["InFixes", "Done", "InValidation", "InValidation"]);

  // Exclusão respeita atribuição; a correção volta por In Review antes da nova validação.
  expect((await devs[0].put(`test-cases/${casos.FF_ALHEIO.id}`, { status: "Cancelled" })).status()).toBe(403);
  expect(await statusDe("FF_ALHEIO")).toBe("InValidation");
  await ok(devs[0].put(`test-cases/${casos.FF_PARCIAL.id}`, { status: "Cancelled" }));
  expect((await devs[0].put(`test-cases/${casos.FF_FAIL.id}`, { status: "InValidation" })).status()).toBe(409);
  for (const status of ["InReview", "InValidation"]) await ok(devs[0].put(`test-cases/${casos.FF_FAIL.id}`, { status }));

  const segunda = await ok(admin.post(`projetos/${projeto.id}/form-factor/rodadas`, { sdf_id: "SDF R2" }));
  expect(segunda.total_test_cases).toBe(2);
  await ok(admin.post(resultados(segunda, "FF_FAIL"), { resultados: { [s26]: "PASS", [s27]: "PASS" } }));
  expect(await statusDe("FF_FAIL")).toBe("Done");

  // O histórico mantém as duas rodadas do mesmo TC, com SDF ID e resultados de cada uma.
  await page.reload();
  await page.getByRole("tab", { name: "Form Factor" }).click();
  await page.getByRole("radio", { name: "Results" }).click();
  const linhasFail = page.getByRole("row", { name: /FF_FAIL/ });
  await expect(linhasFail).toHaveCount(2);
  // Células 4 e 5: resultados de S26 e S27.
  const resultadosDa = (sdfId: string) => linhasFail.filter({ hasText: sdfId }).getByRole("cell");
  await expect(resultadosDa("SDF R1 #1").nth(4)).toHaveText("FAIL");
  await expect(resultadosDa("SDF R1 #1").nth(5)).toHaveText("—");
  await expect(resultadosDa("SDF R2").nth(4)).toHaveText("PASS");
  await expect(resultadosDa("SDF R2").nth(5)).toHaveText("PASS");
  await expect(page.getByRole("row", { name: /FF_PARCIAL/ })).toHaveCount(1);
});
