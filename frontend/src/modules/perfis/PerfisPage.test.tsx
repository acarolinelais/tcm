import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider } from "react-router";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PerfisPage } from "./PerfisPage";
import type { Perfil, Permissao } from "./api/perfis.api";
import { ApiError } from "@/shared/api/problem-details";

const api = vi.hoisted(() => ({
  listarPerfis: vi.fn(),
  listarPermissoes: vi.fn(),
  criarPerfil: vi.fn(),
  salvarPermissoes: vi.fn(),
}));

vi.mock("./api/perfis.api", () => api);
vi.mock("@/core/auth/usePerfilAtual", () => ({
  usePerfilAtual: () => ({ data: { perfil_codigo: "ADMIN_UNIDADE", permissoes: ["perfis.gerenciar"] } }),
}));

const perfis: Perfil[] = [
  { id: "p1", nome: "Operação", descricao: null, codigo: null, permissoes: ["usuarios.consultar"] },
  { id: "p2", nome: "Leitura", descricao: null, codigo: null, permissoes: [] },
];
const permissoes: Permissao[] = [
  { id: "usuarios.consultar", descricao: "Consultar usuários", modulo: { codigo: "usuarios", nome: "Usuários", ordem: 1 }, ordem: 1 },
  { id: "usuarios.gerenciar", descricao: "Gerenciar usuários", modulo: { codigo: "usuarios", nome: "Usuários", ordem: 1 }, ordem: 2 },
  { id: "futuro.executar", descricao: "Executar tarefa", modulo: { codigo: "futuro", nome: "Tarefas futuras", ordem: 5 }, ordem: 1 },
];

function renderPage() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const router = createMemoryRouter([{ path: "/perfis", element: <PerfisPage /> }], { initialEntries: ["/perfis"] });
  render(<QueryClientProvider client={client}><RouterProvider router={router} /></QueryClientProvider>);
}

async function abrirGrupo(user: ReturnType<typeof userEvent.setup>, nome: string) {
  await user.click(screen.getByRole("button", { name: new RegExp(nome) }));
}

async function abrirPerfil(user: ReturnType<typeof userEvent.setup>, nome: string, acao = "View permissions") {
  await user.click(screen.getByRole("button", { name: `Actions for ${nome}` }));
  await user.click(screen.getByRole("menuitem", { name: acao }));
}

describe("PerfisPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.listarPerfis.mockResolvedValue(perfis);
    api.listarPermissoes.mockResolvedValue(permissoes);
    api.salvarPermissoes.mockImplementation(async (id: string, codes: string[]) => ({
      ...perfis.find((perfil) => perfil.id === id)!, permissoes: codes,
    }));
  });

  it("agrupa permissões usando os metadados recebidos, inclusive módulos desconhecidos", async () => {
    renderPage();

    expect(await screen.findByRole("table")).toBeInTheDocument();
    const user = userEvent.setup();
    await abrirPerfil(user, "Operação");
    expect(await screen.findByRole("region", { name: "Permissions for Users" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Permissions for Tarefas futuras" })).toBeInTheDocument();
    expect(screen.queryByLabelText("View users in the allowed scope")).not.toBeVisible();
    expect(screen.getByText(/1 of 2 selected/)).toBeInTheDocument();
    expect(screen.queryByText("usuarios.consultar")).not.toBeInTheDocument();
    await abrirGrupo(user, "Users");
    expect(screen.getByLabelText("View users in the allowed scope")).toBeChecked();
    expect(screen.getByLabelText("Create and edit users")).not.toBeChecked();
  });

  it("permite selecionar todas e comunica estado parcial do grupo", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Edit permissions");
    const grupo = await screen.findByRole("region", { name: "Permissions for Users" });
    const selecionarModulo = within(grupo).getByLabelText(/Select all permissions for Users/);

    expect(selecionarModulo).toHaveAttribute("aria-checked", "mixed");
    await user.click(selecionarModulo);
    expect(screen.getByLabelText("Create and edit users")).toBeChecked();
    expect(selecionarModulo).toBeChecked();
  });

  it("pede decisão antes de sair da edição e preserva o rascunho ao permanecer", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Edit permissions");
    await abrirGrupo(user, "Users");
    await user.click(screen.getByLabelText("View users in the allowed scope"));
    await user.click(screen.getByRole("button", { name: "← Profiles and permissions" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Unsaved changes")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Stay" }));
    expect(screen.getByLabelText("View users in the allowed scope")).not.toBeChecked();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
    expect(api.salvarPermissoes).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "← Profiles and permissions" }));
    await user.click(screen.getByRole("button", { name: "Discard and continue" }));
    await abrirPerfil(user, "Leitura", "Edit permissions");
  });

  it("envia o conjunto completo e mantém o rascunho quando a gravação falha", async () => {
    api.salvarPermissoes.mockRejectedValue(new Error("Falha de rede"));
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Edit permissions");
    await abrirGrupo(user, "Users");
    await user.click(screen.getByLabelText("Create and edit users"));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByText(/draft has been preserved/i)).toBeInTheDocument();
    expect(api.salvarPermissoes).toHaveBeenCalledWith("p1", ["usuarios.consultar", "usuarios.gerenciar"]);
    expect(screen.getByLabelText("Create and edit users")).toBeChecked();
    expect(screen.getByText("Unsaved changes")).toBeInTheDocument();
  });

  it.each([
    ["ADMIN_UNIDADE", "Administrador"],
    ["USUARIO_PADRAO", "Developer"],
    ["GERENTE", "Gerente"],
    ["KP", "Ponto focal"],
  ])("permite que o administrador edite permissões do perfil de sistema %s", async (codigo, nome) => {
    api.listarPerfis.mockResolvedValue([
      { id: "sys", nome, descricao: null, codigo, permissoes: ["usuarios.consultar"] },
    ]);
    renderPage();

    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, nome, "Edit permissions");
    expect(await screen.findByText("System profile")).toBeInTheDocument();
    await abrirGrupo(user, "Users");
    const permissao = screen.getByLabelText("View users in the allowed scope");
    expect(permissao).toBeChecked();
    await user.click(permissao);
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(api.salvarPermissoes).toHaveBeenCalledWith("sys", []);
  });

  it("mantém os campos quando o backend informa conflito ao criar perfil", async () => {
    api.criarPerfil.mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito", status: 409 }));
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "New profile" }));
    await user.type(screen.getByLabelText(/Profile name/), "Operação");
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(await screen.findByText("A profile with this name already exists. Choose another name.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Profile name/)).toHaveValue("Operação");
  });

  it("seleciona o perfil recém-criado para configurar permissões", async () => {
    const novo: Perfil = { id: "p3", nome: "Auditoria", descricao: "Consulta", codigo: null, permissoes: ["usuarios.gerenciar"] };
    api.listarPerfis.mockResolvedValueOnce(perfis).mockResolvedValue([...perfis, novo]);
    api.criarPerfil.mockResolvedValue(novo);
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "New profile" }));
    await user.type(screen.getByLabelText(/Profile name/), "Auditoria");
    await user.type(screen.getByLabelText(/Description/), "Consulta");
    await abrirGrupo(user, "Users");
    await user.click(screen.getByLabelText("Create and edit users"));
    await user.click(screen.getByRole("button", { name: "Create profile" }));

    expect(api.criarPerfil).toHaveBeenCalledWith("Auditoria", "Consulta", ["usuarios.gerenciar"]);
    expect(await screen.findByRole("heading", { name: "Auditoria" })).toBeInTheDocument();
    expect(screen.getByLabelText("Create and edit users")).toBeChecked();
    expect(screen.getByRole("heading", { name: "Auditoria" })).toBeInTheDocument();
  });
});
