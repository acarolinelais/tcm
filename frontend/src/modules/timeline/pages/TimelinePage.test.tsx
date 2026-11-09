import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type { PerfilAtual } from "@/core/auth/api";
import { useCasoTeste, useProjetosSeletor, usePullRequestsCasoTeste } from "@/modules/projetos/hooks/useProjetos";

import { useTimeline } from "../hooks/useTimeline";
import type { Timeline } from "../model/timeline";
import { TimelinePage } from "./TimelinePage";

vi.mock("@/modules/projetos/hooks/useProjetos", () => ({
  useProjetosSeletor: vi.fn(),
  useCasoTeste: vi.fn(),
  usePullRequestsCasoTeste: vi.fn(),
  ehNaoEncontrado: () => false,
}));
vi.mock("../hooks/useTimeline", () => ({ useTimeline: vi.fn() }));

const perfil = {
  id: "kp-1", nome: "KP", email: "kp@example.com", unidade_id: "unit-1", unidade_nome: "Unit",
  perfil_codigo: "KP", perfil: "Key Person", permissoes: ["test_cases.consultar"], times: [], setores_gerenciados: [],
  time_atual_id: null, tem_multiplos_times: false, senha_alteracao_obrigatoria: false, idioma_preferido: "en", cor_avatar: "azul",
} as PerfilAtual;
const projetos = [{ id: "clock", nome: "Clock 9.5", app: "Clock" }, { id: "gallery", nome: "Gallery 9.5", app: "Gallery" }];
const mudanca = { campo: "status", valor_anterior: "InProgress", valor_novo: "InReview", usuario_nome: "Ana", usuario_perfil: "Key Person", origem: "api", alterado_em: "2026-12-29T13:00:00Z" };
const timeline: Timeline = {
  pessoas: [{ id: "ana", nome: "Ana", cor_avatar: "roxo" }, { id: "bia", nome: "Bia", cor_avatar: "verde" }],
  casos: [{ id: "c46", tc_id: "Clock_00046", title: "Alarme" }],
  cards: [{ caso_teste_id: "c46", tc_id: "Clock_00046", responsavel_id: "ana", responsavel_nome: "Ana", responsavel_cor_avatar: "roxo", dia: "2026-12-29", primeira_em: "2026-12-29T13:00:00Z", alteracoes: [mudanca] }],
};
const SEM_FILTROS = { responsavelIds: [], casoIds: [] };

function renderPage(perfilAtual = perfil) {
  function Contexto() { return <Outlet context={perfilAtual} />; }
  return render(<MemoryRouter><Routes><Route path="/" element={<Contexto />}><Route index element={<TimelinePage />} /></Route></Routes></MemoryRouter>);
}

/** Com o painel do Filter aberto, o resto da tela fica oculto para a acessibilidade: fecha a lista e depois o painel. */
async function fecharFiltros(user: ReturnType<typeof userEvent.setup>) {
  await waitFor(async () => {
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  }, { timeout: 3000 });
}

/** Últimos argumentos de `useTimeline`: projeto, início, fim e filtros. */
const ultimaConsulta = () => vi.mocked(useTimeline).mock.lastCall?.slice(0, 4);

describe("TimelinePage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Quarta, 30 de dezembro de 2026.
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 11, 30, 12));
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: projetos, page: 1, page_size: 100, total_count: 2 }] }, isError: false, isLoading: false } as never);
    vi.mocked(useTimeline).mockReturnValue({ data: timeline, isError: false, refetch: vi.fn() } as never);
    vi.mocked(useCasoTeste).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never);
    vi.mocked(usePullRequestsCasoTeste).mockReturnValue({ data: undefined, isLoading: true, isError: false } as never);
  });

  afterEach(() => vi.useRealTimers());

  it("abre o primeiro projeto na semana atual, de segunda a domingo, com os cards e a pilha de avatares (CA-01)", () => {
    renderPage();

    // Título azul da página; o projeto fica no seletor da barra, ao lado do botão Filter (spec 057).
    expect(screen.getByRole("heading", { level: 1, name: "Timeline" })).toHaveClass("text-accent-text");
    expect(screen.getByText("What changed in the project's Test Cases, day by day.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clock" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter" })).toBeInTheDocument();
    expect(ultimaConsulta()).toEqual(["clock", "2026-12-28", "2027-01-03", SEM_FILTROS]);
    expect(within(screen.getByRole("list", { name: "Tuesday, December 29" })).getByRole("button", { name: "Clock_00046, Ana, 1 change" })).toBeInTheDocument();
    expect(screen.getByRole("list", { name: "People with changes in this period" })).toBeInTheDocument();
  });

  it("esconde o projeto cancelado do seletor até ligar o filtro, que volta desligado ao reabrir a tela", async () => {
    const comCancelado = [...projetos, { id: "notes", nome: "Notes 9.5", app: "Notes", status: "Canceled" }];
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: comCancelado, page: 1, page_size: 100, total_count: 3 }] }, isError: false, isLoading: false } as never);
    vi.useRealTimers();
    const user = userEvent.setup();
    const { unmount } = renderPage();

    await user.click(screen.getByRole("button", { name: "Clock" }));
    expect(await screen.findByRole("menuitemradio", { name: "Gallery 9.5" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio", { name: "Notes 9.5" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: "Closed projects" }));
    await user.click(screen.getByRole("button", { name: "Clock" }));
    expect(await screen.findByRole("menuitemradio", { name: "Notes 9.5" })).toBeInTheDocument();

    unmount();
    renderPage();
    expect(screen.getByRole("button", { name: "Closed projects" })).toHaveAttribute("aria-pressed", "false");
  });

  it("desligar a pílula com um projeto encerrado aberto volta para o primeiro aberto", async () => {
    const comCancelado = [...projetos, { id: "notes", nome: "Notes 9.5", app: "Notes", status: "Canceled" }];
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: comCancelado, page: 1, page_size: 100, total_count: 3 }] }, isError: false, isLoading: false } as never);
    vi.useRealTimers();
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Closed projects" }));
    await user.click(screen.getByRole("button", { name: "Clock" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Notes 9.5" }));
    expect(await screen.findByRole("button", { name: "Notes" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Closed projects" }));

    expect(await screen.findByRole("button", { name: "Clock" })).toBeInTheDocument();
    expect(ultimaConsulta()?.[0]).toBe("clock");
  });

  it("só com projetos encerrados mostra o aviso com o filtro", async () => {
    vi.mocked(useProjetosSeletor).mockReturnValue({ data: { pages: [{ items: [{ id: "notes", nome: "Notes 9.5", app: "Notes", status: "Completed" }], page: 1, page_size: 100, total_count: 1 }] }, isError: false, isLoading: false } as never);
    vi.useRealTimers();
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("No open projects")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Closed projects" }));

    expect(screen.queryByText("No open projects")).not.toBeInTheDocument();
    expect(screen.getByText("Notes")).toBeInTheDocument();
  });

  it("volta uma semana pela seta e retorna com Hoje (CA-06)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Previous period" }));
    expect(ultimaConsulta()?.slice(1, 3)).toEqual(["2026-12-21", "2026-12-27"]);

    await user.click(screen.getByRole("button", { name: "Today" }));
    expect(ultimaConsulta()?.slice(1, 3)).toEqual(["2026-12-28", "2027-01-03"]);
  });

  it("filtra duas pessoas, mantém os filtros ao trocar para Mês e limpa ao trocar de projeto (CA-03, CA-05)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "People" }));
    await user.click(await screen.findByRole("option", { name: "Ana" }));
    await user.click(screen.getByRole("option", { name: "Bia" }));
    expect(ultimaConsulta()?.[3]).toEqual({ responsavelIds: ["ana", "bia"], casoIds: [] });
    await fecharFiltros(user);
    expect(screen.getByRole("button", { name: "Filter 1 active" })).toBeInTheDocument();

    await user.click(screen.getByRole("radio", { name: "Month" }));
    expect(ultimaConsulta()).toEqual(["clock", "2026-12-01", "2026-12-31", { responsavelIds: ["ana", "bia"], casoIds: [] }]);

    await user.click(screen.getByRole("button", { name: "Clock" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Gallery 9.5" }));
    expect(ultimaConsulta()).toEqual(["gallery", "2026-12-01", "2026-12-31", SEM_FILTROS]);
  });

  it("filtra Test Cases buscando pelo título (CA-04)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "Test Cases" }));
    await user.type(await screen.findByRole("searchbox"), "alarme");
    await user.click(screen.getByRole("option", { name: /Clock_00046/ }));

    expect(ultimaConsulta()?.[3]).toEqual({ responsavelIds: [], casoIds: ["c46"] });
  });

  it("abre o card com as mudanças e, dele, o Test Case (CA-02)", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(screen.getByRole("button", { name: "Clock_00046, Ana, 1 change" }));
    expect(await screen.findByText("In Review")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Open Test Case" }));
    expect(useCasoTeste).toHaveBeenLastCalledWith("c46", perfil);
  });

  it("falha: período sem mudanças mostra o aviso e, com filtro, Limpar filtros volta ao todo (CA-11)", async () => {
    const user = userEvent.setup();
    vi.mocked(useTimeline).mockReturnValue({ data: { ...timeline, cards: [] }, isError: false, refetch: vi.fn() } as never);
    renderPage();
    expect(screen.getByText("No changes in this period")).toBeInTheDocument();
    expect(screen.getByText("Try another period or project.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clear filters" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Filter" }));
    await user.click(await screen.findByRole("button", { name: "People" }));
    await user.click(await screen.findByRole("option", { name: "Ana" }));
    await fecharFiltros(user);
    // Com filtro, o vazio ganha a dica de filtros e o botão de limpar; o Filter continua à mão.
    expect(screen.getByText("Try other filters or clear them.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Filter 1 active" })).toBeEnabled();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));

    expect(ultimaConsulta()?.[3]).toEqual(SEM_FILTROS);
  });

  it("falha: erro da consulta mostra Tentar de novo, e sem permissão a tela é recusada (CA-09)", async () => {
    const refetch = vi.fn();
    vi.mocked(useTimeline).mockReturnValue({ data: undefined, isError: true, refetch } as never);
    const { unmount } = renderPage();
    await userEvent.setup().click(screen.getByRole("button", { name: "Try again" }));
    expect(refetch).toHaveBeenCalled();
    unmount();

    renderPage({ ...perfil, permissoes: [] });
    expect(screen.getByRole("alert")).toBeInTheDocument();
    expect(useProjetosSeletor).toHaveBeenLastCalledWith(expect.anything(), false);
  });
});
