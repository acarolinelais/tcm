import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Usuario } from "../model/usuario";
import { UsuarioDrawer } from "./UsuarioDrawer";

const perfilApi = vi.hoisted(() => ({ listarPerfis: vi.fn(), atribuirPerfil: vi.fn() }));
vi.mock("@/modules/perfis/api/perfis.api", () => perfilApi);

const profiles = [
  { id: "default", nome: "Developer", descricao: null, codigo: "USUARIO_PADRAO", permissoes: [] },
  { id: "kp", nome: "Ponto focal", descricao: null, codigo: "KP", permissoes: [] },
  { id: "manager", nome: "Gerente", descricao: null, codigo: "GERENTE", permissoes: [] },
  { id: "custom", nome: "Auditoria", descricao: null, codigo: null, permissoes: [] },
];
const ana: Usuario = { id: "user-1", nome: "Ana", email: "ana@example.com", user_id: "USR-001", ativo: true, perfil_id: "default", created_at: "2026-01-01T00:00:00Z" };

function renderDrawer(props: Partial<React.ComponentProps<typeof UsuarioDrawer>> = {}) {
  const onSalvo = vi.fn();
  const onFechar = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <UsuarioDrawer isOpen onSalvo={onSalvo} onFechar={onFechar} {...props} />
    </QueryClientProvider>,
  );
  return { onSalvo, onFechar, painel: screen.getByRole("dialog") };
}

const corpoEnviado = () => JSON.parse(vi.mocked(fetch).mock.calls[0][1]?.body as string);
const responder = (status: number, corpo: object) => vi.mocked(fetch).mockResolvedValueOnce(new Response(JSON.stringify(corpo), { status, headers: { "Content-Type": "application/json" } }));

async function opcoesDoPerfil(user: ReturnType<typeof userEvent.setup>) {
  const perfil = await screen.findByRole("button", { name: /Profile/ });
  await waitFor(() => expect(perfil).not.toBeDisabled());
  await user.click(perfil);
  return (await screen.findAllByRole("option")).map((opcao) => opcao.textContent);
}

describe("UsuarioDrawer", () => {
  beforeEach(() => {
    perfilApi.listarPerfis.mockResolvedValue(profiles);
    vi.stubGlobal("fetch", vi.fn(async () => new Response(JSON.stringify({ ...ana, id: "1" }), { status: 201 })));
  });

  it("sucesso: cria com dados válidos e chama onSalvo", async () => {
    const { onSalvo, painel } = renderDrawer();
    const user = userEvent.setup();

    expect(within(painel).getByRole("heading", { name: "New user" })).toBeInTheDocument();
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ana");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ana@example.com");
    await user.type(screen.getByRole("textbox", { name: "User ID" }), "USR-001");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(onSalvo).toHaveBeenCalled());
    expect(corpoEnviado()).toMatchObject({ user_id: "USR-001" });
  });

  it("edição carrega e envia o identificador existente", async () => {
    const { painel } = renderDrawer({ usuario: ana });
    const user = userEvent.setup();

    expect(within(painel).getByRole("heading", { name: "Edit user" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "User ID" })).toHaveValue("USR-001");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(corpoEnviado()).toMatchObject({ user_id: "USR-001" });
  });

  it("falha: campos vazios mostram erros e não chamam a API", async () => {
    renderDrawer();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Name is required.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha: e-mail inválido e User ID acima do limite aparecem no campo, antes da API", async () => {
    renderDrawer();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ana");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ana@");
    await user.type(screen.getByRole("textbox", { name: "User ID" }), "x".repeat(151));
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("Enter a valid email address.")).toBeInTheDocument();
    expect(screen.getByText("User ID must be at most 150 characters.")).toBeInTheDocument();
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha: User ID repetido (409) vira mensagem no campo e o painel continua aberto", async () => {
    responder(409, { type: "about:blank", title: "Conflito.", status: 409, errors: [{ campo: "user_id", mensagem: "duplicado" }] });
    const { onSalvo } = renderDrawer();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ana");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ana@example.com");
    await user.type(screen.getByRole("textbox", { name: "User ID" }), "USR-001");
    await user.click(screen.getByRole("button", { name: "Save" }));

    expect(await screen.findByText("This User ID is already in use in this unit.")).toBeInTheDocument();
    expect(onSalvo).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("admin cria com \"Developer\" por padrão e pode escolher KP e perfis personalizados", async () => {
    renderDrawer({ podeAtribuirPerfil: true });
    const user = userEvent.setup();

    expect(await screen.findByRole("button", { name: /Profile/ })).toHaveTextContent("Developer");
    const opcoes = await opcoesDoPerfil(user);
    expect(opcoes).toEqual(expect.arrayContaining(["Developer", "Key Person", "Auditoria"]));
    await user.click(screen.getByRole("option", { name: "Key Person" }));
    await user.type(screen.getByRole("textbox", { name: "Name" }), "Ana");
    await user.type(screen.getByRole("textbox", { name: "Email" }), "ana@example.com");
    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(fetch).toHaveBeenCalled());
    expect(corpoEnviado()).toMatchObject({ perfil_id: "kp" });
  });

  it("gerente pode escolher KP e usuário padrão, mas não perfis administrativos", async () => {
    renderDrawer({ podeAtribuirPerfilKP: true });
    const user = userEvent.setup();

    const opcoes = await opcoesDoPerfil(user);
    expect(opcoes).toEqual(expect.arrayContaining(["Developer", "Key Person"]));
    expect(opcoes).not.toContain("Gerente");
    expect(opcoes).not.toContain("Auditoria");
  });

  it("gerente vê o perfil atual de um usuário marcado, mas indisponível", async () => {
    perfilApi.listarPerfis.mockResolvedValueOnce(profiles.slice(0, 2));
    renderDrawer({ podeGerenciar: false, podeAtribuirPerfilKP: true, usuario: { ...ana, perfil_id: "custom", perfil_nome: "Auditoria", perfil_codigo: null } });
    const user = userEvent.setup();

    await waitFor(() => expect(screen.getByRole("button", { name: /Profile/ })).toHaveTextContent("Auditoria"));
    await opcoesDoPerfil(user);
    expect(screen.getByRole("option", { name: "Auditoria" })).toHaveAttribute("aria-disabled", "true");
  });

  it("fecha com Esc e com Cancelar sem salvar", async () => {
    const { onFechar } = renderDrawer();
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Rascunho");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(onFechar).toHaveBeenCalledTimes(2);
    expect(fetch).not.toHaveBeenCalled();
  });

  it("falha: ao enviar vazio, o foco vai para o primeiro campo com erro", async () => {
    renderDrawer();
    const user = userEvent.setup();

    await user.click(screen.getByRole("button", { name: "Save" }));

    await waitFor(() => expect(screen.getByRole("textbox", { name: "Name" })).toHaveFocus());
  });

  it("reabrir depois de fechar começa vazio e sem erros; o X também fecha", async () => {
    const client = new QueryClient();
    const onFechar = vi.fn();
    const ui = (isOpen: boolean) => <QueryClientProvider client={client}><UsuarioDrawer isOpen={isOpen} onSalvo={vi.fn()} onFechar={onFechar} /></QueryClientProvider>;
    const { rerender } = render(ui(true));
    const user = userEvent.setup();

    await user.type(screen.getByRole("textbox", { name: "Name" }), "Rascunho");
    await user.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByText("Email is required.")).toBeInTheDocument();
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /close/i }));
    expect(onFechar).toHaveBeenCalled();
    rerender(ui(false));
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerender(ui(true));

    expect(await screen.findByRole("textbox", { name: "Name" })).toHaveValue("");
    expect(screen.queryByText("Email is required.")).not.toBeInTheDocument();
  });
});
