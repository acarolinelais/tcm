import { describe, expect, it } from "vitest";

import { semanaIso } from "@/shared/lib/utils";

describe("semanaIso", () => {
  it("numera a semana pela ISO 8601, inclusive na virada do ano", () => {
    expect(semanaIso(new Date(2026, 9, 23))).toBe("2026-W43");
    expect(semanaIso(new Date(2026, 0, 1))).toBe("2026-W01");
    expect(semanaIso(new Date(2024, 11, 30))).toBe("2025-W01");
    expect(semanaIso(new Date(2027, 0, 1))).toBe("2026-W53");
  });

  it("não coloca o domingo na semana seguinte", () => {
    expect(semanaIso(new Date(2026, 9, 25))).toBe("2026-W43");
    expect(semanaIso(new Date(2026, 9, 26))).toBe("2026-W44");
  });
});
