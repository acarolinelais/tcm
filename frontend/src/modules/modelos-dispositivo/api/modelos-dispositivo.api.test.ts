import { beforeEach, describe, expect, it, vi } from "vitest";

import { modelosDispositivoApi } from "./modelos-dispositivo.api";

describe("modelosDispositivoApi", () => {
  beforeEach(() => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })));
  });

  it("listar chama GET com paginação e filtros", async () => {
    await modelosDispositivoApi.listar(2, 20, { busca: "S27", ativo: false });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/modelos-dispositivo?page=2&page_size=20&ativo=false&busca=S27");
  });

  it("criar envia descrição vazia como null", async () => {
    await modelosDispositivoApi.criar({ nome: "S27 Ultra", descricao: "" });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/modelos-dispositivo");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ nome: "S27 Ultra", descricao: null });
  });

  it("atualizar chama PUT com nome e descrição", async () => {
    await modelosDispositivoApi.atualizar("model-1", { nome: "S27 Ultra", descricao: "Flagship" });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/modelos-dispositivo/model-1");
    expect(init?.method).toBe("PUT");
    expect(JSON.parse(init?.body as string)).toEqual({ nome: "S27 Ultra", descricao: "Flagship" });
  });

  it("ativar e inativar chamam PATCH nas rotas próprias", async () => {
    await modelosDispositivoApi.ativar("model-1");
    await modelosDispositivoApi.inativar("model-1");

    const urls = vi.mocked(fetch).mock.calls.map(([url, init]) => `${init?.method} ${url}`);
    expect(urls).toEqual(["PATCH /api/modelos-dispositivo/model-1/ativar", "PATCH /api/modelos-dispositivo/model-1/inativar"]);
  });

  it("propaga o erro do servidor", async () => {
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ title: "Conflict", status: 409 }), { status: 409, headers: { "Content-Type": "application/problem+json" } })));

    await expect(modelosDispositivoApi.criar({ nome: "S27 Ultra", descricao: "" })).rejects.toThrow();
  });
});
