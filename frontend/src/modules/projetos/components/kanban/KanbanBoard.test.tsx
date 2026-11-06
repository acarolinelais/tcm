import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PerfilAtual } from "@/core/auth/api";

import { casosTesteApi, type CasoTeste } from "../../api/projetos.api";
import { ORDEM_KANBAN, type KanbanCard, type KanbanProjeto, type StatusCasoTeste } from "../../model/projeto";
import { KanbanBoard } from "./KanbanBoard";

vi.mock("../../api/projetos.api", () => ({
  projetosApi: {}, casosTesteApi: { kanban: vi.fn(), atualizar: vi.fn() }, formFactorApi: {}, modelosDispositivoApi: {},
}));

function card(tc_id: string, destinos: StatusCasoTeste[], extra: Partial<KanbanCard> = {}): KanbanCard {
  return { id: tc_id, tc_id, category: "A", difficulty: "Low", situation: "New", responsavel_id: "u1", responsavel_nome: "Afonso Fagundes", responsavel_cor_avatar: "verde", destinos, ...extra };
}

const maria = { responsavel_id: "u2", responsavel_nome: "Maria Pernalete" };
const filtravel = () => kanban({
  "To-Do": [card("Clock_001", []), card("Clock_002", [], { ...maria, difficulty: "High" }), card("Clock_003", [], maria)],
  InReview: [card("Clock_004", [], { ...maria, difficulty: "High" })],
  Done: [card("Clock_005", [])],
});

const botaoFilter = () => screen.getByRole("button", { name: /^Filter( \d+ active)?$/ });

async function filtrar(user: ReturnType<typeof userEvent.setup>, filtro: string, opcao: string) {
  // Os filtros ficam no painel do botão Filter. Com o painel aberto o resto da tela fica oculto para a
  // acessibilidade, então cada filtro abre o painel, escolhe e fecha o menu e depois o painel.
  await user.click(botaoFilter());
  await user.click(await screen.findByRole("button", { name: `Filter by ${filtro}` }));
  await user.click(await screen.findByRole("option", { name: opcao }));
  await user.keyboard("{Escape}");
  await waitFor(() => expect(screen.queryByRole("listbox")).not.toBeInTheDocument(), { timeout: 3000 });
  // O foco volta ao painel de forma assíncrona; um Escape que chega antes disso se perde, então repete até fechar.
  await waitFor(async () => {
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  }, { timeout: 3000 });
}

function kanban(porStatus: Partial<Record<StatusCasoTeste, KanbanCard[]>>): KanbanProjeto {
  const colunas = ORDEM_KANBAN.map((status) => ({ status, total: porStatus[status]?.length ?? 0, casos: porStatus[status] ?? [] }));
  return { projeto_id: "p1", total: colunas.reduce((soma, coluna) => soma + coluna.total, 0), colunas };
}

function renderBoard(url = "/") {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[url]}><KanbanBoard projetoId="p1" perfil={{ id: "kp", unidade_id: "u" } as PerfilAtual} podeGerenciar /></MemoryRouter></QueryClientProvider>);
}

const coluna = (nome: RegExp) => screen.getByRole("region", { name: nome });

describe("KanbanBoard", () => {
  beforeEach(() => {
    vi.mocked(casosTesteApi.kanban).mockReset();
    vi.mocked(casosTesteApi.atualizar).mockReset();
  });

  it("mostra as sete colunas na ordem do ciclo com os totais", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InReview: [card("Clock_001", []), card("Clock_002", [])], Done: [card("Clock_003", [])] }));
    renderBoard();

    const colunas = await screen.findAllByRole("region");
    expect(colunas.map((item) => item.getAttribute("aria-label"))).toEqual([
      "To-Do, 0 cases", "In Progress, 0 cases", "In Review, 2 cases", "In Validation, 0 cases", "In Fixes, 0 cases", "Done, 1 case", "Excluded, 0 cases",
    ]);
    expect(within(coluna(/^In Review/i)).getAllByRole("article")).toHaveLength(2);
    expect(within(coluna(/^In Review/i)).getByText("2")).toBeInTheDocument();
  });

  it("mostra a esfera do responsável na cor que ele escolheu", async () => {
    // O jsdom não carrega imagens: simula a esfera já carregada, como no teste do AvatarUsuario.
    vi.stubGlobal("Image", class { complete = true; naturalWidth = 160; src = ""; crossOrigin: string | null = null; addEventListener() {} removeEventListener() {} });
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ "To-Do": [card("Clock_001", [])] }));
    renderBoard();

    const artigo = await screen.findByRole("article", { name: "Clock_001" });
    await waitFor(() => expect(artigo.querySelector("img")?.getAttribute("src")).toContain("/green.jpg"));
    vi.unstubAllGlobals();
  });

  it("filtra por responsável e Difficulty juntos e recalcula os totais", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(filtravel());
    renderBoard();
    const user = userEvent.setup();
    await screen.findByRole("article", { name: "Clock_001" });

    await filtrar(user, "Assignee", "Maria Pernalete");
    await filtrar(user, "Difficulty", "High");

    expect(screen.getAllByRole("article").map((artigo) => artigo.getAttribute("aria-label"))).toEqual(["Clock_002", "Clock_004"]);
    expect(coluna(/^To-Do/)).toHaveAccessibleName("To-Do, 1 case");
    expect(coluna(/^Done/)).toHaveAccessibleName("Done, 0 cases");
  });

  it("cada coluna tem um ponto na cor do Status, e o To-Do é um anel vazio", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InReview: [card("Clock_001", [])] }));
    renderBoard();

    const ponto = (nome: RegExp) => (within(coluna(nome)).getByText(/^(To-Do|In Review)$/).previousElementSibling as HTMLElement);
    await screen.findByRole("article", { name: "Clock_001" });
    expect(ponto(/^In Review/)).toHaveStyle({ backgroundColor: "var(--etiqueta-review-fg)" });
    expect(ponto(/^To-Do/)).toHaveClass("border-body");
    expect(ponto(/^To-Do/).getAttribute("style")).toBeNull();
  });

  it("o filtro de Status mostra só as colunas escolhidas", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(filtravel());
    renderBoard("/?status=InReview&status=Done");

    await screen.findByRole("article", { name: "Clock_004" });
    expect(screen.getAllByRole("region").map((item) => item.getAttribute("aria-label"))).toEqual(["In Review, 1 case", "Done, 1 case"]);
  });

  it("filtros vindos do link são aplicados, e Limpar filtros volta ao quadro completo", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(filtravel());
    renderBoard("/?responsavel=u2&tc=clock_003");
    const user = userEvent.setup();

    await screen.findByRole("article", { name: "Clock_003" });
    expect(screen.getAllByRole("article")).toHaveLength(1);
    // Dois filtros ativos (responsável e TC ID): o botão mostra o número.
    expect(botaoFilter()).toHaveTextContent("2");
    await user.click(botaoFilter());
    await user.click(await screen.findByRole("button", { name: "Clear filters" }));
    await user.keyboard("{Escape}");
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(botaoFilter()).toHaveTextContent(/^Filter$/);
  });

  it("filtros sem resultado mostram o aviso próprio, não o de projeto vazio", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(filtravel());
    renderBoard("/?tc=nao-existe");

    const user = userEvent.setup();

    expect(await screen.findByRole("heading", { name: "No cases match the filters." })).toBeInTheDocument();
    expect(screen.queryByText("This project has no Test Cases yet.")).not.toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(7);
    // O botão Filter continua à mão, e o estado vazio também limpa os filtros.
    expect(botaoFilter()).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(screen.getAllByRole("article")).toHaveLength(5);
    expect(screen.queryByRole("heading", { name: "No cases match the filters." })).not.toBeInTheDocument();
  });

  it("mostra só os primeiros 50 cards e carrega o resto com Mostrar mais", async () => {
    const muitos = Array.from({ length: 60 }, (_, i) => card(`Clock_${String(i).padStart(3, "0")}`, []));
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ "To-Do": muitos }));
    renderBoard();
    const user = userEvent.setup();

    const toDo = await screen.findByRole("region", { name: /^To-Do/ });
    expect(within(toDo).getAllByRole("article")).toHaveLength(50);
    await user.click(within(toDo).getByRole("button", { name: "Show more (10)" }));
    expect(within(toDo).getAllByRole("article")).toHaveLength(60);
  });

  it("card só de leitura não oferece arrasto nem Mover para", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InReview: [card("Clock_001", [])] }));
    renderBoard();

    const artigo = await screen.findByRole("article", { name: "Clock_001" });
    expect(within(artigo).queryByRole("button")).not.toBeInTheDocument();
  });

  it("projeto vazio mostra as colunas e o aviso", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({}));
    renderBoard();

    expect(await screen.findByText("This project has no Test Cases yet.")).toBeInTheDocument();
    expect(screen.getAllByRole("region")).toHaveLength(7);
  });

  it("erro na consulta mostra Tentar novamente, sem o aviso de vazio", async () => {
    vi.mocked(casosTesteApi.kanban).mockRejectedValue(new Error("500"));
    renderBoard();
    const user = userEvent.setup();

    expect(await screen.findByText("Could not load the Kanban.")).toBeInTheDocument();
    expect(screen.queryByText("This project has no Test Cases yet.")).not.toBeInTheDocument();
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({}));
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("This project has no Test Cases yet.")).toBeInTheDocument();
  });

  it("Mover para, pelo teclado, move o caso para o Status escolhido", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InReview: [card("Clock_001", ["To-Do", "InValidation", "Cancelled"])] }));
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as CasoTeste);
    renderBoard();
    const user = userEvent.setup();

    const menu = await screen.findByRole("button", { name: "Move Clock_001 to" });
    menu.focus();
    await user.keyboard("{Enter}");
    const opcao = await screen.findByRole("menuitem", { name: "In Validation" });
    opcao.focus();
    await user.keyboard("{Enter}");

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("Clock_001", { status: "InValidation" }));
  });

  it("backup só vê Excluded, e cancelar a confirmação não muda nada", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InProgress: [card("Clock_001", ["Cancelled"])] }));
    renderBoard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Move Clock_001 to" }));
    expect((await screen.findAllByRole("menuitem")).map((item) => item.textContent)).toEqual(["Excluded"]);
    await user.click(screen.getByRole("menuitem", { name: "Excluded" }));
    const dialogo = await screen.findByRole("alertdialog");
    await user.click(within(dialogo).getByRole("button", { name: /cancel/i }));

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    expect(casosTesteApi.atualizar).not.toHaveBeenCalled();
    expect(within(coluna(/^In Progress/i)).getByRole("article", { name: "Clock_001" })).toBeInTheDocument();
  });

  it("excluir com justificativa grava o Status e a justificativa", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValue(kanban({ InProgress: [card("Clock_001", ["Cancelled"])] }));
    vi.mocked(casosTesteApi.atualizar).mockResolvedValue({} as CasoTeste);
    renderBoard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Move Clock_001 to" }));
    await user.click(await screen.findByRole("menuitem", { name: "Excluded" }));
    const dialogo = await screen.findByRole("alertdialog");
    await user.type(within(dialogo).getByRole("textbox"), "Depende de hardware");
    await user.click(within(dialogo).getByRole("button", { name: /exclude/i }));

    await waitFor(() => expect(casosTesteApi.atualizar).toHaveBeenCalledWith("Clock_001", { status: "Cancelled", justificativa_exclusao: "Depende de hardware" }));
  });

  it("recusa da API devolve o card à coluna original e avisa", async () => {
    vi.mocked(casosTesteApi.kanban).mockResolvedValueOnce(kanban({ InReview: [card("Clock_001", ["Done"])] })).mockReturnValue(new Promise(() => {}));
    vi.mocked(casosTesteApi.atualizar).mockRejectedValue(new Error("You can only edit Test Cases assigned to you."));
    renderBoard();
    const user = userEvent.setup();

    await user.click(await screen.findByRole("button", { name: "Move Clock_001 to" }));
    await user.click(await screen.findByRole("menuitem", { name: "Done" }));

    await waitFor(() => expect(within(coluna(/^In Review/i)).getByRole("article", { name: "Clock_001" })).toBeInTheDocument());
    expect(within(coluna(/^Done/i)).queryByRole("article")).not.toBeInTheDocument();
  });
});
