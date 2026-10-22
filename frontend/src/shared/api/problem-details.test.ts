import { describe, expect, it } from "vitest";

import { ApiError } from "./problem-details";

describe("ApiError", () => {
  it("usa o detail do problem como mensagem quando presente", () => {
    const error = new ApiError({
      type: "about:blank",
      title: "Conflito",
      status: 409,
      detail: "E-mail já cadastrado.",
    });

    expect(error.message).toBe("E-mail já cadastrado.");
    expect(error.problem.status).toBe(409);
  });

  it("usa o title como mensagem quando não há detail", () => {
    const error = new ApiError({ type: "about:blank", title: "Dados inválidos.", status: 422 });

    expect(error.message).toBe("Dados inválidos.");
  });
});
