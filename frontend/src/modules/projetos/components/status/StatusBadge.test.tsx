import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import type { StatusCasoTeste } from "../../model/projeto";
import { statusBadges } from "./status-badge-estilos";
import { StatusPill } from "./StatusBadge";

describe("StatusPill (spec 050: Chip do HeroUI)", () => {
  it.each(Object.keys(statusBadges) as StatusCasoTeste[])("o status %s mantém as cores por token e o rótulo", (status) => {
    render(<StatusPill status={status} label={`rótulo ${status}`} />);
    const chip = screen.getByText(`rótulo ${status}`).closest(".chip");

    expect(chip).not.toBeNull();
    expect(chip).toHaveClass(...statusBadges[status].badge.split(" "));
    expect(chip?.querySelector(`.${statusBadges[status].icon}`)).toHaveAttribute("aria-hidden", "true");
  });

  it("não usa mais cores fixas: as classes de cor são só de token", () => {
    for (const { badge, icon } of Object.values(statusBadges)) {
      expect(`${badge} ${icon}`).not.toMatch(/#|\[/);
    }
  });
});
