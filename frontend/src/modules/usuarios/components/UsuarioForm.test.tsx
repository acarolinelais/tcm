import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsuarioForm } from "./UsuarioForm";

function renderForm(onSalvo = vi.fn()) {
  const client = new QueryClient();
  render(
    <QueryClientProvider client={client}>
      <UsuarioForm onSalvo={onSalvo} />
    </QueryClientProvider>,
  );
  return { onSalvo };
}

describe("UsuarioForm", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: "1",
              nome: "Ana",
              email: "ana@example.com",
              ativo: true,
              created_at: "2026-01-01T00:00:00Z",
            }),
            { status: 201 },
          ),
      ),
    );
  });

  it("sucesso: envia dados válidos e chama onSalvo", async () => {
    const { onSalvo } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
  });

  it("falha: campos vazios mostram erros e não chamam a API", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });
});
