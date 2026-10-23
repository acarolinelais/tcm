import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsuariosTable } from "./UsuariosTable";

function renderTable() {
  const client = new QueryClient();
  const onPageChange = vi.fn();
  const onFiltroChange = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <UsuariosTable
        page={1}
        pageSize={20}
        pageSizeOptions={[10, 20]}
        filtros={{}}
        onFiltroChange={onFiltroChange}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        onEditar={vi.fn()}
        onNovoUsuario={vi.fn()}
        onLimparFiltros={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { onPageChange, onFiltroChange };
}

describe("UsuariosTable", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              items: Array.from({ length: 20 }, (_, i) => ({
                id: String(i),
                nome: `Usuário ${i}`,
                email: `u${i}@example.com`,
                ativo: true,
                created_at: "2026-01-01T00:00:00Z",
              })),
              page: 1,
              page_size: 20,
              total_count: 40,
            }),
            { status: 200 },
          ),
      ),
    );
  });

  it("clicar em Próxima dispara onPageChange com a próxima página", async () => {
    const { onPageChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: /próxima/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("selecionar o status no cabeçalho aplica o filtro correspondente", async () => {
    const { onFiltroChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: "Filtrar por Status" }));
    await user.click(screen.getByRole("menuitemradio", { name: "Inativo" }));

    expect(onFiltroChange).toHaveBeenCalledWith("ativo", "false");
  });

  it("aplicar texto no cabeçalho envia o termo sem espaços excedentes", async () => {
    const { onFiltroChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: "Filtrar por Usuário" }));
    await user.type(screen.getByPlaceholderText("Buscar por nome"), "  Ana Silva  ");
    await user.click(screen.getByRole("button", { name: "Aplicar" }));

    expect(onFiltroChange).toHaveBeenCalledWith("nome", "Ana Silva");
  });
});
