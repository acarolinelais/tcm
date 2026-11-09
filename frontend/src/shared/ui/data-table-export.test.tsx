import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { baixarPlanilha, buscarTodasAsPaginas } from "@/shared/lib/exportar-planilha";
import type { PagedResult } from "@/shared/types/paged-result";
import { DataTableExport } from "./data-table-export";

vi.mock("@/shared/lib/exportar-planilha");

interface Item { id: string; nome: string }

const colunas = [{ exportar: { titulo: "Name", valor: (item: Item) => item.nome } }, {}];
const pagina = [{ id: "1", nome: "Alfa" }];

beforeEach(async () => {
  vi.clearAllMocks();
  await i18n.changeLanguage("en");
});

describe("DataTableExport", () => {
  it("oferece a página atual e todos os itens", async () => {
    const user = userEvent.setup();
    render(<DataTableExport listagem="usuarios" colunas={colunas} itensPagina={pagina} todosOsItens={pagina} />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "Current page" }));

    await waitFor(() => expect(baixarPlanilha).toHaveBeenCalledTimes(1));
    await user.click(screen.getByRole("button", { name: "Export" }));
    expect(await screen.findByRole("menuitem", { name: "All items" })).toBeInTheDocument();
  });

  it("sem itens, o botão fica desabilitado", () => {
    render(<DataTableExport listagem="usuarios" colunas={colunas} itensPagina={[]} todosOsItens={[]} />);

    expect(screen.getByRole("button", { name: "Export" })).toBeDisabled();
  });

  it("enquanto exporta todos, o botão mostra o andamento e fica bloqueado", async () => {
    const user = userEvent.setup();
    let liberar!: (pagina: PagedResult<Item>) => void;
    const buscarPagina = vi.fn(() => new Promise<PagedResult<Item>>((resolve) => { liberar = resolve; }));
    render(<DataTableExport listagem="usuarios" colunas={colunas} itensPagina={pagina} todosOsItens={() => buscarTodasAsPaginas(buscarPagina)} />);

    await user.click(screen.getByRole("button", { name: "Export" }));
    await user.click(await screen.findByRole("menuitem", { name: "All items" }));

    expect(await screen.findByRole("button", { name: "Exporting…" })).toBeDisabled();
    liberar({ items: pagina, page: 1, page_size: 100, total_count: 1 });
    expect(await screen.findByRole("button", { name: "Export" })).toBeEnabled();
  });
});
