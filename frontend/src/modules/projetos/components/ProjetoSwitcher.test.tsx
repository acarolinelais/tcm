import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Outlet, Route, Routes, useLocation } from "react-router";
import { beforeEach, expect, it, vi } from "vitest";
import { projetosApi } from "../api/projetos.api";
import { ProjetoSwitcher } from "./ProjetoSwitcher";

vi.mock("../api/projetos.api", () => ({ projetosApi: { listar: vi.fn() } }));
function abrir() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  function Contexto() { return <Outlet context={{ id: "dev", unidade_id: "u", perfil_codigo: "USUARIO_PADRAO" }} />; }
  function Pagina() { const location = useLocation(); return <><ProjetoSwitcher projetoId="p0" nome="Clock" /><p>{location.pathname}</p></>; }
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
