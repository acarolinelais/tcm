import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useFormFactorGlobal, useFormFactorResultadosGlobais, useProjetosSeletor } from "../hooks/useProjetos";
import { ResultadosGeraisPage } from "./ResultadosGeraisPage";

vi.mock("../hooks/useProjetos", () => ({
  useFormFactorGlobal: vi.fn(),
  useFormFactorResultadosGlobais: vi.fn(),
  useProjetosSeletor: vi.fn(),
}));

const perfil = {
  id: "manager-1", nome: "Gerente", email: "manager@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "GERENTE", perfil: "Gerente", permissoes: ["form_factor.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en",
} as PerfilAtual;

function renderPage(currentProfile: PerfilAtual = perfil) {
  const router = createMemoryRouter([{
    path: "/",
    element: <><Outlet context={currentProfile} /></>,
    children: [{ index: true, element: <ResultadosGeraisPage /> }],
  }], { initialEntries: ["/"] });
  return render(<RouterProvider router={router} />);
}

describe("ResultadosGeraisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [], page: 1, page_size: 100, total_count: 0 }] }, isError: false } as never);
    vi.mocked(useFormFactorGlobal).mockReturnValue({ data: { modelos: [], responsaveis: [], items: [], page: 1, page_size: 20, total_count: 0 }, isLoading: false, isError: false } as never);
    vi.mocked(useFormFactorResultadosGlobais).mockReturnValue({ data: { modelos: [], responsaveis: [], items: [], page: 1, page_size: 20, total_count: 0 }, isLoading: false, isError: false } as never);
  });

  it("abre no Resumo e consulta apenas a visão selecionada", () => {
    renderPage();
    expect(screen.getByRole("heading", { name: "General Results" })).toBeInTheDocument();
    expect(screen.getByRole("tab", { name: "Summary" })).toHaveAttribute("aria-selected", "true");
    expect(useFormFactorGlobal).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, pageSize: 20 }), perfil, true);
    expect(useFormFactorResultadosGlobais).toHaveBeenLastCalledWith(expect.any(Object), perfil, false);
  });

  it("alterna para todas as rodadas e aplica o filtro reiniciando a página", async () => {
    const user = userEvent.setup();
    renderPage();
    await user.click(screen.getByRole("tab", { name: "All results" }));
    await waitFor(() => expect(useFormFactorResultadosGlobais).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1 }), perfil, true));

    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(screen.getByRole("textbox", { name: "TC ID" }), "TC-8{Enter}");

    await waitFor(() => expect(useFormFactorResultadosGlobais).toHaveBeenLastCalledWith(
      expect.objectContaining({ tcId: "TC-8", page: 1 }), perfil, true,
    ));
  });

  it("recusa acesso direto para perfil sem permissão ou papel permitido", () => {
    renderPage({ ...perfil, perfil_codigo: "USUARIO_PADRAO" });
    expect(screen.getByRole("alert")).toHaveTextContent("You do not have permission");
    expect(useFormFactorGlobal).toHaveBeenLastCalledWith(expect.any(Object), expect.any(Object), false);
  });

});
