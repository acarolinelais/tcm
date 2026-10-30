import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { projetosApi } from "../api/projetos.api";
import type { NavegacaoBoard } from "../model/projeto";
import { BoardPage } from "./BoardPage";

vi.mock("../api/projetos.api", () => ({ projetosApi: { navegacao: vi.fn() }, casosTesteApi: {}, formFactorApi: {}, modelosDispositivoApi: {} }));

const perfil = { id: "gerente", unidade_id: "u" } as PerfilAtual;
const projeto = (id: string, nome: string) => ({ id, nome, status: "InProgress" as const });

function Destino() {
  const local = useLocation();
  return <p>{`destino ${local.pathname}${local.search}`}</p>;
}

function renderBoard(arvore: NavegacaoBoard | Error, url = "/board") {
  if (arvore instanceof Error) vi.mocked(projetosApi.navegacao).mockRejectedValue(arvore);
  else vi.mocked(projetosApi.navegacao).mockResolvedValue(arvore);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={perfil} />; }
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[url]}>
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

const doisSetores: NavegacaoBoard = {
  setores: [
    { id: "s1", nome: "Mobile", times: [
      { id: "t1", nome: "Clock", projetos: [projeto("p1", "Clock 9.5"), projeto("p2", "Alarm 9.5")] },
      { id: "t2", nome: "Vazio", projetos: [] },
    ] },
    { id: "s2", nome: "Web", times: [{ id: "t3", nome: "Site", projetos: [projeto("p3", "Site 1.0")] }] },
  ],
};

async function escolher(user: ReturnType<typeof userEvent.setup>, campo: string, opcao: string) {
  await user.click(await screen.findByRole("button", { name: new RegExp(campo) }));
  await user.click(await screen.findByRole("option", { name: opcao }));
}

describe("BoardPage", () => {
  beforeEach(() => { vi.mocked(projetosApi.navegacao).mockReset(); });

  it("escolhe setor, time e projeto e abre a tela do Kanban do projeto", async () => {
    renderBoard(doisSetores);
    const user = userEvent.setup();

    await escolher(user, "Sector", "Mobile");
    await escolher(user, "Team", "Clock");
    await escolher(user, "Project", "Alarm 9.5");

    expect(await screen.findByText("destino /board/p2")).toBeInTheDocument();
  });

  it("só oferece os setores do escopo e esconde time e projeto até a escolha", async () => {
    renderBoard(doisSetores);
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: /Sector/ }));
    expect((await screen.findAllByRole("option")).map((opcao) => opcao.textContent)).toEqual(["Mobile", "Web"]);
    expect(screen.queryByRole("button", { name: /Team/ })).not.toBeInTheDocument();
  });

  it("setor único já vem escolhido", async () => {
    renderBoard({ setores: [doisSetores.setores[0]] });

    expect(await screen.findByRole("button", { name: /Team/ })).toBeInTheDocument();
  });

  it("um caminho só até um projeto só vai direto para o Kanban", async () => {
    renderBoard({ setores: [doisSetores.setores[1]] });

    expect(await screen.findByText("destino /board/p3")).toBeInTheDocument();
  });

  it("trocar o setor limpa o time escolhido", async () => {
    renderBoard(doisSetores, "/board?setor=s1&time=t1");
    const user = userEvent.setup();

    expect(await screen.findByRole("button", { name: /Project/ })).toBeInTheDocument();
    await escolher(user, "Sector", "Web");

    // Web tem um time só com um projeto só: sem o time antigo, segue direto para o Kanban dele.
    expect(await screen.findByText("destino /board/p3")).toBeInTheDocument();
  });

  it("time sem projetos mostra o aviso", async () => {
    renderBoard(doisSetores, "/board?setor=s1&time=t2");

    expect(await screen.findByText("This team has no projects yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Project/ })).not.toBeInTheDocument();
  });

  it("sem times no escopo mostra o aviso, sem seletores vazios", async () => {
    renderBoard({ setores: [] });

    expect(await screen.findByText("There are no teams available to you yet.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Sector/ })).not.toBeInTheDocument();
  });

  it("falha ao carregar mostra o erro com Tentar novamente", async () => {
    renderBoard(new Error("500"));

    expect(await screen.findByText("Could not load the sectors and teams.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Try again" })).toBeInTheDocument();
  });
});
