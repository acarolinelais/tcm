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
    vi.mocked(projetosApi.navegacao).mockReset().mockResolvedValue({ setores: [{ id: "s1", nome: "SVP", times: [{ id: "t1", nome: "SDF Automation", membros: 11, projetos: [
      { id: "p1", nome: "Weather 9.5", status: "Created" }, { id: "p2", nome: "Clock 9.5", status: "InProgress" },
    ] }] }] });
  });

  it("mostra só o Kanban do projeto, sem as abas da tela do projeto", async () => {
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(casosTesteApi.kanban).mockResolvedValue({ projeto_id: "p1", total: 0, colunas: [] });
    renderPagina();

    // O título da página é o Board; o projeto fica no seletor da linha de baixo, ao lado do botão Filter.
    expect(await screen.findByRole("heading", { level: 1, name: "Board" })).toBeInTheDocument();
    expect(screen.getByText("Follow the project's Test Cases by status and move them as the work advances.")).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Weather 9.5" })).toBeInTheDocument();
    expect(await screen.findByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(await screen.findByText("This project has no Test Cases yet.")).toBeInTheDocument();
    expect(screen.queryByRole("tab")).not.toBeInTheDocument();
  });

  it("mostra as sete colunas e os responsáveis dos casos em avatares, cinco e +1 (CA-01, CA-02)", async () => {
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    const nomes = ["Ana", "Bia", "Caio", "Dani", "Edu", "Fabi"];
    const casos = nomes.map((nome) => ({ id: `c-${nome}`, tc_id: `Clock_${nome}`, category: "A", difficulty: "Low" as const, situation: "New" as const, responsavel_id: nome, responsavel_nome: nome, responsavel_cor_avatar: "azul" as const, destinos: [] }));
    vi.mocked(casosTesteApi.kanban).mockResolvedValue({
      projeto_id: "p1", total: 6,
      colunas: ["To-Do", "InProgress", "InReview", "InValidation", "InFixes", "Done", "Cancelled"].map((status) => ({ status, total: status === "To-Do" ? 6 : 0, casos: status === "To-Do" ? casos : [] })),
    } as never);
    renderPagina();

    expect(await screen.findAllByRole("region")).toHaveLength(7);
    const lista = screen.getByRole("list", { name: "Assignees in this project" });
    expect(lista.querySelectorAll("li")).toHaveLength(6);
    expect(screen.getByLabelText("1 more")).toHaveTextContent("+1");
    expect(casosTesteApi.kanban).toHaveBeenCalledTimes(1);
  });

  it("a consulta do Kanban com erro mostra a mensagem e o botão de tentar de novo, mantendo o seletor (falha, CA-08)", async () => {
    vi.mocked(projetosApi.obter).mockResolvedValue(projeto);
    vi.mocked(casosTesteApi.kanban).mockRejectedValue(new Error("offline"));
    renderPagina();

    expect(await screen.findByRole("button", { name: "Try again" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Weather 9.5" })).toBeInTheDocument();
    expect(screen.queryByRole("list", { name: "Assignees in this project" })).not.toBeInTheDocument();
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
