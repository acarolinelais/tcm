import { describe, expect, it } from "vitest";

import { projetosRoutes } from "./routes";

describe("project routes", () => {
  it("registers the project list, details and device catalog routes", () => {
    expect(projetosRoutes.map(({ path }) => path)).toEqual([
      "projetos",
      "projetos/:projetoId",
      "modelos-dispositivo",
    ]);
  });
});
