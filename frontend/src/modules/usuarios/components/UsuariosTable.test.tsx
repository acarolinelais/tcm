import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsuariosTable } from "./UsuariosTable";

function renderTable() {
  const client = new QueryClient();
  const onPageChange = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <UsuariosTable
        page={1}
        pageSize={20}
        pageSizeOptions={[10, 20]}
        filtros={{}}
        onFiltroChange={vi.fn()}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        onEditar={vi.fn()}
        onNovoUsuario={vi.fn()}
        onLimparFiltros={vi.fn()}
      />
    </QueryClientProvider>,
  );
  return { onPageChange };
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
});
