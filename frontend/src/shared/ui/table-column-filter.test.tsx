import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { TableColumnFilter } from "./table-column-filter";

describe("TableColumnFilter", () => {
  it("permite buscar em listas longas e mantém o menu limitado à viewport", async () => {
    const user = userEvent.setup();
    render(<TableColumnFilter label="Assignee" value="" onChange={vi.fn()} searchable options={[
      { value: "", label: "All" }, { value: "ana", label: "ana.fagundes", searchText: "Ana Fagundes" }, { value: "maria", label: "maria.pernalete", searchText: "Maria Pernalete" },
    ]} />);

    await user.click(screen.getByRole("button", { name: "Filter by Assignee" }));
    const menu = screen.getByRole("menu", { name: "Filter: Assignee" });
    expect(menu).toHaveClass("max-w-[calc(100vw-1rem)]");
    await user.type(screen.getByRole("textbox", { name: "Search options" }), "Maria Pernalete");
    expect(screen.getByRole("menuitemradio", { name: "maria.pernalete" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio", { name: "ana.fagundes" })).not.toBeInTheDocument();
  });
});
