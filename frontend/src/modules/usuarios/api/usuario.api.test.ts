import { beforeEach, describe, expect, it, vi } from "vitest";

import { usuarioApi } from "./usuario.api";

describe("usuarioApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({}), { status: 200 })),
    );
  });

  it("listar chama GET /api/usuarios com page e page_size", async () => {
    await usuarioApi.listar(2, 10);

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/usuarios?page=2&page_size=10");
  });

  it("serializa todos os filtros como query params opcionais", async () => {
    await usuarioApi.listar(1, 10, {
      nome: "ana",
      email: "example.com",
      ativo: false,
      perfil_id: "perfil-123",
    });

    const [url] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/usuarios?page=1&page_size=10&nome=ana&email=example.com&ativo=false&perfil_id=perfil-123");
  });

  it("criar chama POST /api/usuarios com o corpo serializado", async () => {
    await usuarioApi.criar({ nome: "Ana", email: "ana@example.com" });

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/usuarios");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(init?.body as string)).toEqual({ nome: "Ana", email: "ana@example.com" });
  });

  it("inativar chama PATCH /api/usuarios/{id}/inativar", async () => {
    await usuarioApi.inativar("123");

    const [url, init] = vi.mocked(fetch).mock.calls[0];
    expect(url).toBe("/api/usuarios/123/inativar");
    expect(init?.method).toBe("PATCH");
  });
});
