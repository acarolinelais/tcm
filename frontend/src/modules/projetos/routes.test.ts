import { describe, expect, it } from "vitest";

import { projetosRoutes } from "./routes";

describe("project routes", () => {
  it("registers the board, project list and details routes", () => {
    expect(projetosRoutes.map(({ path }) => path)).toEqual([
      "board",
      "board/:projetoId",
      "resultados-gerais",
      "projetos",
      "projetos/:projetoId",
    ]);
  });
});
