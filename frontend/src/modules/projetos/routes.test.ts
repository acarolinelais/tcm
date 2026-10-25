import { describe, expect, it } from "vitest";

import { projetosRoutes } from "./routes";

describe("project routes", () => {
  it("registers the project list and details routes", () => {
    expect(projetosRoutes.map(({ path }) => path)).toEqual([
      "resultados-gerais",
      "projetos",
      "projetos/:projetoId",
    ]);
  });
});
