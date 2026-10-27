import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { UsuariosTable } from "./UsuariosTable";

const apiMocks = vi.hoisted(() => ({ useUsuariosList: vi.fn(), listarPerfis: vi.fn(), ativar: vi.fn(), inativar: vi.fn() }));
vi.mock("../hooks/useUsuarios", () => ({
  useUsuariosList: apiMocks.useUsuariosList,
  useAtivarUsuario: () => ({ mutate: apiMocks.ativar, isPending: false }),
  useInativarUsuario: () => ({ mutate: apiMocks.inativar, isPending: false }),
  useAtribuirResponsavel: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));
vi.mock("@/modules/perfis/api/perfis.api", () => ({ listarPerfis: apiMocks.listarPerfis }));

function renderTable(props: Partial<React.ComponentProps<typeof UsuariosTable>> = {}) {
  const client = new QueryClient();
  const onPageChange = vi.fn();
  const onFiltroChange = vi.fn();
  render(
    <QueryClientProvider client={client}>
      <UsuariosTable
        page={1}
        pageSize={20}
        pageSizeOptions={[10, 20]}
        filtros={{}}
        onFiltroChange={onFiltroChange}
        onPageChange={onPageChange}
        onPageSizeChange={vi.fn()}
        onEditar={vi.fn()}
        onNovoUsuario={vi.fn()}
        onLimparFiltros={vi.fn()}
        {...props}
      />
    </QueryClientProvider>,
  );
  return { onPageChange, onFiltroChange };
}

describe("UsuariosTable", () => {
  beforeEach(() => {
    apiMocks.useUsuariosList.mockReturnValue({
      data: {
        items: Array.from({ length: 20 }, (_, i) => ({
          id: String(i),
          nome: `Usuário ${i}`,
          email: `u${i}@example.com`,
          ativo: true,
          perfil_id: "custom",
          created_at: "2026-01-01T00:00:00Z",
        })),
        page: 1,
        page_size: 20,
        total_count: 40,
      },
      isLoading: false,
    });
    apiMocks.listarPerfis.mockResolvedValue([
      { id: "standard", codigo: "USUARIO_PADRAO", nome: "Developer", descricao: null, permissoes: [] },
      { id: "kp", codigo: "KP", nome: "Pessoa-chave", descricao: null, permissoes: [] },
    ]);
  });

  it("clicking Next calls onPageChange with the next page", async () => {
    const { onPageChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: /next page/i }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("selecionar o status no cabeçalho aplica o filtro correspondente", async () => {
    const { onFiltroChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: "Filter by Status" }));
    await user.click(await screen.findByRole("option", { name: "Inactive" }));

    expect(onFiltroChange).toHaveBeenCalledWith("ativo", "false");
  });

  it("aplicar texto no cabeçalho envia o termo sem espaços excedentes", async () => {
    const { onFiltroChange } = renderTable();
    const user = userEvent.setup();

    await screen.findByText("Usuário 0");
    await user.click(screen.getByRole("button", { name: "Filter by User" }));
    await user.type(screen.getByPlaceholderText("Search by name"), "  Ana Silva  ");
    await user.click(screen.getByRole("button", { name: "Apply" }));

    expect(onFiltroChange).toHaveBeenCalledWith("nome", "Ana Silva");
  });

  it("exibe o perfil atribuído mesmo quando gerente não recebe o catálogo completo", async () => {
    apiMocks.useUsuariosList.mockReturnValue({
      data: {
        items: [{
          id: "user-1",
          nome: "Ana",
          email: "ana@example.com",
          ativo: true,
          perfil_id: "custom",
          perfil_nome: "Auditoria",
          perfil_codigo: null,
          created_at: "2026-01-01T00:00:00Z",
        }],
        page: 1,
        page_size: 20,
        total_count: 1,
      },
      isLoading: false,
    });
    renderTable({ podeAtribuirPerfilKP: true, podeConsultarPerfil: true });

    expect(await screen.findByRole("row", { name: /Ana/ })).toHaveTextContent(/Ana.*ana@example.com.*Active.*Auditoria/);
  });

  it("não exibe o perfil atribuído sem a permissão de consulta", async () => {
    apiMocks.useUsuariosList.mockReturnValue({
      data: {
        items: [{
          id: "user-1",
          nome: "Ana",
          email: "ana@example.com",
          ativo: true,
          perfil_id: "custom",
          perfil_nome: "Auditoria",
          perfil_codigo: null,
          created_at: "2026-01-01T00:00:00Z",
        }],
        page: 1,
        page_size: 20,
        total_count: 1,
      },
      isLoading: false,
    });
    renderTable({ podeAtribuirPerfilKP: true });

    expect(await screen.findByText("Ana")).toBeInTheDocument();
    expect(screen.queryByText("Auditoria")).not.toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Profile" })).not.toBeInTheDocument();
  });

  it("mostra as ações como botões da linha e pede confirmação antes de inativar", async () => {
    const user = userEvent.setup();
    renderTable({ podeGerenciar: true, podeAtribuirPerfil: true });

    await screen.findByText("Usuário 0");
    expect(screen.getByRole("button", { name: "Edit Usuário 0" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Change responsible manager Usuário 0" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Deactivate Usuário 0" }));
    expect(apiMocks.inativar).not.toHaveBeenCalled();
    await user.click(within(screen.getByRole("alertdialog")).getByRole("button", { name: /Deactivate/ }));

    expect(apiMocks.inativar).toHaveBeenCalledWith("0", expect.anything());
  });

  it("mostra o estado de erro quando a listagem falha", async () => {
    apiMocks.useUsuariosList.mockReturnValue({ data: undefined, isLoading: false, isError: true });
    renderTable();

    expect(await screen.findByRole("alert")).toHaveTextContent("Could not load users. Try again.");
  });
});
