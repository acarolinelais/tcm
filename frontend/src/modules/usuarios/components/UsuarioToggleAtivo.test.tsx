import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { useAtivarUsuario, useInativarUsuario } from "../hooks/useUsuarios";
import type { Usuario } from "../model/usuario";
import { UsuarioToggleAtivo } from "./UsuarioToggleAtivo";

vi.mock("../hooks/useUsuarios", () => ({ useAtivarUsuario: vi.fn(), useInativarUsuario: vi.fn() }));

const ativar = { mutate: vi.fn(), isPending: false };
const inativar = { mutate: vi.fn(), isPending: false };
const usuario = { id: "u1", nome: "Ana Souza", ativo: true } as Usuario;

describe("UsuarioToggleAtivo (spec 050: botão e confirmação no HeroUI)", () => {
  beforeEach(async () => {
    await i18n.changeLanguage("en");
    vi.mocked(useAtivarUsuario).mockReturnValue(ativar as never);
    vi.mocked(useInativarUsuario).mockReturnValue(inativar as never);
  });
  afterEach(() => vi.clearAllMocks());

  it("inativar pede confirmação com o nome e só inativa ao confirmar", async () => {
    const user = userEvent.setup();
    render(<UsuarioToggleAtivo usuario={usuario} />);

    await user.click(screen.getByRole("button", { name: "Deactivate" }));
    const confirmacao = screen.getByRole("alertdialog");
    expect(confirmacao).toHaveAccessibleDescription("Are you sure you want to deactivate Ana Souza?");
    await user.click(within(confirmacao).getByRole("button", { name: "Deactivate user" }));

    expect(inativar.mutate).toHaveBeenCalledWith("u1");
    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
  });

  it("Esc fecha a confirmação sem inativar e devolve o foco ao botão (falha)", async () => {
    const user = userEvent.setup();
    render(<UsuarioToggleAtivo usuario={usuario} />);
    const botao = screen.getByRole("button", { name: "Deactivate" });

    await user.click(botao);
    await user.keyboard("{Escape}");

    await waitFor(() => expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument());
    await waitFor(() => expect(botao).toHaveFocus());
    expect(inativar.mutate).not.toHaveBeenCalled();
  });

  it("ativar um usuário inativo não pede confirmação", async () => {
    const user = userEvent.setup();
    render(<UsuarioToggleAtivo usuario={{ ...usuario, ativo: false }} />);

    await user.click(screen.getByRole("button", { name: "Activate" }));

    expect(ativar.mutate).toHaveBeenCalledWith("u1");
    expect(screen.queryByRole("alertdialog")).not.toBeInTheDocument();
  });
});
