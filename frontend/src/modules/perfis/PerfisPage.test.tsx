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

async function abrirPerfil(user: ReturnType<typeof userEvent.setup>, nome: string, acao = "Visualizar permissões") {
  await user.click(screen.getByRole("button", { name: `Ações para ${nome}` }));
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
    expect(await screen.findByRole("region", { name: "Permissões de Usuários" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "Permissões de Tarefas futuras" })).toBeInTheDocument();
    expect(screen.queryByLabelText("Consultar usuários")).not.toBeVisible();
    expect(screen.getByText(/1 de 2 selecionadas/)).toBeInTheDocument();
    expect(screen.queryByText("usuarios.consultar")).not.toBeInTheDocument();
    await abrirGrupo(user, "Usuários");
    expect(screen.getByLabelText("Consultar usuários")).toBeChecked();
    expect(screen.getByLabelText("Gerenciar usuários")).not.toBeChecked();
  });

  it("permite selecionar todas e comunica estado parcial do grupo", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Editar permissões");
    const grupo = await screen.findByRole("region", { name: "Permissões de Usuários" });
    const selecionarModulo = within(grupo).getByLabelText(/Selecionar todas as permissões de Usuários/);

    expect(selecionarModulo).toHaveAttribute("aria-checked", "mixed");
    await user.click(selecionarModulo);
    expect(screen.getByLabelText("Gerenciar usuários")).toBeChecked();
    expect(selecionarModulo).toBeChecked();
  });

  it("pede decisão antes de sair da edição e preserva o rascunho ao permanecer", async () => {
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Editar permissões");
    await abrirGrupo(user, "Usuários");
    await user.click(screen.getByLabelText("Consultar usuários"));
    await user.click(screen.getByRole("button", { name: "← Perfis" }));

    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText("Alterações não salvas")).toBeInTheDocument();
    await user.click(within(dialog).getByRole("button", { name: "Permanecer" }));
    expect(screen.getByLabelText("Consultar usuários")).not.toBeChecked();
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();
    expect(api.salvarPermissoes).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "← Perfis" }));
    await user.click(screen.getByRole("button", { name: "Descartar e continuar" }));
    await abrirPerfil(user, "Leitura", "Editar permissões");
  });

  it("envia o conjunto completo e mantém o rascunho quando a gravação falha", async () => {
    api.salvarPermissoes.mockRejectedValue(new Error("Falha de rede"));
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Operação", "Editar permissões");
    await abrirGrupo(user, "Usuários");
    await user.click(screen.getByLabelText("Gerenciar usuários"));
    await user.click(screen.getByRole("button", { name: "Salvar alterações" }));

    expect(await screen.findByText(/rascunho foi preservado/i)).toBeInTheDocument();
    expect(api.salvarPermissoes).toHaveBeenCalledWith("p1", ["usuarios.consultar", "usuarios.gerenciar"]);
    expect(screen.getByLabelText("Gerenciar usuários")).toBeChecked();
    expect(screen.getByText("Alterações não salvas")).toBeInTheDocument();
  });

  it("exibe permissões do perfil de sistema sem permitir edição", async () => {
    api.listarPerfis.mockResolvedValue([
      { id: "sys", nome: "Administrador", descricao: null, codigo: "ADMIN_UNIDADE", permissoes: ["usuarios.consultar"] },
    ]);
    renderPage();

    const user = userEvent.setup();
    await screen.findByRole("table");
    await abrirPerfil(user, "Administrador");
    expect(await screen.findByText("Protegido pelo sistema")).toBeInTheDocument();
    await abrirGrupo(user, "Usuários");
    expect(screen.getByLabelText("Consultar usuários")).toBeDisabled();
    expect(screen.getByRole("button", { name: "Salvar alterações" })).toBeDisabled();
  });

  it("mantém os campos quando o backend informa conflito ao criar perfil", async () => {
    api.criarPerfil.mockRejectedValue(new ApiError({ type: "about:blank", title: "Conflito", status: 409 }));
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Novo perfil" }));
    await user.type(screen.getByLabelText(/Nome do perfil/), "Operação");
    await user.click(screen.getByRole("button", { name: "Criar perfil" }));

    expect(await screen.findByText("Já existe um perfil com esse nome. Escolha outro nome.")).toBeInTheDocument();
    expect(screen.getByLabelText(/Nome do perfil/)).toHaveValue("Operação");
  });

  it("seleciona o perfil recém-criado para configurar permissões", async () => {
    const novo: Perfil = { id: "p3", nome: "Auditoria", descricao: "Consulta", codigo: null, permissoes: ["usuarios.gerenciar"] };
    api.listarPerfis.mockResolvedValueOnce(perfis).mockResolvedValue([...perfis, novo]);
    api.criarPerfil.mockResolvedValue(novo);
    renderPage();
    const user = userEvent.setup();
    await screen.findByRole("table");
    await user.click(screen.getByRole("button", { name: "Novo perfil" }));
    await user.type(screen.getByLabelText(/Nome do perfil/), "Auditoria");
    await user.type(screen.getByLabelText(/Descrição/), "Consulta");
    await abrirGrupo(user, "Usuários");
    await user.click(screen.getByLabelText("Gerenciar usuários"));
    await user.click(screen.getByRole("button", { name: "Criar perfil" }));

    expect(api.criarPerfil).toHaveBeenCalledWith("Auditoria", "Consulta", ["usuarios.gerenciar"]);
    expect(await screen.findByRole("heading", { name: "Auditoria" })).toBeInTheDocument();
    expect(screen.getByLabelText("Gerenciar usuários")).toBeChecked();
    expect(screen.getByRole("heading", { name: "Auditoria" })).toBeInTheDocument();
  });
});
