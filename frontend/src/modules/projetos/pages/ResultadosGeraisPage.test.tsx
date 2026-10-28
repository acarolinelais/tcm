import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Outlet, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useCasoTeste, useFormFactorGlobal, useFormFactorResultadosGlobais, useProjetosSeletor } from "../hooks/useProjetos";
import { ResultadosGeraisPage } from "./ResultadosGeraisPage";

vi.mock("../hooks/useProjetos", () => ({
  useFormFactorGlobal: vi.fn(),
  useFormFactorResultadosGlobais: vi.fn(),
  useProjetosSeletor: vi.fn(),
  // Painel de detalhes (specs 028 e 030).
  ehNaoEncontrado: () => false,
  useCasoTeste: vi.fn(),
  usePullRequestsCasoTeste: () => ({ data: { itens: [], pode_remover: true }, isError: false }),
  useAdicionarPullRequest: () => ({ isPending: false, mutateAsync: vi.fn() }),
  useRemoverPullRequest: () => ({ isPending: false, mutate: vi.fn() }),
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
    vi.mocked(useCasoTeste).mockImplementation((id) => ({ data: id ? { id, tc_id: id === "case-2" ? "TC-002" : "TC-001", title: `Título ${id}`, precondition: null, procedure: null, expected_result: null } : undefined, isError: false, error: null }) as never);
  });

  it("abre o painel do caso pelo TC ID no Resumo e em todas as rodadas, sem perder o filtro (spec 030)", async () => {
    const linha = { projeto_id: "project-1", projeto_nome: "Keyboard 9.8", responsavel_id: "user-1", sdf_id: null, data_reportada: null, resultados: {}, modelos_ids: [] };
    vi.mocked(useFormFactorGlobal).mockReturnValue({ data: { modelos: [], responsaveis: [], items: [{ ...linha, caso_teste_id: "case-1", tc_id: "TC-001" }], page: 1, page_size: 20, total_count: 1 }, isLoading: false, isError: false } as never);
    vi.mocked(useFormFactorResultadosGlobais).mockReturnValue({ data: { modelos: [], responsaveis: [], items: [{ ...linha, execucao_id: "run-1", origem: "SDF", data_reportada: "2026-10-25T12:00:00Z", caso_teste_id: "case-2", tc_id: "TC-002" }], page: 1, page_size: 20, total_count: 1 }, isLoading: false, isError: false } as never);
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "TC-001" }));
    const painel = await screen.findByRole("dialog");
    expect(within(painel).getByRole("heading", { name: "TC-001" })).toBeInTheDocument();
    expect(within(painel).getByText("Título case-1")).toBeInTheDocument();
    expect(within(painel).getByRole("heading", { name: "Pull Requests" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());

    await user.click(screen.getByRole("tab", { name: "All results" }));
    await user.click(screen.getByRole("button", { name: "Filter by TC ID" }));
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "TC-002{Enter}");
    await user.keyboard("{Escape}");
    await user.click(await screen.findByRole("button", { name: "TC-002" }));
    expect(within(await screen.findByRole("dialog")).getByRole("heading", { name: "TC-002" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    expect(useFormFactorResultadosGlobais).toHaveBeenLastCalledWith(expect.objectContaining({ tcId: "TC-002", page: 1 }), perfil, true);
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
    await user.type(await screen.findByRole("searchbox", { name: "TC ID" }), "TC-8{Enter}");

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
