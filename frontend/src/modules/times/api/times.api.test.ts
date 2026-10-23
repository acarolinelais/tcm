import { beforeEach, describe, expect, it, vi } from "vitest";

import { timesApi } from "./times.api";

vi.mock("@/core/config", () => ({ useMock: false }));
vi.mock("@/core/mock/database", () => ({ mockTimesApi: {} }));

describe("timesApi", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(JSON.stringify({ id: "membro-1" }), { status: 201 })),
    );
  });

  it("adiciona membro enviando somente o identificador do usuário", async () => {
    await timesApi.adicionar("time-1", "usuario-1");

    expect(fetch).toHaveBeenCalledWith(
      "/api/times/time-1/membros",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ usuario_id: "usuario-1" }),
      }),
    );
  });
});
