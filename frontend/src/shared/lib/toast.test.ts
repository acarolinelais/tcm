import { beforeEach, describe, expect, it, vi } from "vitest";

const heroToast = vi.hoisted(() => ({ success: vi.fn(() => "id-1"), danger: vi.fn(() => "id-2") }));
vi.mock("@heroui/react", () => ({ toast: heroToast }));

import { toast } from "./toast";

describe("toast", () => {
  beforeEach(() => vi.clearAllMocks());

  it("success usa a variante de sucesso do HeroUI", () => {
    expect(toast.success("Salvo.")).toBe("id-1");
    expect(heroToast.success).toHaveBeenCalledWith("Salvo.", undefined);
  });

  it("error usa a variante danger e repassa a descrição", () => {
    toast.error("Falhou.", { description: "Tente de novo." });
    expect(heroToast.danger).toHaveBeenCalledWith("Falhou.", { description: "Tente de novo." });
    expect(heroToast.success).not.toHaveBeenCalled();
  });
});
