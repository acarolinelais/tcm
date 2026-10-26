import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { TONS_ETIQUETA, TagChip } from "./tag-chip";

describe("TagChip", () => {
  it("mostra o rótulo com as cores do tom", () => {
    render(<TagChip tom={TONS_ETIQUETA.ativo}>Active</TagChip>);
    const chip = screen.getByText("Active").closest(".chip") as HTMLElement;
    expect(chip).not.toBeNull();
    expect(chip.style.getPropertyValue("--chip-bg")).toBe("#DCF7E8");
    expect(chip.style.getPropertyValue("--chip-fg")).toBe("#3C8355");
  });

  it("o tom neutro usa o cinza da situação", () => {
    render(<TagChip tom={TONS_ETIQUETA.neutro}>Inactive</TagChip>);
    const chip = screen.getByText("Inactive").closest(".chip") as HTMLElement;
    expect(chip.style.getPropertyValue("--chip-bg")).toBe("#EDEFF1");
    expect(chip.style.getPropertyValue("--chip-fg")).toBe("#777777");
  });
});
