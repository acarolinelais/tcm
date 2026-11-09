import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { DEFAULT_TABLE_PAGE_SIZE, paginasVisiveis } from "@/shared/lib/paginacao";
import { DataTablePagination } from "./data-table-pagination";

function renderizar(page: number, totalCount: number) {
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  render(<DataTablePagination page={page} pageSize={DEFAULT_TABLE_PAGE_SIZE} totalCount={totalCount} onPageChange={onPageChange} onPageSizeChange={onPageSizeChange} />);
  return { onPageChange, onPageSizeChange };
}

describe("DataTablePagination", () => {
  it("não mostra o total de itens (ADR 0045) e vai para a página 2", async () => {
    const { onPageChange } = renderizar(1, 45);
    expect(screen.queryByText(/total/i)).not.toBeInTheDocument();
    const nav = screen.getByRole("navigation", { name: "Pagination" });
    expect(within(nav).getByRole("button", { name: "Page 1" })).toHaveAttribute("aria-current", "page");
    await userEvent.click(within(nav).getByRole("button", { name: "Page 2" }));
    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("troca para 50 itens por página", async () => {
    const { onPageSizeChange } = renderizar(1, 45);
    await userEvent.click(screen.getByRole("button", { name: /Items per page/ }));
    await userEvent.click(await screen.findByRole("option", { name: "50" }));
    expect(onPageSizeChange).toHaveBeenCalledWith(50);
  });

  it("desabilita Anterior na primeira página e Próxima na última", async () => {
    const { onPageChange } = renderizar(1, 5);
    const anterior = screen.getByRole("button", { name: "Previous page" });
    expect(anterior).toBeDisabled();
    expect(screen.getByRole("button", { name: "Next page" })).toBeDisabled();
    await userEvent.click(anterior);
    expect(onPageChange).not.toHaveBeenCalled();
  });
});

describe("paginasVisiveis", () => {
  it("mostra todas até 7 páginas e resume acima disso", () => {
    expect(paginasVisiveis(1, 3)).toEqual([1, 2, 3]);
    expect(paginasVisiveis(5, 10)).toEqual([1, "reticencias", 4, 5, 6, "reticencias", 10]);
    expect(paginasVisiveis(1, 10)).toEqual([1, 2, 3, 4, 5, "reticencias", 10]);
  });
});
