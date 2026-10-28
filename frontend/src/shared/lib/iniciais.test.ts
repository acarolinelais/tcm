import { describe, expect, it } from "vitest";

import { iniciais } from "./iniciais";

describe("iniciais", () => {
  it("usa a primeira letra do primeiro e do último nome", () => {
    expect(iniciais("Ana Carolina Lais")).toBe("AL");
  });

  it("com um nome só, usa uma letra", () => {
    expect(iniciais("Ana")).toBe("A");
  });

  it("ignora espaços nas pontas e repetidos, e põe em maiúsculas", () => {
    expect(iniciais("  ana   lais  ")).toBe("AL");
  });

  it("não parte um caractere fora do BMP ao meio", () => {
    expect(iniciais("😀na Lais")).toBe("😀L");
  });

  it("com nome vazio ou só com espaços, devolve vazio", () => {
    expect(iniciais("")).toBe("");
    expect(iniciais("   ")).toBe("");
  });
});
