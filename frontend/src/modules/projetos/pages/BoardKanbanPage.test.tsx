import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { casosTesteApi, projetosApi } from "../api/projetos.api";
import { BoardKanbanPage } from "./BoardKanbanPage";

vi.mock("../api/projetos.api", () => ({
  projetosApi: { obter: vi.fn(), navegacao: vi.fn() }, casosTesteApi: { kanban: vi.fn(), atualizar: vi.fn() }, formFactorApi: {}, modelosDispositivoApi: {},
}));

const perfil = { id: "dev", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO", permissoes: ["test_cases.consultar"] } as unknown as PerfilAtual;
const projeto = { id: "p1", unidade_id: "u", time_id: "t1", nome: "Weather 9.5", app: "Weather", one_ui: "9.5", status: "Created" as const, ativo: true, created_at: null, updated_at: null };

function Local() {
  return <p>{`local ${useLocation().pathname}`}</p>;
}

function renderPagina() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/board/p1"]}>
        <Routes><Route element={<Contexto />}><Route path="board/:projetoId" element={<><BoardKanbanPage /><Local /></>} /></Route></Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BoardKanbanPage", () => {
  beforeEach(() => {
    vi.mocked(projetosApi.obter).mockReset();
    vi.mocked(casosTesteApi.kanban).mockReset();
    vi.mocked(projetosApi.navegacao).mockReset().mockResolvedValue({ setores: [{ id: "s1", nome: "SVP", times: [{ id: "t1", nome: "SDF Automation", projetos: [
      { id: "p1", nome: "Weather 9.5", status: "Created" }, { id: "p2", nome: "Clock 9.5", status: "InProgress" },
    ] }] }] });
  });

  it("mostra só o Kanban do projeto, sem as abas da tela do projeto", async () => {
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(casosTesteApi.kanban).mockResolvedValue({ projeto_id: "p1", total: 0, colunas: [] });
    renderPagina();

    expect(await screen.findByRole("heading", { name: "Weather 9.5" })).toBeInTheDocument();
    expect(await screen.findByText("This project has no Test Cases yet.")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("o seletor do título troca para o Kanban de outro projeto do Board", async () => {
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(casosTesteApi.kanban).mockResolvedValue({ projeto_id: "p1", total: 0, colunas: [] });
    renderPagina();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Weather 9.5" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Clock 9.5" }));

    expect(await screen.findByText("local /board/p2")).toBeInTheDocument();
  });

  it("projeto fora do escopo ou inexistente mostra não encontrado, sem consultar o Kanban", async () => {
    vi.mocked(projetosApi.obter).mockRejectedValue(new Error("404"));
    renderPagina();

    expect(await screen.findByRole("alert")).toBeInTheDocument();
    expect(casosTesteApi.kanban).not.toHaveBeenCalled();
  });
});
