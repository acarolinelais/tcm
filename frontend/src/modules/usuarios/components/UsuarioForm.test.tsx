import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { Dialog } from "@/shared/ui/dialog";
import { UsuarioForm } from "./UsuarioForm";

const perfilApi = vi.hoisted(() => ({ listarPerfis: vi.fn(), atribuirPerfil: vi.fn() }));
vi.mock("@/modules/perfis/api/perfis.api", () => perfilApi);

const profiles = [
  { id: "default", nome: "Developer", descricao: null, codigo: "USUARIO_PADRAO", permissoes: [] },
  { id: "kp", nome: "Ponto focal", descricao: null, codigo: "KP", permissoes: [] },
  { id: "manager", nome: "Gerente", descricao: null, codigo: "GERENTE", permissoes: [] },
  { id: "custom", nome: "Auditoria", descricao: null, codigo: null, permissoes: [] },
];

function renderForm(onSalvo = vi.fn(), props: Partial<React.ComponentProps<typeof UsuarioForm>> = {}) {
  const client = new QueryClient();
  // Na tela o formulário fica dentro de um Dialog (o botão Cancelar usa DrawerClose).
  const { container } = render(
    <QueryClientProvider client={client}>
      <Dialog open>
        <UsuarioForm onSalvo={onSalvo} {...props} />
      </Dialog>
    </QueryClientProvider>,
  );
  return { onSalvo, container };
}

describe("UsuarioForm", () => {
  beforeEach(() => {
    perfilApi.listarPerfis.mockResolvedValue(profiles);
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              id: "1",
              nome: "Ana",
              email: "ana@example.com",
              ativo: true,
              created_at: "2026-01-01T00:00:00Z",
            }),
            { status: 201 },
          ),
      ),
    );
  });

  it("sucesso: envia dados válidos e chama onSalvo", async () => {
    const { onSalvo } = renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("User ID"), "USR-001");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({
      user_id: "USR-001",
    });
  });

  it("edição carrega e envia o identificador existente", async () => {
    renderForm(vi.fn(), {
      usuario: {
        id: "user-1",
        nome: "Ana",
        email: "ana@example.com",
        user_id: "USR-001",
        ativo: true,
        perfil_id: "default",
        created_at: "2026-01-01T00:00:00Z",
      },
    });
    const user = userEvent.setup();

    expect(screen.getByLabelText("User ID")).toHaveValue("USR-001");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string)).toMatchObject({
      user_id: "USR-001",
    });
  });

  it("falha: campos vazios mostram erros e não chamam a API", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha: identifica User ID acima do limite antes de chamar a API", async () => {
    renderForm();
    const user = userEvent.setup();

    await user.type(screen.getByLabelText("Name"), "Ana");
    await user.type(screen.getByLabelText("Email"), "ana@example.com");
    await user.type(screen.getByLabelText("User ID"), "x".repeat(151));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("User ID must be at most 150 characters.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("admin pode atribuir KP e perfis personalizados ao criar usuário", async () => {
    const { container } = renderForm(vi.fn(), { podeAtribuirPerfil: true });
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Profile" })).not.toBeDisabled());
    const options = [...container.querySelectorAll("select option")].map((option) => option.textContent);
    expect(options).toContain("Key Person");
    expect(options).toContain("Auditoria");
  });

  it("gerente pode escolher KP e usuário padrão, mas não perfis administrativos", async () => {
    const { container } = renderForm(vi.fn(), { podeAtribuirPerfilKP: true });
    await waitFor(() => expect(screen.getByRole("combobox", { name: "Profile" })).not.toBeDisabled());
    const options = [...container.querySelectorAll("select option")].map((option) => option.textContent);
    expect(options).toContain("Key Person");
    expect(options).toContain("Developer");
    expect(options).not.toContain("Gerente");
    expect(options).not.toContain("Auditoria");
  });

  it("gerente vê o perfil atual de um usuário sem poder atribuí-lo", async () => {
    perfilApi.listarPerfis.mockResolvedValueOnce(profiles.slice(0, 2));
    const { container } = renderForm(vi.fn(), {
      podeGerenciar: false,
      podeAtribuirPerfilKP: true,
      usuario: {
        id: "user-1",
        nome: "Ana",
        email: "ana@example.com",
        ativo: true,
        perfil_id: "custom",
        perfil_nome: "Auditoria",
        perfil_codigo: null,
        created_at: "2026-01-01T00:00:00Z",
      },
    });

    await waitFor(() => {
      expect(screen.getByRole("combobox", { name: "Profile" })).toHaveTextContent("Auditoria");
    });
    const optionAtual = [...container.querySelectorAll("select option")].find(
      (option) => option.textContent === "Auditoria",
    );
    expect(optionAtual).toBeDisabled();
  });
});
