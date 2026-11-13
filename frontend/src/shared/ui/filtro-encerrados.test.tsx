import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FiltroEncerrados } from "./filtro-encerrados";

describe("FiltroEncerrados", () => {
  it("aparece quando há projeto encerrado na lista", () => {
    render(<FiltroEncerrados existem ligado={false} onChange={vi.fn()} />);

    expect(screen.getByRole("button", { name: /closed projects/i })).toBeInTheDocument();
  });

  it("não aparece sem projeto encerrado, a não ser que já esteja ligado", () => {
    const { rerender } = render(<FiltroEncerrados existem={false} ligado={false} onChange={vi.fn()} />);
    expect(screen.queryByRole("button", { name: /closed projects/i })).not.toBeInTheDocument();

    rerender(<FiltroEncerrados existem={false} ligado onChange={vi.fn()} />);
    expect(screen.getByRole("button", { name: /closed projects/i })).toBeInTheDocument();
  });
});
