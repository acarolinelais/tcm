import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { projetosApi } from "../api/projetos.api";
import type { NavegacaoBoard, StatusProjeto } from "../model/projeto";
import { salvarUltimoProjetoBoard } from "../utils/ultimo-projeto-board";
import { BoardPage } from "./BoardPage";

vi.mock("../api/projetos.api", () => ({ projetosApi: { navegacao: vi.fn() }, casosTesteApi: {}, formFactorApi: {}, modelosDispositivoApi: {} }));

const gerente = { id: "gerente", unidade_id: "u", perfil_codigo: "GERENTE" } as PerfilAtual;
const dev = { id: "dev", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO" } as PerfilAtual;
const projeto = (id: string, nome: string, status: StatusProjeto = "InProgress") => ({ id, nome, status });

const variosTimes: NavegacaoBoard = {
  setores: [
    { id: "s1", nome: "SVP", times: [
      { id: "t1", nome: "SDF Automation", membros: 11, projetos: [projeto("p1", "Clock 9.5"), projeto("p2", "Alarm 9.5", "Completed")] },
      { id: "t2", nome: "QA Mobile", membros: 1, projetos: [] },
    ] },
    { id: "s2", nome: "Web", times: [{ id: "t3", nome: "Site", membros: 4, projetos: [projeto("p3", "Portal 2.0")] }] },
  ],
};
const umTime: NavegacaoBoard = {
  setores: [{ id: "s1", nome: "SVP", times: [{ id: "t1", nome: "SDF Automation", membros: 11, projetos: [
    projeto("p2", "Alarm 9.5", "Completed"), projeto("p1", "Clock 9.5"), projeto("p4", "Weather 9.5"),
  ] }] }],
};

function Destino() {
  return <p>{`destino ${useLocation().pathname}`}</p>;
}

function renderBoard(perfil: PerfilAtual, arvore: NavegacaoBoard | Error) {
  if (arvore instanceof Error) vi.mocked(projetosApi.navegacao).mockRejectedValue(arvore);
  else vi.mocked(projetosApi.navegacao).mockResolvedValue(arvore);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/board"]}>
        <Routes>
          <Route element={<Contexto />}>
            <Route path="board" element={<BoardPage />} />
            <Route path="board/:projetoId" element={<Destino />} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("BoardPage", () => {
  beforeEach(() => {
    vi.mocked(projetosApi.navegacao).mockReset();
    localStorage.clear();
  });

  it("gerente com vários times vê os cards por setor e abre o Kanban num clique", async () => {
    renderBoard(gerente, variosTimes);
    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: /^SVP/ })).toHaveTextContent("SVP2 teams");
    expect(screen.getByRole("heading", { name: /^Web/ })).toBeInTheDocument();
    const time = screen.getByRole("article", { name: "SDF Automation" });
    // Estilo do protótipo (spec 056): título azul e cartão de time no painel cinza, sem borda.
    expect(screen.getByRole("heading", { level: 1, name: "Board" })).toHaveClass("text-accent-text");
    expect(time).toHaveClass("bg-panel");
    expect(within(time).getByText(/11 members/)).toHaveTextContent("11 members·2 projects");
    expect(within(screen.getByRole("article", { name: "QA Mobile" })).getByText("This team has no projects yet.")).toBeInTheDocument();
    await user.click(within(time).getByRole("link", { name: /Clock 9\.5/ }));

    expect(await screen.findByText("destino /board/p1")).toBeInTheDocument();
  });

  it("a busca filtra por time ou por projeto", async () => {
    renderBoard(gerente, variosTimes);
    const user = userEvent.setup();
    await screen.findByRole("article", { name: "Site" });

    await user.type(screen.getByRole("searchbox", { name: "Search team or project" }), "portal");
    expect(screen.getAllByRole("article").map((card) => card.getAttribute("aria-label"))).toEqual(["Site"]);
    expect(screen.queryByRole("heading", { name: /^SVP/ })).not.toBeInTheDocument();

    await user.clear(screen.getByRole("searchbox", { name: "Search team or project" }));
    await user.type(screen.getByRole("searchbox", { name: "Search team or project" }), "nada disso");
    expect(screen.getByText("No team or project matches the search.")).toBeInTheDocument();
  });

  it("dev vai direto para o primeiro projeto ativo, mesmo com vários times", async () => {
    renderBoard(dev, variosTimes);

    expect(await screen.findByText("destino /board/p1")).toBeInTheDocument();
    expect(screen.queryByRole("article")).not.toBeInTheDocument();
  });

  it("quem tem um time só vai direto, e volta ao último Kanban que abriu", async () => {
    salvarUltimoProjetoBoard("gerente", "p4");
    renderBoard(gerente, umTime);

    expect(await screen.findByText("destino /board/p4")).toBeInTheDocument();
  });

  it("um último projeto que não existe mais cai no primeiro ativo, pulando os encerrados", async () => {
    salvarUltimoProjetoBoard("dev", "removido");
    renderBoard(dev, umTime);

    expect(await screen.findByText("destino /board/p1")).toBeInTheDocument();
  });

  it("dev cujos times não têm projetos vê o aviso, sem cards", async () => {
    renderBoard(dev, { setores: [{ id: "s1", nome: "SVP", times: [{ id: "t1", nome: "SDF Automation", membros: 3, projetos: [] }] }] });

    expect(await screen.findByRole("heading", { name: "No projects to show" })).toBeInTheDocument();
  });

  it("sem times no escopo mostra o aviso", async () => {
    renderBoard(gerente, { setores: [] });

    expect(await screen.findByRole("heading", { name: "No teams to show" })).toBeInTheDocument();
    expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  });

  it("falha ao carregar mostra o erro com Tentar novamente", async () => {
    renderBoard(gerente, new Error("500"));

    expect(await screen.findByText("Could not load the sectors and teams.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
