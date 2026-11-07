import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import i18n from "@/core/i18n";

import { DocumentacaoPage } from "./DocumentacaoPage";

const perfilDe = (perfil_codigo: string) => ({ perfil_codigo }) as PerfilAtual;

function renderPage(perfil: PerfilAtual) {
  function ContextOutlet() { return <Outlet context={perfil} />; }
  const router = createMemoryRouter(
    [{ path: "/", element: <ContextOutlet />, children: [{ path: "documentation", element: <DocumentacaoPage /> }] }],
    { initialEntries: ["/documentation"] },
  );
  return render(<RouterProvider router={router} />);
}

describe("DocumentacaoPage", () => {
  beforeEach(async () => { await i18n.changeLanguage("en"); });

  it("mostra Ciclo de Status em destaque para o dev e todos os guias abaixo", () => {
    renderPage(perfilDe("USUARIO_PADRAO"));
    const destaques = screen.getByRole("region", { name: "For your role" });
    expect(within(destaques).getAllByRole("link").map((link) => link.textContent)).toEqual([
      expect.stringContaining("Test Case status cycle"),
      expect.stringContaining("Status and Situation"),
    ]);
    const todos = within(screen.getByRole("region", { name: "All guides" })).getAllByRole("link");
    expect(todos).toHaveLength(12);
    expect(todos[1]).toHaveAttribute("href", "/documentation/status-cycle");
  });

  it("filtra pelo título e mostra Nenhum guia encontrado quando nada corresponde", async () => {
    const user = userEvent.setup();
    renderPage(perfilDe("KP"));
    const campo = screen.getByRole("searchbox", { name: "Filter guides by title" });

    await user.type(campo, "sdf");
    expect(screen.queryByRole("region", { name: "For your role" })).not.toBeInTheDocument();
    expect(within(screen.getByRole("region", { name: "All guides" })).getAllByRole("link")).toHaveLength(1);

    await user.clear(campo);
    await user.type(campo, "xyz");
    expect(screen.getByRole("status")).toHaveTextContent("No guide found");
  });
});
