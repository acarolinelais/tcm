import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { toast } from "@/shared/lib/toast";
import type { Usuario } from "../model/usuario";
import { UsuarioResponsavelDrawer } from "./UsuarioResponsavelDrawer";

const mutateAsync = vi.hoisted(() => vi.fn());
vi.mock("../hooks/useUsuarios", () => ({ useAtribuirResponsavel: () => ({ mutateAsync, isPending: false }) }));
vi.mock("@/shared/lib/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const usuario = (id: string, nome: string, extra: Partial<Usuario> = {}): Usuario => ({ id, nome, email: `${id}@example.com`, ativo: true, perfil_id: "default", created_at: "2026-01-01T00:00:00Z", ...extra });
const gerentes = [usuario("ivan", "Ivan Moreira"), usuario("bia", "Bia Costa"), usuario("rafa", "Rafael Lima", { ativo: false })];
const daniel = usuario("daniel", "Daniel Oliveira", { responsavel_id: "ivan" });

function renderDrawer() {
  const onFechar = vi.fn();
  render(<UsuarioResponsavelDrawer usuario={daniel} gerentes={gerentes} onFechar={onFechar} />);
  return { onFechar, painel: screen.getByRole("dialog") };
}

async function escolher(user: ReturnType<typeof userEvent.setup>, painel: HTMLElement, opcao: string) {
  await user.click(within(painel).getByRole("button", { name: /Assigned manager/ }));
  await user.click(await screen.findByRole("option", { name: opcao }));
}

describe("UsuarioResponsavelDrawer", () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it("abre no responsável atual e grava o gerente escolhido", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { onFechar, painel } = renderDrawer();

    expect(within(painel).getByRole("heading", { name: "Manager for Daniel Oliveira" })).toBeInTheDocument();
    expect(within(painel).getByRole("button", { name: /Assigned manager/ })).toHaveTextContent("Ivan Moreira");
    await user.click(within(painel).getByRole("button", { name: /Assigned manager/ }));
    expect(screen.queryByRole("option", { name: /Rafael Lima/ })).not.toBeInTheDocument();
    await user.click(await screen.findByRole("option", { name: "Bia Costa · bia@example.com" }));
    await user.click(within(painel).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: "daniel", responsavelId: "bia" }));
    expect(toast.success).toHaveBeenCalledWith("Manager updated.");
    expect(onFechar).toHaveBeenCalled();
  });

  it("\"Sem responsável\" remove o responsável", async () => {
    mutateAsync.mockResolvedValue(undefined);
    const user = userEvent.setup();
    const { painel } = renderDrawer();

    await escolher(user, painel, "Unassigned");
    await user.click(within(painel).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(mutateAsync).toHaveBeenCalledWith({ id: "daniel", responsavelId: null }));
  });

  it("falha: a API recusa, o erro aparece e o painel continua aberto", async () => {
    mutateAsync.mockRejectedValue(new Error("falhou"));
    const user = userEvent.setup();
    const { onFechar, painel } = renderDrawer();

    await escolher(user, painel, "Bia Costa · bia@example.com");
    await user.click(within(painel).getByRole("button", { name: "Save" }));

    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Could not update the assigned manager."));
    expect(onFechar).not.toHaveBeenCalled();
    expect(screen.getByRole("dialog")).toBeInTheDocument();
  });

  it("fecha com Esc sem salvar", async () => {
    const user = userEvent.setup();
    const { onFechar } = renderDrawer();

    await user.keyboard("{Escape}");

    expect(onFechar).toHaveBeenCalled();
    expect(mutateAsync).not.toHaveBeenCalled();
  });

  it("reabrir o mesmo usuário depois de cancelar volta ao responsável atual", async () => {
    const user = userEvent.setup();
    const onFechar = vi.fn();
    const { rerender } = render(<UsuarioResponsavelDrawer usuario={daniel} gerentes={gerentes} onFechar={onFechar} />);

    await escolher(user, screen.getByRole("dialog"), "Bia Costa · bia@example.com");
    rerender(<UsuarioResponsavelDrawer usuario={null} gerentes={gerentes} onFechar={onFechar} />);
    await waitFor(() => expect(screen.queryByRole("dialog")).not.toBeInTheDocument());
    rerender(<UsuarioResponsavelDrawer usuario={daniel} gerentes={gerentes} onFechar={onFechar} />);

    expect(within(await screen.findByRole("dialog")).getByRole("button", { name: /Assigned manager/ })).toHaveTextContent("Ivan Moreira");
  });

  it("mostra o responsável atual inativo marcado e indisponível", async () => {
    const user = userEvent.setup();
    render(<UsuarioResponsavelDrawer usuario={{ ...daniel, responsavel_id: "rafa" }} gerentes={gerentes} onFechar={vi.fn()} />);
    const painel = screen.getByRole("dialog");

    expect(within(painel).getByRole("button", { name: /Assigned manager/ })).toHaveTextContent("Rafael Lima");
    await user.click(within(painel).getByRole("button", { name: /Assigned manager/ }));
    expect(await screen.findByRole("option", { name: "Rafael Lima · rafa@example.com" })).toHaveAttribute("aria-disabled", "true");
  });
});
