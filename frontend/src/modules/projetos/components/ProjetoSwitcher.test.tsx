import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { projetosApi } from "../api/projetos.api";
import { ProjetoSwitcher } from "./ProjetoSwitcher";

vi.mock("../api/projetos.api", () => ({ projetosApi: { listar: vi.fn() } }));
function abrir(props: { comoTitulo?: boolean; azul?: boolean } = {}) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={{ id: "dev", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO" }} />; }
  function Pagina() { const location = useLocation(); return <><ProjetoSwitcher projetoId="p0" nome="Clock" {...props} /><p>{location.pathname}</p></>; }
  render(<QueryClientProvider client={client}><MemoryRouter initialEntries={["/projetos/p0"]}><Routes><Route element={<Contexto />}><Route path="projetos/:id" element={<Pagina />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
}
beforeEach(() => vi.clearAllMocks());
it("carrega e seleciona projeto além das primeiras 100 opções", async () => {
  const user = userEvent.setup();
  vi.mocked(projetosApi.listar).mockImplementation(async (page) => ({
    items: page === 1 ? Array.from({ length: 100 }, (_, i) => ({ id: `p${i}`, nome: `Projeto ${i}` })) : [{ id: "p100", nome: "Último" }],
    page: page ?? 1, page_size: 100, total_count: 101,
  }) as never);
  abrir();
  await waitFor(() => expect(projetosApi.listar).toHaveBeenCalledWith(1, 100, true));
  await user.click(await screen.findByRole("button", { name: "Clock" }));
  await user.keyboard("{ArrowDown}");
  // Sem `buscavel`, o menu continua sem campo de busca.
  expect(screen.queryByRole("searchbox")).not.toBeInTheDocument();
  await user.click(await screen.findByRole("button", { name: "Load more projects" }));
  await user.click(await screen.findByRole("menuitemradio", { name: "Último" }));
  expect(screen.getByText("/projetos/p100")).toBeInTheDocument();
});
it("permite repetir consulta que falhou sem esconder o erro", async () => {
  const user = userEvent.setup();
  vi.mocked(projetosApi.listar).mockRejectedValue(new Error("offline"));
  abrir();
  await user.click(await screen.findByRole("button", { name: "Clock" }));
  await user.keyboard("{ArrowDown}");
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  await waitFor(() => expect(projetosApi.listar).toHaveBeenCalledTimes(2));
});

it("repete a página seguinte que falhou preservando as opções carregadas", async () => {
  const user = userEvent.setup();
  let falhou = false;
  vi.mocked(projetosApi.listar).mockImplementation(async (page) => {
    if (page === 2 && !falhou) { falhou = true; throw new Error("offline"); }
    return { items: page === 1 ? [{ id: "p0", nome: "Clock" }, { id: "p1", nome: "Existente" }] : [{ id: "p100", nome: "Recuperado" }], page: page ?? 1, page_size: 100, total_count: 101 } as never;
  });
  abrir();
  await user.click(await screen.findByRole("button", { name: "Clock" }));
  await user.keyboard("{ArrowDown}");
  await user.click(await screen.findByRole("button", { name: "Load more projects" }));
  expect(await screen.findByRole("alert")).toBeInTheDocument();
  expect(screen.getByRole("menuitemradio", { name: "Existente" })).toBeInTheDocument();
  await user.click(screen.getByRole("button", { name: "Try again" }));
  expect(await screen.findByRole("menuitemradio", { name: "Recuperado" })).toBeInTheDocument();
  expect(projetosApi.listar).toHaveBeenLastCalledWith(2, 100, true);
});

describe("com busca (spec 053)", () => {
  const lista = [{ id: "p0", nome: "Clock 9.5" }, { id: "p1", nome: "Gallery 9.5" }, { id: "p2", nome: "Galaxy Store 9.5" }];
  function abrirComBusca(onEscolher = vi.fn()) {
    function Pagina() { const location = useLocation(); return <><ProjetoSwitcher projetoId="p0" nome="Clock 9.5" projetos={lista} buscavel onEscolher={onEscolher} /><p>{location.pathname}</p></>; }
    function Contexto() { return <Outlet context={{ id: "kp", unidade_id: "u", perfil_codigo: "KP" }} />; }
    render(<QueryClientProvider client={new QueryClient()}><MemoryRouter initialEntries={["/resultados-gerais"]}><Routes><Route element={<Contexto />}><Route path="resultados-gerais" element={<Pagina />} /></Route></Routes></MemoryRouter></QueryClientProvider>);
    return onEscolher;
  }

  it("filtra pelo nome sem diferenciar maiúsculas e entrega o projeto escolhido sem navegar", async () => {
    const user = userEvent.setup();
    const onEscolher = abrirComBusca();
    await user.click(screen.getByRole("button", { name: "Clock 9.5" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search project" }), "gal");

    expect(screen.getAllByRole("menuitemradio").map((item) => item.textContent)).toEqual(["Gallery 9.5", "Galaxy Store 9.5"]);
    await user.click(screen.getByRole("menuitemradio", { name: "Galaxy Store 9.5" }));
    expect(onEscolher).toHaveBeenCalledWith("p2");
    expect(screen.getByText("/resultados-gerais")).toBeInTheDocument();
  });

  it("busca sem resultado mostra o aviso e não troca de projeto", async () => {
    const user = userEvent.setup();
    const onEscolher = abrirComBusca();
    await user.click(screen.getByRole("button", { name: "Clock 9.5" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search project" }), "inexistente");

    expect(await screen.findByText("No projects found")).toBeInTheDocument();
    expect(screen.queryByRole("menuitemradio")).not.toBeInTheDocument();
    expect(onEscolher).not.toHaveBeenCalled();
  });

  it("escolher o projeto já aberto não troca de projeto", async () => {
    const user = userEvent.setup();
    const onEscolher = abrirComBusca();
    await user.click(screen.getByRole("button", { name: "Clock 9.5" }));
    await user.click(await screen.findByRole("menuitemradio", { name: "Clock 9.5" }));
    expect(onEscolher).not.toHaveBeenCalled();
  });

  it("Escape limpa a busca e, com ela vazia, fecha o menu e devolve o foco ao título", async () => {
    const user = userEvent.setup();
    abrirComBusca();
    await user.click(screen.getByRole("button", { name: "Clock 9.5" }));
    await user.type(await screen.findByRole("searchbox", { name: "Search project" }), "gal");

    await user.keyboard("{Escape}");
    expect(screen.getByRole("searchbox", { name: "Search project" })).toHaveValue("");
    await user.keyboard("{Escape}");
    await waitFor(() => expect(screen.queryByRole("searchbox")).not.toBeInTheDocument());
    // O foco volta ao título quando o popover termina de fechar, o que pode levar um ciclo a mais.
    await waitFor(() => expect(screen.getByRole("button", { name: "Clock 9.5" })).toHaveFocus());
  });

  it("pelo teclado abre, busca, escolhe com Enter e devolve o foco ao título", async () => {
    const user = userEvent.setup();
    const onEscolher = abrirComBusca();
    await user.tab();
    await user.keyboard("{Enter}");
    await user.keyboard("gallery");
    await user.keyboard("{ArrowDown}{Enter}");

    expect(onEscolher).toHaveBeenCalledWith("p1");
    await waitFor(() => expect(screen.getByRole("button", { name: "Clock 9.5" })).toHaveFocus());
  });
});

describe("comoTitulo", () => {
  const dois = { items: [{ id: "p0", nome: "Clock" }, { id: "p1", nome: "Existente" }], page: 1, page_size: 100, total_count: 2 };

  it("por padrão o seletor é o título azul da página", async () => {
    vi.mocked(projetosApi.listar).mockResolvedValue(dois as never);
    abrir();

    expect(await screen.findByRole("heading", { level: 1, name: "Clock" })).toHaveClass("text-accent-text");
  });

  it("com azul falso, continua sendo o h1 da página, mas na cor do texto (spec 058)", async () => {
    vi.mocked(projetosApi.listar).mockResolvedValue(dois as never);
    abrir({ azul: false });

    // O menu só aparece depois que a lista de projetos chega.
    const botao = await screen.findByRole("button", { name: "Clock" });
    const titulo = screen.getByRole("heading", { level: 1, name: "Clock" });
    expect(titulo).toHaveClass("text-body");
    expect(titulo).not.toHaveClass("text-accent-text");
    expect(botao).toHaveClass("text-body");
  });

  it("com comoTitulo falso, continua trocando de projeto, mas sem o h1 e na cor do texto", async () => {
    const user = userEvent.setup();
    vi.mocked(projetosApi.listar).mockResolvedValue(dois as never);
    abrir({ comoTitulo: false });

    const botao = await screen.findByRole("button", { name: "Clock" });
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(botao).toHaveClass("text-body");
    await user.click(botao);
    await user.keyboard("{ArrowDown}");
    await user.click(await screen.findByRole("menuitemradio", { name: "Existente" }));
    expect(screen.getByText("/projetos/p1")).toBeInTheDocument();
  });

  it("com um projeto só e comoTitulo falso, mostra o nome sem h1 (falha da troca)", async () => {
    vi.mocked(projetosApi.listar).mockResolvedValue({ ...dois, items: [dois.items[0]], total_count: 1 } as never);
    abrir({ comoTitulo: false });

    await waitFor(() => expect(projetosApi.listar).toHaveBeenCalled());
    expect(await screen.findByText("Clock")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { level: 1 })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Clock" })).not.toBeInTheDocument();
  });
});
