import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import i18n from "@/core/i18n";
import { PageSkeleton } from "./page-skeleton";

describe("PageSkeleton (spec 050: Skeleton do HeroUI)", () => {
  it("anuncia o carregamento para leitores de tela, com o texto padrão ou o informado", async () => {
    await i18n.changeLanguage("en");
    const { rerender } = render(<PageSkeleton />);

    expect(screen.getByRole("status")).toHaveTextContent("Loading…");
    rerender(<PageSkeleton label="Loading profiles" />);
    expect(screen.getByRole("status")).toHaveTextContent("Loading profiles");
  });

  it("os blocos são decorativos e ficam fora da leitura (falha se perderem o texto acessível)", () => {
    render(<PageSkeleton label="Loading profiles" />);
    const status = screen.getByRole("status");

    expect(status.querySelectorAll(".skeleton").length).toBeGreaterThan(0);
    expect(status.textContent?.trim()).toBe("Loading profiles");
  });
});
