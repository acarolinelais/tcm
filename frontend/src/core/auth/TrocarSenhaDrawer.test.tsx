import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import i18n from "@/core/i18n";
import { ApiError } from "@/shared/api/problem-details";
import { alterarPropriaSenha } from "./api";
import { TrocarSenhaDrawer } from "./TrocarSenhaDrawer";

vi.mock("./api", () => ({ alterarPropriaSenha: vi.fn() }));

async function preencher(atual: string, nova: string, confirmacao: string) {
  const user = userEvent.setup();
  await user.type(screen.getByLabelText(/Current password/), atual);
  await user.type(screen.getByLabelText(/^New password/), nova);
  await user.type(screen.getByLabelText(/Confirm new password/), confirmacao);
  await user.click(screen.getByRole("button", { name: "Save password" }));
}

describe("TrocarSenhaDrawer", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    await i18n.changeLanguage("en");
  });

  it("envia a senha atual e a nova e fecha o painel", async () => {
    vi.mocked(alterarPropriaSenha).mockResolvedValue(undefined);
    const onFechar = vi.fn();
    render(<TrocarSenhaDrawer isOpen onFechar={onFechar} />);

    await preencher("admin@123", "nova-senha", "nova-senha");

    await waitFor(() => expect(onFechar).toHaveBeenCalled());
    expect(alterarPropriaSenha).toHaveBeenCalledWith("admin@123", "nova-senha");
  });

  it("não envia quando a confirmação é diferente da nova senha", async () => {
    render(<TrocarSenhaDrawer isOpen onFechar={vi.fn()} />);

    await preencher("admin@123", "nova-senha", "outra");

    expect(await screen.findByText("Enter the same password in both fields.")).toBeInTheDocument();
    expect(alterarPropriaSenha).not.toHaveBeenCalled();
  });

  it("mostra o erro no campo quando a senha atual está incorreta", async () => {
    vi.mocked(alterarPropriaSenha).mockRejectedValue(new ApiError({ type: "about:blank", title: "Dados inválidos.", status: 422 }));
    const onFechar = vi.fn();
    render(<TrocarSenhaDrawer isOpen onFechar={onFechar} />);

    await preencher("errada", "nova-senha", "nova-senha");

    expect(await screen.findByText("The current password is incorrect.")).toBeInTheDocument();
    expect(onFechar).not.toHaveBeenCalled();
  });
});
